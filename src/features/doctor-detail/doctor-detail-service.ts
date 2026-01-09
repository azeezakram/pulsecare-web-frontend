import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as docApi from "../../api/doctor-detail.api";
import type { DoctorDetailReq } from "../doctor-detail/type";

export const useDoctorDetails = () => {
  return useQuery({
    queryKey: ["doctor-details"],
    queryFn: docApi.fetchAllDoctorDetails,
  });
};

export const useDoctorDetail = (id: number) => {
  return useQuery({
    queryKey: ["doctor-detail", id],
    queryFn: () => docApi.fetchDoctorDetailById(id),
    enabled: !!id,
  });
};

export const useDoctorDetailByUserId = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["doctor-detail", "user", userId],
    queryFn: () => docApi.fetchDoctorDetailByUserId(userId!),
    enabled: !!userId,
    retry: false,
  });
};

export const useCreateDoctorDetail = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: docApi.createDoctorDetail,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-details"] });
    },
  });
};

export const useUpdateDoctorDetail = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: DoctorDetailReq }) => 
      docApi.updateDoctorDetail(userId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["doctor-details"] });
      queryClient.invalidateQueries({ queryKey: ["doctor-detail", "user", data.userId] });
    },
  });
};

export const useDeleteDoctorDetail = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: docApi.deleteDoctorDetail,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-details"] });
    },
  });
};