import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as wardApi from "../../api/ward.api";
import type { WardReq, WardRes } from "./types";

export const useAllWards = () => {
  return useQuery<WardRes[], Error>({
    queryKey: ["wards"],
    queryFn: async () => {
      return await wardApi.fetchAllWards();
    },
    enabled: true,
    retry: false,
    refetchOnWindowFocus: false,
  });
};

export const useWardById = (id?: number) => {
  return useQuery<WardRes, Error>({
    queryKey: ["ward", id],
    queryFn: async () => {
      return await wardApi.fetchWardById(id!);
    },
    enabled: !!id,
    retry: false,
    refetchOnWindowFocus: false,
  });
};

export const useWardsByDepartmentId = (departmentId?: number) => {
  return useQuery<WardRes[], Error>({
    queryKey: ["wards", "byDepartment", departmentId],
    queryFn: async () => {
      return await wardApi.fetchWardsByDepartmentId(departmentId!);
    },
    enabled: !!departmentId,
    retry: false,
    refetchOnWindowFocus: false,
  });
};

export const useCreateWard = (departmentId?: number) => {
  const queryClient = useQueryClient();

  return useMutation<WardRes, Error, WardReq>({
    mutationFn: async (data) => {
      return await wardApi.createWard(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wards"] });
      if (departmentId) {
        queryClient.invalidateQueries({ queryKey: ["wards", "byDepartment", departmentId] });
      }
    },
  });
};

export const useUpdateWard = (departmentId?: number) => {
  const queryClient = useQueryClient();

  return useMutation<WardRes, Error, { id: number; data: WardReq }>({
    mutationFn: async ({ id, data }) => {
      return await wardApi.updateWard(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wards"] });
      if (departmentId) {
        queryClient.invalidateQueries({ queryKey: ["wards", "byDepartment", departmentId] });
      }
    },
  });
};

export const useDeleteWard = (departmentId?: number) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await wardApi.deleteWard(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wards"] });
      if (departmentId) {
        queryClient.invalidateQueries({ queryKey: ["wards", "byDepartment", departmentId] });
      }
    },
  });
};
