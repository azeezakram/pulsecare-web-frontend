// src/features/patient/patient-service.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PatientReq, PatientRes } from "./types";
import { patientApi } from "../../api/patient.api";

const keys = {
  all: ["patients"] as const,
  allActive: ["patientsActive"] as const,
  byId: (id: number) => ["patients", id] as const,
  byIdActive: (id: number) => ["patientsActive", id] as const,
  byNic: (nic: string) => ["patients", "nic", nic] as const,
  byNicActive: (nic: string) => ["patientsActive", "nic", nic] as const,
};

export function useAllPatients() {
  return useQuery<PatientRes[], Error>({
    queryKey: keys.all,
    queryFn: patientApi.findAll,
    staleTime: 30_000,
  });
}

export function usePatientById(id?: number) {
  return useQuery<PatientRes, Error>({  
    queryKey: id ? keys.byId(id) : ["patients", "id", "disabled"],
    queryFn: () => patientApi.findById(id as number),
    enabled: typeof id === "number" && id > 0,
  });
}

export function usePatientByNic(nic?: string) {
  return useQuery<PatientRes, Error>({
    queryKey: nic ? keys.byNic(nic) : ["patients", "nic", "disabled"],
    queryFn: () => patientApi.findByNic(nic as string),
    enabled: !!nic?.trim(),
  });
}

export function useAllActivePatients() {
  return useQuery<PatientRes[], Error>({
    queryKey: keys.allActive,
    queryFn: patientApi.findActiveAll,
    staleTime: 30_000,
  });
}

export function useActivePatientById(id?: number) {
  return useQuery<PatientRes, Error>({
    queryKey: id ? keys.byIdActive(id) : ["patientsActive", "id", "disabled"],
    queryFn: () => patientApi.findActiveById(id as number),
    enabled: typeof id === "number" && id > 0,
  });
}

export function useActivePatientByNic(nic?: string) {
  return useQuery<PatientRes, Error>({
    queryKey: nic ? keys.byNicActive(nic) : ["patientsActive", "nic", "disabled"],
    queryFn: () => patientApi.findActiveByNic(nic as string),
    enabled: !!nic?.trim(),
  });
}

export function useCreatePatient() {
  const qc = useQueryClient();

  return useMutation<PatientRes, Error, PatientReq>({
    mutationFn: patientApi.create,
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: keys.all });
      qc.setQueryData(keys.byId(created.id), created);
      if (created.nic) qc.setQueryData(keys.byNic(created.nic), created);
    },
  });
}

export function useUpdatePatient() {
  const qc = useQueryClient();

  return useMutation<PatientRes, Error, { id: number; payload: PatientReq }>({
    mutationFn: ({ id, payload }) => patientApi.update(id, payload),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: keys.all });
      qc.setQueryData(keys.byId(updated.id), updated);
      if (updated.nic) qc.setQueryData(keys.byNic(updated.nic), updated);
    },
  });
}

export function useDeletePatient() {
  const qc = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: patientApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all });
    },
  });
}
