import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserRes } from "../features/user/types";
import * as userApi from "../api/user.api";
import { loginUser } from "../api/auth.api";
import api from "axios";

type AuthState = {
    token: string | null;
    username: string | null;
    roles: string[];
    currentUser: UserRes | null;
    isLoading: boolean;
    error: string | null;
    rememberMe: boolean;
    persistEnabled: boolean;
    activeRole: string | null;

    setToken: (token: string | null) => void;
    setUsername: (username: string | null) => void;
    setRoles: (roles: string[]) => void;
    setCurrentUser: (user: UserRes | null) => void;
    setRememberMe: (remember: boolean) => void;
    setActiveRole: (role: string) => void;

    login: (data: { username: string; password: string }, remember: boolean) => Promise<void>;
    logout: () => void;
    fetchCurrentUser: () => Promise<void>;
};

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            token: null,
            username: null,
            roles: [],
            currentUser: null,
            isLoading: false,
            error: null,
            rememberMe: false,
            persistEnabled: false,
            activeRole: null,

            setToken: (token) => set({ token }),
            setUsername: (username) => set({ username }),
            setRoles: (roles) => set({ roles }),
            setCurrentUser: (user) => set({ currentUser: user }),
            setRememberMe: (remember) => set({ rememberMe: remember }),
            setActiveRole: (role) => set({ activeRole: role }),

            login: async (data, remember) => {
                set({ isLoading: true, error: null });
                try {
                    const res = await loginUser(data);

                    // Set activeRole immediately if single role
                    if (res.roles.length === 1) set({ activeRole: res.roles[0] });

                    if (res.token && res.username) {
                        // Only persist "remember me" in localStorage
                        if (remember) localStorage.setItem("auth-rememberMe", "true");
                        else localStorage.removeItem("auth-rememberMe"); // ensure unremembered login doesn't store it

                        // Clear old storage
                        localStorage.removeItem("auth-storage");
                        sessionStorage.removeItem("auth-storage");

                        set({
                            token: res.token,
                            username: res.username,
                            roles: res.roles,
                            rememberMe: remember,
                            persistEnabled: true,
                        });
                    }
                } catch (err: unknown) {
                    if (api.isAxiosError(err)) set({ error: err.response?.data?.message || err.message });
                    else if (err instanceof Error) set({ error: err.message });
                    else set({ error: "Unexpected error" });
                } finally {
                    set({ isLoading: false });
                }
            },


            logout: async () => {
                set({
                    token: null,
                    username: null,
                    roles: [],
                    currentUser: null,
                    error: null,
                    rememberMe: false,
                    persistEnabled: false,
                    activeRole: null,
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
                    try {
                        const rememberRaw = localStorage.getItem("auth-rememberMe");
                        const remember = rememberRaw ? JSON.parse(rememberRaw) : false;
                        if (remember) {
                            localStorage.setItem(name, JSON.stringify(value));
                        } else {
                            sessionStorage.setItem(name, JSON.stringify(value));
                        }
                    } catch { }
                },
                removeItem: (name) => {
                    localStorage.removeItem(name);
                    sessionStorage.removeItem(name);
                }
            }
            ,

            partialize: (state: AuthState) => {
                if (!state.persistEnabled) return {};

                if (state.token && state.username) {
                    return {
                        token: state.token,
                        username: state.username,
                        roles: state.roles,
                    };
                }
                return {};
            },

        }
    )
);
