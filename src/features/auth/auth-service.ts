import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { loginUser, verifyPassword } from "../../api/auth.api";
import type { ErrorResponseBody } from "../../common/res-template";
import type { LoginAuthReq, LoginAuthRes } from "./types";


// export const useLogin = () => {
//   return useMutation<LoginAuthRes, AxiosError<ErrorResponseBody>, LoginAuthReq>({
//     mutationFn: async (data: LoginAuthReq) => await loginUser(data),
//   });
// };

export const useLogin = () => {
  return useMutation<LoginAuthRes, ErrorResponseBody, LoginAuthReq>({
    mutationFn: async (data) => {
      return await loginUser(data);
    },
  });
};

export const useVerifyByPassword = () => {
  return useMutation<boolean, AxiosError<ErrorResponseBody>, LoginAuthReq>({
    mutationFn: async (data: LoginAuthReq) => await verifyPassword(data),
  });
};
