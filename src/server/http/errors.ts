/**
 * The API never returns human-readable text. It returns a stable machine `code`
 * and the client translates it via the `Errors.<code>` message namespace.
 */
export type ApiErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "validation_failed"
  | "internal";

const STATUS: Record<ApiErrorCode, number> = {
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  validation_failed: 422,
  internal: 500,
};

export class ApiError extends Error {
  readonly status: number;

  constructor(
    readonly code: ApiErrorCode,
    readonly details?: unknown
  ) {
    super(code);
    this.status = STATUS[code];
  }
}
