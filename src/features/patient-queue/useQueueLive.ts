/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { useQueryClient } from "@tanstack/react-query";

import type { PatientQueueEvent } from "./types";
import type { PatientQueueRes } from "./types";
import { useAuthStore } from "../../store/auth-store"; // <-- adjust path

type Options = {
  enabled?: boolean;
  // If you want to listen per ward in future:
  topic?: string; // default "/topic/queue"
  // If true, refetch list after each event (more accurate, more network)
  refetchAfterEvent?: boolean;
};

function upsertById(list: PatientQueueRes[], item: PatientQueueRes): PatientQueueRes[] {
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx === -1) return [item, ...list];
  const copy = list.slice();
  copy[idx] = { ...copy[idx], ...item };
  return copy;
}

export function useQueueLive(opts: Options = {}) {
  const {
    enabled = true,
    topic = "/topic/queue",
    refetchAfterEvent = false,
  } = opts;

  const qc = useQueryClient();
  const token = useAuthStore((s) => s.token);

  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (!token) return;

    // Important: avoid multiple connections
    if (clientRef.current?.active) return;

    const client = new Client({
      webSocketFactory: () => new SockJS("http://localhost:8080/ws"),
      reconnectDelay: 3000,
      connectHeaders: {
        Authorization: `Bearer ${token}`, // if backend validates; safe to keep
      },
      onConnect: () => {
        client.subscribe(topic, (msg) => {
          let event: PatientQueueEvent | null = null;

          try {
            event = JSON.parse(msg.body) as PatientQueueEvent;
          } catch {
            return;
          }

          // Patch local cache instantly (smooth “movement”)
          qc.setQueryData<PatientQueueRes[]>(["patient-queues"], (old) => {
            const current = old ?? [];

            if (!event) return current;

            if (event.type === "QUEUE_DELETED") {
              return current.filter((x) => x.id !== event.queueId);
            }

            // created/updated: payload should exist
            if (!event.payload) return current;

            // Upsert (insert or merge)
            return upsertById(current, event.payload);
          });

          // Optional: ensure full accuracy (if payload is partial in future)
          if (refetchAfterEvent) {
            qc.invalidateQueries({ queryKey: ["patient-queues"] });
          }
        });
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
      clientRef.current = null;
    };
  }, [enabled, token, topic, qc, refetchAfterEvent]);
}
