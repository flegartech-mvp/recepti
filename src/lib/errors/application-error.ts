export type ApplicationErrorCode =
  | "AUTH_UNAVAILABLE"
  | "DATA_ACCESS_DENIED"
  | "DATA_CORRUPT"
  | "DATABASE_UNAVAILABLE"
  | "MIGRATION_MISSING"
  | "OWNER_CONFIGURATION"
  | "UNKNOWN";

interface SupabaseErrorLike {
  code?: unknown;
  message?: unknown;
  status?: unknown;
}

const ACCESS_DENIED_CODES = new Set(["42501", "PGRST301", "PGRST303"]);
const MISSING_SCHEMA_CODES = new Set([
  "42P01",
  "42703",
  "42883",
  "PGRST200",
  "PGRST202",
  "PGRST204",
  "PGRST205",
]);

export class ApplicationError extends Error {
  readonly code: ApplicationErrorCode;
  readonly operation: string;

  constructor(
    code: ApplicationErrorCode,
    operation: string,
    message: string,
    cause?: unknown,
  ) {
    super(message, { cause });
    this.name = "ApplicationError";
    this.code = code;
    this.operation = operation;
  }
}

function errorMetadata(error: unknown): {
  code: string | null;
  status: number | null;
} {
  if (typeof error !== "object" || error === null)
    return { code: null, status: null };
  const candidate = error as SupabaseErrorLike;
  return {
    code: typeof candidate.code === "string" ? candidate.code : null,
    status: typeof candidate.status === "number" ? candidate.status : null,
  };
}

export function classifySupabaseError(error: unknown): ApplicationErrorCode {
  const { code, status } = errorMetadata(error);
  if (
    (code && ACCESS_DENIED_CODES.has(code)) ||
    status === 401 ||
    status === 403
  )
    return "DATA_ACCESS_DENIED";
  if (code && MISSING_SCHEMA_CODES.has(code)) return "MIGRATION_MISSING";
  return "DATABASE_UNAVAILABLE";
}

export function dataAccessError(
  operation: string,
  error: unknown,
): ApplicationError {
  const code = classifySupabaseError(error);
  console.error("[Nana's Recipes data access failure]", {
    operation,
    category: code,
    supabaseCode: errorMetadata(error).code,
  });
  return new ApplicationError(
    code,
    operation,
    code === "DATA_ACCESS_DENIED"
      ? "Your owner session is not permitted to read this cookbook data."
      : code === "MIGRATION_MISSING"
        ? "The cookbook database needs a required migration before this page can load."
        : "The cookbook database is temporarily unavailable.",
    error,
  );
}

export function corruptDataError(
  operation: string,
  cause?: unknown,
): ApplicationError {
  console.error("[Nana's Recipes invalid persisted data]", {
    operation,
    category: "DATA_CORRUPT",
  });
  return new ApplicationError(
    "DATA_CORRUPT",
    operation,
    "Saved cookbook data is invalid and was not replaced with defaults.",
    cause,
  );
}
