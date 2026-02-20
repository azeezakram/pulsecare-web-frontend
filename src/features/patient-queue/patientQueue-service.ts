import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PatientQueueReq, PatientQueueRes } from "./types";
import { patientQueueApi } from "../../api/patientQueue.api";

const keys = {
  all: ["patient-queues"] as const,
  byId: (id: number) => ["patient-queues", id] as const,
};

export function useAllPatientQueues() {
  return useQuery<PatientQueueRes[], Error>({
    queryKey: keys.all,
    queryFn: patientQueueApi.findAll,
    staleTime: 15_000,
  });
}

export function usePatientQueueById(id?: number) {
  return useQuery<PatientQueueRes, Error>({
    queryKey: typeof id === "number" ? keys.byId(id) : ["patient-queues", "id", "disabled"],
    queryFn: () => patientQueueApi.findById(id as number),
    enabled: typeof id === "number" && id > 0,
  });
}

export function useCreatePatientQueue() {
  const qc = useQueryClient();

  return useMutation<PatientQueueRes, Error, PatientQueueReq>({
    mutationFn: patientQueueApi.create,
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: keys.all });
      qc.setQueryData(keys.byId(Number(created.id)), created);
    },
  });
}

export function useUpdatePatientQueue() {
  const qc = useQueryClient();

  return useMutation<PatientQueueRes, Error, { id: number; payload: PatientQueueReq }>({
    mutationFn: ({ id, payload }) => patientQueueApi.update(id, payload),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: keys.all });
      qc.setQueryData(keys.byId(Number(updated.id)), updated);
    },
  });
}

export function useDeletePatientQueue() {
  const qc = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: patientQueueApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all });
    },
  });
}
