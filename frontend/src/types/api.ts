export interface ApiErrorResponse {
  status: 'error';
  code: string;
  message: string;
  timestamp?: string;
  retryAfter?: number;
}
