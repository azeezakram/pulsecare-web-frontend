import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as roleApi from "../../api/role.api";
import type { RoleReq, RoleRes } from "./type";
import axios from "axios";

export const useRoleById = (id: number) => {
    return useQuery<RoleRes, Error>({
        queryKey: ["role", id],
        queryFn: async () => {
            try {
                return await roleApi.fetchRoleById(id);
            } catch (err) {
                if (axios.isAxiosError(err)) {
                    const backendMessage = err.response?.data?.message;
                    const status = err.response?.status;

                    console.error(`Backend Error (${status}):`, backendMessage || err.message);
                } else {
                    console.error("Non-Axios Error:", err);
                }
                throw err;
            }
        },
    });
};

export const useAllRoles = () => {
    return useQuery<RoleRes[], Error>({
        queryKey: ["roles"],
        queryFn: roleApi.fetchAllRoles,
        enabled: true,
    });
};

export const useCreateRole = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (role: RoleReq) => {
            try {
                return await roleApi.createRole(role);
            } catch (err) {
                if (err instanceof Error) console.error("Error creating role:", err.message);
                throw err;
            }
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roles"] }),
    });
};

export const useDeleteRole = () => {
    const queryClient = useQueryClient();

    return useMutation<string, Error, number>({
        mutationFn: async (id: number) => {
            try {
                return await roleApi.deleteRole(id);
            } catch (err) {
                if (err instanceof Error) console.error("Error deleting role:", err.message);
                throw err;
            }
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roles"] }),
    });
};
