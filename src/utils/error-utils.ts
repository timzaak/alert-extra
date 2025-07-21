import { logger } from "../services/logger-service.ts";

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  /**
   * Creates a new instance of AppError
   * @param message Error message
   * @param code Error code
   * @param details Additional error details
   */
  constructor(
    message: string,
    code: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.details = details;
  }
}

/**
 * Error codes for the application
 */
export enum ErrorCode {
  CONFIG_ERROR = "CONFIG_ERROR",
  MQTT_CONNECTION_ERROR = "MQTT_CONNECTION_ERROR",
  MQTT_DISCONNECTED = "MQTT_DISCONNECTED",
  API_ERROR = "API_ERROR",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

/**
 * Handles an error by logging it and optionally rethrowing it
 * @param error The error to handle
 * @param context Context information for the error
 * @param rethrow Whether to rethrow the error
 */
export function handleError(
  error: unknown,
  context: string,
  rethrow = false,
): void {
  if (error instanceof AppError) {
    logger.error(`${context}: ${error.message}`, error, {
      code: error.code,
      details: error.details,
    });
  } else if (error instanceof Error) {
    logger.error(`${context}: ${error.message}`, error);
  } else {
    logger.error(`${context}: Unknown error`, error);
  }

  if (rethrow) {
    throw error;
  }
}

/**
 * Creates a standardized error response object
 * @param error The error to create a response for
 * @returns Error response object
 */
export function createErrorResponse(error: unknown): {
  error: true;
  message: string;
  code: string;
  details?: Record<string, unknown>;
} {
  if (error instanceof AppError) {
    return {
      error: true,
      message: error.message,
      code: error.code,
      details: error.details,
    };
  } else if (error instanceof Error) {
    return {
      error: true,
      message: error.message,
      code: ErrorCode.INTERNAL_ERROR,
    };
  } else {
    return {
      error: true,
      message: "An unknown error occurred",
      code: ErrorCode.INTERNAL_ERROR,
    };
  }
}

/**
 * Wraps an async function with error handling
 * @param fn The function to wrap
 * @param context Context information for error handling
 * @param rethrow Whether to rethrow errors
 * @returns Wrapped function
 */
export function withErrorHandling<
  T extends (...args: unknown[]) => Promise<unknown>,
>(
  fn: T,
  context: string,
  rethrow = false,
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      // Use type assertion to ensure the return type matches ReturnType<T>
      return await fn(...args) as ReturnType<T>;
    } catch (error) {
      handleError(error, context, rethrow);
      throw error;
    }
  };
}
