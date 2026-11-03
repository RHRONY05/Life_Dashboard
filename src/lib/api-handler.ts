import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  ConflictError,
  InvalidInputError,
  NotFoundError,
  UnauthorizedError,
} from "@/lib/errors";
import { AuthError } from "@/lib/auth";

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof AuthError || err instanceof UnauthorizedError) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: "invalid_input",
        details: err.flatten(),
      },
      { status: 400 }
    );
  }

  if (err instanceof InvalidInputError) {
    return NextResponse.json(
      {
        error: "invalid_input",
        details: err.details,
      },
      { status: 400 }
    );
  }

  if (err instanceof NotFoundError) {
    return NextResponse.json(
      {
        error: "not_found",
        message: err.message,
      },
      { status: 404 }
    );
  }

  if (err instanceof ConflictError) {
    return NextResponse.json(
      {
        error: "conflict",
        details: { reason: err.reason, ...(err.details || {}) },
      },
      { status: 409 }
    );
  }

  console.error("[API Error]", err);
  return NextResponse.json(
    {
      error: "server_error",
    },
    { status: 500 }
  );
}
