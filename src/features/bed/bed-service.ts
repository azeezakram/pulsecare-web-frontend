import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BedReq, BedRes } from "./types";
import * as bedApi from "../../api/bed.api";

export const useBedsByWardId = (wardId?: number) => {
  return useQuery<BedRes[], Error>({
    queryKey: ["beds", "byWard", wardId],
    queryFn: async () => {
      const all = await bedApi.fetchAllBeds();
      return all.filter((b) => b.wardId === wardId);
    },
    enabled: !!wardId,
    retry: false,
    refetchOnWindowFocus: false,
  });
};

export const useAllBeds = () => {
  return useQuery<BedRes[], Error>({
    queryKey: ["beds"],
    queryFn: async () => {
      return await bedApi.fetchAllBeds();
    },
    enabled: true,
    retry: false,
    refetchOnWindowFocus: false,
  });
};

export const useBedById = (id: number) => {
  return useQuery<BedRes, Error>({
    queryKey: ["bed", id],
    queryFn: () => bedApi.fetchBedById(id),
    enabled: typeof id === "number" && id > 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
};


export const useCreateBed = (wardId?: number) => {
  const queryClient = useQueryClient();
  return useMutation<BedRes, Error, BedReq>({
    mutationFn: async (data) => {
      return await bedApi.createBed(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beds"] });
      if (wardId) queryClient.invalidateQueries({ queryKey: ["beds", "byWard", wardId] });
      queryClient.invalidateQueries({ queryKey: ["wards"] });
    },
  });
};

export const useUpdateBed = (wardId?: number) => {
  const queryClient = useQueryClient();
  return useMutation<BedRes, Error, { id: number; data: BedReq }>({
    mutationFn: async ({ id, data }) => {
      return await bedApi.updateBed(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beds"] });
      if (wardId) queryClient.invalidateQueries({ queryKey: ["beds", "byWard", wardId] });
      queryClient.invalidateQueries({ queryKey: ["wards"] });
    },
  });
};

export const useDeleteBed = (wardId?: number) => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await bedApi.deleteBed(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beds"] });
      if (wardId) queryClient.invalidateQueries({ queryKey: ["beds", "byWard", wardId] });
      queryClient.invalidateQueries({ queryKey: ["wards"] });
    },
  });
};


export const useBatchCreateBeds = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { wardId: number; beds: BedReq[] }>({
    mutationFn: async ({ wardId, beds }) => {
      await bedApi.batchCreateBeds(wardId, beds);
    },
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({ queryKey: ["beds"] });
      queryClient.invalidateQueries({ queryKey: ["beds", "byWard", vars.wardId] });
      queryClient.invalidateQueries({ queryKey: ["wards"] });
    },
  });
};
