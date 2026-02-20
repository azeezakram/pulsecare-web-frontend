import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserRes } from "../features/user/types";
import * as userApi from "../api/user.api";
import { loginUser } from "../api/auth.api";
import api from "axios";
import type { Role } from "../features/role/type";
import type { ErrorResponseBody } from "../common/res-template";

type AuthState = {
    token: string | null;
    username: string | null;
    role: Role | null;
    currentUser: UserRes | null;
    isLoading: boolean;
    error: string | null;
    rememberMe: boolean;
    persistEnabled: boolean;

    setToken: (token: string | null) => void;
    setUsername: (username: string | null) => void;
    setRole: (role: Role | null) => void;
    setCurrentUser: (user: UserRes | null) => void;
    setRememberMe: (remember: boolean) => void;
    

    login: (data: { username: string; password: string }, remember: boolean) => Promise<void>;
    logout: () => void;
    fetchCurrentUser: () => Promise<void>;
};


export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            token: null,
            username: null,
            role: null,
            currentUser: null,
            isLoading: false,
            error: null,
            rememberMe: false,
            persistEnabled: false,

            setToken: (token) => set({ token }),
            setUsername: (username) => set({ username }),
            setRole: (role) => set({ role }),
            setCurrentUser: (user) => set({ currentUser: user}),
            setRememberMe: (remember) => set({ rememberMe: remember }),
            

            login: async (data, remember) => {
                set({ isLoading: true, error: null });

                try {
                    const res = await loginUser(data);

                    if (remember) localStorage.setItem("auth-rememberMe", "true");
                    else localStorage.removeItem("auth-rememberMe");

                    // localStorage.removeItem("auth-storage");
                    // sessionStorage.removeItem("auth-storage");

                    set({
                        token: res.token,
                        username: res.username,
                        role: res.role as Role,
                        rememberMe: remember,
                        persistEnabled: true,
                    });
                } catch (err) {
                    set({ error: (err as ErrorResponseBody).message });
                } finally {
                    set({ isLoading: false });
                }
            },



            logout: async () => {
                set({
                    token: null,
                    username: null,
                    role: null,
                    currentUser: null,
                    error: null,
                    rememberMe: false,
                    persistEnabled: false,
                });


                localStorage.removeItem("auth-rememberMe");
                localStorage.removeItem("auth-storage");
                sessionStorage.removeItem("auth-storage");
            },


            fetchCurrentUser: async () => {
                const username = get().username;
                if (!username) return;
                set({ isLoading: true, error: null });
                try {
                    const user = await userApi.fetchUserByUsername(username);
                    set({ currentUser: user });
                } catch (err: unknown) {
                    if (api.isAxiosError(err)) set({ error: err.response?.data?.message || err.message });
                    else if (err instanceof Error) set({ error: err.message });
                    else set({ error: "Unexpected error" });
                } finally {
                    set({ isLoading: false });
                }
            },
        }),
        {
            name: "auth-storage",

            storage: {
                getItem: (name) => {
                    try {
                        const remember = JSON.parse(localStorage.getItem("auth-rememberMe") || "false");
                        const item = remember ? localStorage.getItem(name) : sessionStorage.getItem(name);
                        return item ? JSON.parse(item) : null;
                    } catch {
                        return null;
                    }
                },
                setItem: (name, value) => {

                    const rememberRaw = localStorage.getItem("auth-rememberMe");
                    const remember = rememberRaw ? JSON.parse(rememberRaw) : false;
                    if (remember) {
                        localStorage.setItem(name, JSON.stringify(value));
                    } else {
                        sessionStorage.setItem(name, JSON.stringify(value));
                    }

                },
                removeItem: (name) => {
                    localStorage.removeItem(name);
                    sessionStorage.removeItem(name);
                }
            }
            ,

            partialize: (state: AuthState) => {
                // if (!state.persistEnabled) return {};

                if (state.token && state.username) {
                    return {
                        token: state.token,
                        username: state.username,
                        role: state.role,
                    };
                }
                return {};
            },

        }
    )
);
