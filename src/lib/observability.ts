type SafeContextValue = string | number | boolean | null;

function errorDetails(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return { errorName: typeof error, errorCode: null, status: null };
  }
  const candidate = error as {
    name?: unknown;
    code?: unknown;
    status?: unknown;
  };
  return {
    errorName:
      typeof candidate.name === "string" ? candidate.name : "UnknownError",
    errorCode: typeof candidate.code === "string" ? candidate.code : null,
    status: typeof candidate.status === "number" ? candidate.status : null,
  };
}

export function getBuildVersion(): string {
  return (
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ??
    process.env.NEXT_PUBLIC_BUILD_VERSION ??
    "development"
  );
}

/**
 * Structured, privacy-minimizing server logging. Callers pass operation names
 * and bounded identifiers only—never emails, recipe content, request bodies,
 * signed URLs, or Storage paths.
 */
export function logServerError(
  event: string,
  error: unknown,
  context: Readonly<Record<string, SafeContextValue>> = {},
) {
  console.error(
    "[nanas-recipes:error]",
    JSON.stringify({
      level: "error",
      event,
      version: getBuildVersion(),
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
      ...errorDetails(error),
      ...context,
    }),
  );
}

export function reportClientError(event: string, error: unknown) {
  const name =
    error instanceof Error
      ? error.name
      : typeof error === "object" && error !== null
        ? "UnknownError"
        : typeof error;
  console.error("[nanas-recipes:client-error]", { event, errorName: name });
}
