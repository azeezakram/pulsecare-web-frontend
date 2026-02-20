
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PrescriptionReq, PrescriptionSummaryRes, PrescriptionDetailRes } from "./types";
import { prescriptionApi } from "../../api/prescription.api";

const keys = {
  all: ["prescriptions"] as const,
  byId: (id: number) => ["prescriptions", id] as const,
  detailById: (id: number) => ["prescriptions", "detail", id] as const,
};

export function useAllPrescriptions() {
  return useQuery<PrescriptionSummaryRes[], Error>({
    queryKey: keys.all,
    queryFn: prescriptionApi.findAll,
    staleTime: 30_000,
  });
}

export function usePrescriptionById(id?: number) {
  return useQuery<PrescriptionSummaryRes, Error>({
    queryKey: typeof id === "number" ? keys.byId(id) : ["prescriptions", "id", "disabled"],
    queryFn: () => prescriptionApi.findById(id as number),
    enabled: typeof id === "number" && id > 0,
  });
}

export function usePrescriptionDetailById(id?: number) {
  return useQuery<PrescriptionDetailRes, Error>({
    queryKey: typeof id === "number" ? keys.detailById(id) : ["prescriptions", "detail", "disabled"],
    queryFn: () => prescriptionApi.findWithDetailById(id as number),
    enabled: typeof id === "number" && id > 0,
  });
}

export function usePrescriptionsByAdmissionId(id?: number) {
  return useQuery<PrescriptionDetailRes[], Error>({
    queryKey:
      typeof id === "number"
        ? ["prescriptions", "by-admission", id]
        : ["prescriptions", "by-admission", "disabled"],
    queryFn: () => prescriptionApi.findAllDetailByAdmissionId(id as number),
    enabled: typeof id === "number" && id > 0,
  });
}

export function useCreatePrescription() {
  const qc = useQueryClient();

  return useMutation<PrescriptionDetailRes, Error, PrescriptionReq>({
    mutationFn: prescriptionApi.create,
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: keys.all });
      qc.setQueryData(keys.byId(Number(created.id)), created as any);
      qc.setQueryData(keys.detailById(Number(created.id)), created);
    },
  });
}

export function useUpdatePrescription() {
  const qc = useQueryClient();

  return useMutation<PrescriptionDetailRes, Error, { id: number; payload: PrescriptionReq }>({
    mutationFn: ({ id, payload }) => prescriptionApi.update(id, payload),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: keys.all });
      qc.setQueryData(keys.byId(Number(updated.id)), updated as any);
      qc.setQueryData(keys.detailById(Number(updated.id)), updated);
    },
  });
}

export function useDeletePrescription() {
  const qc = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: prescriptionApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all });
    },
  });
}
