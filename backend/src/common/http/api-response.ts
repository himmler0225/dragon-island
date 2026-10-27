// The two response shapes of the whole API.
//   success: { data, meta? }
//   error:   { error: { code, message, details? }, requestId, path, timestamp }
import type { ErrorCode } from '../errors/index.js';

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  data: T;
  meta?: PageMeta;
}

export interface ApiError {
  error: { code: ErrorCode; message: string; details?: unknown };
  requestId?: string;
  path: string;
  timestamp: string;
}
