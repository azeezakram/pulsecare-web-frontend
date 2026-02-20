import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PatientAdmissionReq, PatientAdmissionRes } from "./types";
import { patientAdmissionApi } from "../../api/patientAdmission.api";

const keys = {
  all: ["patient-admissions"] as const,
  byId: (id: number) => ["patient-admissions", id] as const,
};

export function useAllPatientAdmissions() {
  return useQuery<PatientAdmissionRes[], Error>({
    queryKey: keys.all,
    queryFn: patientAdmissionApi.findAll,
    staleTime: 30_000,
  });
}

export function usePatientAdmissionById(id?: number) {
  return useQuery<PatientAdmissionRes, Error>({
    queryKey: typeof id === "number" ? keys.byId(id) : ["patient-admissions", "id", "disabled"],
    queryFn: () => patientAdmissionApi.findById(id as number),
    enabled: typeof id === "number" && id > 0,
  });
}

export function useCreatePatientAdmission() {
  const qc = useQueryClient();

  return useMutation<PatientAdmissionRes, Error, PatientAdmissionReq>({
    mutationFn: patientAdmissionApi.create,
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: keys.all });
      qc.setQueryData(keys.byId(Number(created.id)), created);
    },
  });
}

export function useUpdatePatientAdmission() {
  const qc = useQueryClient();

  return useMutation<PatientAdmissionRes, Error, { id: number; payload: PatientAdmissionReq }>({
    mutationFn: ({ id, payload }) => patientAdmissionApi.update(id, payload),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: keys.all });
      qc.setQueryData(keys.byId(Number(updated.id)), updated);
    },
  });
}

export function useDeletePatientAdmission() {
  const qc = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: patientAdmissionApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all });
    },
  });
}

export function useCheckActiveAdmission() {
  const queryClient = useQueryClient();
  return async (id: number) => {
    return await queryClient.fetchQuery({
      queryKey: ["patient-admissions", "hasActive", id],
      queryFn: () => patientAdmissionApi.hasActiveAdmission(id),
      staleTime: 0,
    });
  };
}


