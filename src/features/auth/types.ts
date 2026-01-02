export interface LoginAuthReq {
  username: string,
  password: string
}

export interface LoginAuthRes {
  token: string,
  username: string,
  roles: string[]
}