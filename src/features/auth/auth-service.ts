import { useMutation } from "@tanstack/react-query";
import { loginUser } from "../../api/auth.api";
import type { LoginAuthReq, LoginAuthRes } from "./types";
import { AxiosError} from "axios";
import type { ErrorResponseBody } from "../../common/res-template";


export const useLogin = () => {
  return useMutation<LoginAuthRes, AxiosError<ErrorResponseBody>, LoginAuthReq>({
    mutationFn: async (data: LoginAuthReq) => await loginUser(data),
  });
};

