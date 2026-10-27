export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'HEAD'
  | 'OPTIONS';

export type BodyMode = 'none' | 'json' | 'text';

export type ParamRow = {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
};

export type HeaderRow = {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
};

export type RequestConfig = {
  method: HttpMethod;
  url: string;
  params: ParamRow[];
  headers: HeaderRow[];
  bodyMode: BodyMode;
  body: string;
};

export type ResponseState = {
  status: number | null;
  statusText: string | null;
  headers: Record<string, string>;
  body: string | null;
  bodyIsJson: boolean;
  durationMs: number | null;
  sizeBytes: number | null;
  error: string | null;
  isCorsError: boolean;
  isNetworkError: boolean;
  isAbortError: boolean;
  isValidationError: boolean;
  validationMessage: string | null;
};

export type HistoryEntry = {
  id: string;
  method: HttpMethod;
  url: string;
  status: number | null;
  statusText: string | null;
  durationMs: number | null;
  timestamp: number;
  config: RequestConfig;
};

export const HTTP_METHODS: HttpMethod[] = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
];

export const METHODS_WITH_BODY: HttpMethod[] = ['POST', 'PUT', 'PATCH'];

export function methodAllowsBody(method: HttpMethod): boolean {
  return METHODS_WITH_BODY.includes(method);
}

export function methodHasNoBody(method: HttpMethod): boolean {
  return method === 'GET' || method === 'HEAD';
}

export function createId(): string {
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}