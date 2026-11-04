/**
 * Life Dashboard — error reasons and friendly messages
 * Maps API / domain conflict/error reasons to clear, plain-language sentences.
 */

export class NotFoundError extends Error {
  status = 404;
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error {
  status = 409;
  reason: string;
  details?: Record<string, unknown>;
  constructor(reason: string, message?: string, details?: Record<string, unknown>) {
    super(message || getErrorMessage(reason, "Conflict"));
    this.name = "ConflictError";
    this.reason = reason;
    this.details = details;
  }
}

export class InvalidInputError extends Error {
  status = 400;
  details?: unknown;
  constructor(message = "Invalid input", details?: unknown) {
    super(message);
    this.name = "InvalidInputError";
    this.details = details;
  }
}

export class UnauthorizedError extends Error {
  status = 401;
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export const ERROR_MESSAGES: Record<string, string> = {
  // Tasks & lists
  TASK_ALREADY_DONE: "You can't move a completed task.",
  TASK_NOT_FOUND: "That task no longer exists.",
  LIST_LIMIT_REACHED: "You have reached the maximum of 8 lists.",
  LIST_NAME_EXISTS: "You already have a list with that name.",
  LIST_NOT_FOUND: "That list no longer exists.",
  INVALID_DUE_DATE: "Please provide a valid date.",

  // Trackers
  TRACKER_LIMIT_REACHED: "Trackers limit reached.",
  TRACKER_NOT_FOUND: "That tracker no longer exists.",
  TRACKER_NAME_EXISTS: "You already have a tracker with that name.",
  TRACKER_ITEM_ALREADY_SCHEDULED: "This item is already scheduled on the board.",
  TRACKER_ITEM_ALREADY_DONE: "This tracker item is already finished.",

  // Money & IOUs
  PERSON_NOT_FOUND: "That person was not found.",
  PERSON_NAME_EXISTS: "A person with that name already exists.",
  ALREADY_SETTLED: "That balance is already settled.",
  INVALID_AMOUNT: "Please enter a valid amount in taka.",
  FUTURE_EXPENSE_FORBIDDEN: "Expenses cannot be recorded for future dates.",
  limit_reached: "100 open payments is the maximum. Mark some paid first.",
  already_paid: "This payment has already been marked as paid.",

  // Renewals
  RENEWAL_NOT_FOUND: "That renewal was not found.",
  FREE_CYCLE_CANNOT_RENEW: "Free items don't have renewal dates to advance.",

  // Keys & Auth
  KEY_LIMIT_REACHED: "Maximum of 10 active API keys reached.",
  KEY_NAME_EXISTS: "You already have an active API key with that name.",
  KEY_REVOKED: "This API key has been revoked.",
  UNAUTHORIZED: "You must be signed in to perform this action.",
  RATE_LIMITED: "Too many requests. Please slow down.",
  SCOPE_DENIED: "Your API key does not have permission for this action.",

  // Generic
  NOT_FOUND: "That item no longer exists.",
  TIMEOUT: "That took too long. Try again.",
  SERVER_ERROR: "Something went wrong on our side. Please try again.",
  OFFLINE: "You're offline. Changes will fail until you're back online.",
};

export function getErrorMessage(reason?: string, fallback?: string): string {
  if (reason && ERROR_MESSAGES[reason]) {
    return ERROR_MESSAGES[reason];
  }
  return fallback || "Something went wrong. Please try again.";
}
