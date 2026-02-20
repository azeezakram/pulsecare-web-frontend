import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as deptApi from "../../api/department.api";
import type { ErrorResponseBody } from "../../common/res-template";
import type { DeptReq, DeptRes } from "./types";

export const useAllDepartments = () => {
  return useQuery<DeptRes[], Error>({
    queryKey: ["departments"],
    queryFn: async () => {
      return await deptApi.fetchAllDepartments();
    },
    enabled: true,
    retry: false,
    refetchOnWindowFocus: false,
  });
};

export const useDepartmentById = (id?: number) => {
  return useQuery<DeptRes, Error>({
    queryKey: ["department", id],
    queryFn: async () => {
      return await deptApi.fetchDepartmentById(id!);
    },
    enabled: !!id,
    retry: false,
    refetchOnWindowFocus: false,
  });
};

export const useCreateDepartment = () => {
  const queryClient = useQueryClient();

  return useMutation<DeptRes, ErrorResponseBody, DeptReq>({
    mutationFn: async (data) => {
      return await deptApi.createDepartment(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });
};

export const useUpdateDepartment = () => {
  const queryClient = useQueryClient();

  return useMutation<DeptRes, Error, { id: number; data: DeptReq }>({
    mutationFn: async ({ id, data }) => {
        return await deptApi.updateDepartment(id, data);
    },
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["department", vars.id] });
    },
  });
};

export const useDeleteDepartment = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
        await deptApi.deleteDepartment(id);
    },
    onSuccess: (_res, id) => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["department", id] });
    },
  });
};
