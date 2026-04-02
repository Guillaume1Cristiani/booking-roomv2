import { NextResponse } from "next/server";

export function newCorrelationId(): string {
  return crypto.randomUUID();
}

/** Base class for typed application errors that map to specific HTTP status codes. */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
    this.name = "ConflictError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
    this.name = "ValidationError";
  }
}

/** PostgreSQL wire-protocol error codes relevant to our domain. */
const PG_UNIQUE_VIOLATION = "23505";
const PG_FK_VIOLATION = "23503";
const PG_NOT_NULL_VIOLATION = "23502";
const PG_CHECK_VIOLATION = "23514";

interface PgError {
  code?: string;
  constraint?: string;
}

function isPgError(err: unknown): err is PgError {
  return typeof err === "object" && err !== null && "code" in err;
}

/**
 * Maps any thrown value to a structured NextResponse with the correct HTTP
 * status code. Logs the full error server-side with a correlation ID so
 * clients can reference it without leaking internals.
 */
export function handleRouteError(
  error: unknown,
  correlationId: string,
  context: string
): NextResponse {
  console.error(`[${correlationId}] ${context}:`, error);

  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, correlationId },
      { status: error.statusCode }
    );
  }

  if (isPgError(error)) {
    switch (error.code) {
      case PG_UNIQUE_VIOLATION:
        return NextResponse.json(
          { error: "Resource already exists", correlationId },
          { status: 409 }
        );
      case PG_FK_VIOLATION:
        return NextResponse.json(
          { error: "Referenced resource not found", correlationId },
          { status: 409 }
        );
      case PG_NOT_NULL_VIOLATION:
      case PG_CHECK_VIOLATION:
        return NextResponse.json(
          { error: "Invalid data provided", correlationId },
          { status: 400 }
        );
    }
  }

  return NextResponse.json(
    { error: "Internal Server Error", correlationId },
    { status: 500 }
  );
}
