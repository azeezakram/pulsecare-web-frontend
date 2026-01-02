export interface ResponseBody<T> {
  status: number;
  message: string;
  data: T;
  timestamp: string;
}

export interface ErrorResponseBody {
  status: number;
  message: string;
  timestamp: string;
}
