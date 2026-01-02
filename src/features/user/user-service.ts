import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UserReq, UserRes } from "./types";
import * as userApi from "../../api/user.api";
import axios from "axios";

export const useUserById = (id: string) => {
    return useQuery<UserRes, Error>({
        queryKey: ["user", id],
        queryFn: async () => {
            try {
                return await userApi.fetchUserById(id);
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

export const useAllUsers = () => {
    return useQuery<UserRes[], Error>({
        queryKey: ["users"],
        queryFn: () => userApi.fetchAllUsers(),
        enabled: true,
    });
};



export const useCurrentUser = (username: string) => {
  return useQuery({
    queryKey: ["currentUser", username],
    queryFn: () => userApi.fetchUserByUsername(username!),
    enabled: !!username,
  });
};



export const useCreateUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (user: UserReq) => {
            try {
                return await userApi.createUser(user);
            } catch (err) {
                if (err instanceof Error) console.error("Error creating user:", err.message);
                throw err;
            }
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
    });
};


export const useUpdateUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, user }: { id: string; user: UserReq }) => {
            try {
                return await userApi.updateUser(id, user);
            } catch (err) {
                if (err instanceof Error) console.error("Error updating user:", err.message);
                throw err;
            }
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
    });
};


export const useDeleteUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => userApi.deleteUser(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
    });
};

export const useUserProfilePicture = (id: string) => {
    return useQuery({
        queryKey: ["user", id, "image"],
        queryFn: () => userApi.fetchProfilePicture(id),
    });
};
