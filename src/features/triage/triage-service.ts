import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TriageReq, TriageRes } from "./types";
import * as triageApi from '../../api/triage.api'

export const useAllTriage = () => {
  return useQuery<TriageRes[], Error>({
    queryKey: ["triage"],
    queryFn: async () => {
        return await triageApi.fetchAllTriage();
    },
    retry: false,
    refetchOnWindowFocus: false,
  });
};

export const useTriageById = (id?: number) => {
  return useQuery<TriageRes, Error>({
    queryKey: ["triage", id],
    queryFn: async () => {
        return await triageApi.fetchTriageById(id!);
    },
    enabled: !!id,
    retry: false,
    refetchOnWindowFocus: false,
  });
};

export const useCreateTriage = () => {
  const qc = useQueryClient();
  return useMutation<TriageRes, Error, TriageReq>({
    mutationFn: async (data) => {
        return await triageApi.createTriage(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["triage"] });
    },
  });
};

export const useUpdateTriage = () => {
  const queryClient = useQueryClient();

  return useMutation<TriageRes, Error, { id: number; data: TriageReq }>({
    mutationFn: async ({ id, data }) => {
        return await triageApi.updateTriage(id, data);
    },
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({ queryKey: ["triages"] });
      queryClient.invalidateQueries({ queryKey: ["triage", vars.id] });
    },
  });
};

export const useDeleteTriage = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
        await triageApi.deleteTriage(id);
    },
    onSuccess: (_res, id) => {
      queryClient.invalidateQueries({ queryKey: ["triages"] });
      queryClient.invalidateQueries({ queryKey: ["triage", id] });
    },
  });
};

export const usePredictTriage = () => {
  const qc = useQueryClient();
  return useMutation<TriageRes, Error, TriageReq>({
    mutationFn: async (data) => {
        return await triageApi.predictTriage(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["triage"] });
    },
  });
};