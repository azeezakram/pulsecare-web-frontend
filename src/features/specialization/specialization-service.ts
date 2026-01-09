import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as specApi from '../../api/specialization.api';
import type { SpecializationReq } from "../specialization/type";

export const useSpecializations = () => {
    return useQuery({
        queryKey: ["specializations"],
        queryFn: specApi.fetchAllSpecializations,
    });
};

export const useSpecialization = (id: number) => {
    return useQuery({
        queryKey: ["specialization", id],
        queryFn: () => specApi.fetchSpecializationById(id),
        enabled: !!id,
    });
};

export const useCreateSpecialization = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: specApi.createSpecialization,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["specializations"] });
        },
    });
};

export const useUpdateSpecialization = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: SpecializationReq }) => 
            specApi.updateSpecialization(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["specializations"] });
        },
    });
};

export const useDeleteSpecialization = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: specApi.deleteSpecialization,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["specializations"] });
        },
    });
};