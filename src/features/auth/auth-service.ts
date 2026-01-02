import { useMutation } from "@tanstack/react-query";
import { loginUser } from "../../api/auth.api";
import type { LoginAuthReq, LoginAuthRes } from "./types";
import { setLoginData, getUsername, getToken, clearLoginData } from "../../utils/localstorage-utils";
import axios, { AxiosError} from "axios";
import type { ErrorResponseBody } from "../../common/res-template";


export const useLogin = () => {
  return useMutation<LoginAuthRes, AxiosError<ErrorResponseBody>, LoginAuthReq>({
    mutationFn: async (data: LoginAuthReq) => {
        try {
            return await loginUser(data);
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
    // onSuccess: (data) => {
    //     setLoginData(data.token, data.username, data.roles);
    //     console.log("Successfully logged in user:", getUsername());
    //     console.log(getToken());
    // }
  });
};

export const logout = () => {
  clearLoginData();
  console.log("User logged out.");
}
