/**
 * Request Logging Middleware
 *
 * Logs all API requests with timing and error tracking.
 * Use as a wrapper for API route handlers.
 */

import { NextResponse } from "next/server";
import { logger, createRequestLogger, type LogContext } from "./index";

export interface RequestLogContext extends LogContext {
  requestId: string;
  route: string;
  method: string;
  userAgent?: string;
  ip?: string;
}

/**
 * Wrap an API route handler with request logging
 */
export function withRequestLogging<T extends (...args: any[]) => Promise<Response>>(
  handler: T,
  options: { name?: string } = {}
): T {
  return (async (...args: Parameters<T>) => {
    const request = args[0] as Request;
    const start = performance.now();
    const requestId = crypto.randomUUID();
    const url = new URL(request.url);

    const reqLogger = logger.child({
      requestId,
      route: url.pathname,
      method: request.method,
    });

    reqLogger.info(`${request.method} ${url.pathname} started`);

    try {
      const response = await handler(...args);
      const duration = Math.round(performance.now() - start);

      reqLogger.info(`${request.method} ${url.pathname} completed`, {
        status: response.status,
        duration_ms: duration,
      });

      // Add request ID to response headers
      const headers = new Headers(response.headers);
      headers.set("x-request-id", requestId);

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      const duration = Math.round(performance.now() - start);

      reqLogger.error(`${request.method} ${url.pathname} failed`, error, {
        duration_ms: duration,
      });

      // Re-throw to let Next.js handle the error
      throw error;
    }
  }) as T;
}

/**
 * Log slow requests
 */
export function logSlowRequest(
  request: Request,
  durationMs: number,
  threshold: number = 1000
): void {
  if (durationMs > threshold) {
    const url = new URL(request.url);
    logger.warn("Slow request detected", {
      route: url.pathname,
      method: request.method,
      duration_ms: durationMs,
      threshold_ms: threshold,
    });
  }
}

/**
 * Extract client info from request
 */
export function getClientInfo(request: Request): {
  ip: string | null;
  userAgent: string | null;
  referer: string | null;
} {
  return {
    ip:
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      null,
    userAgent: request.headers.get("user-agent"),
    referer: request.headers.get("referer"),
  };
}

/**
 * Create a middleware that logs all requests
 */
export function createLoggingMiddleware() {
  return async function loggingMiddleware(request: Request): Promise<void> {
    const url = new URL(request.url);

    // Skip logging for static assets
    if (
      url.pathname.startsWith("/_next") ||
      url.pathname.startsWith("/static") ||
      url.pathname.endsWith(".ico")
    ) {
      return;
    }

    const clientInfo = getClientInfo(request);

    logger.info("Request received", {
      route: url.pathname,
      method: request.method,
      query: Object.fromEntries(url.searchParams),
      ...clientInfo,
    });
  };
}

/**
 * API response helpers with logging
 */
export const apiResponse = {
  success<T>(data: T, requestId?: string): NextResponse {
    const response = NextResponse.json({ success: true as const, data });
    if (requestId) {
      response.headers.set("x-request-id", requestId);
    }
    return response;
  },

  error(
    message: string,
    status: number = 500,
    details?: unknown,
    requestId?: string
  ): NextResponse<{ success: false; error: string; details?: unknown }> {
    logger.error(`API Error: ${message}`, undefined, { status, details });

    const body: { success: false; error: string; details?: unknown } = {
      success: false,
      error: message,
    };

    if (details && process.env.NODE_ENV !== "production") {
      body.details = details;
    }

    const response = NextResponse.json(body, { status });
    if (requestId) {
      response.headers.set("x-request-id", requestId);
    }
    return response;
  },

  notFound(resource: string = "Resource", requestId?: string) {
    return this.error(`${resource} not found`, 404, undefined, requestId);
  },

  unauthorized(message: string = "Unauthorized", requestId?: string) {
    return this.error(message, 401, undefined, requestId);
  },

  badRequest(message: string, details?: unknown, requestId?: string) {
    return this.error(message, 400, details, requestId);
  },

  serverError(error: Error, requestId?: string) {
    logger.error("Server error", error);
    return this.error(
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : error.message,
      500,
      process.env.NODE_ENV !== "production" ? error.stack : undefined,
      requestId
    );
  },
};

/**
 * Async error wrapper for route handlers
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<Response>>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      logger.error("Unhandled route error", error);

      if (error instanceof Error) {
        return apiResponse.serverError(error);
      }

      return apiResponse.error("An unexpected error occurred", 500);
    }
  }) as T;
}

/**
 * Combined middleware: logging + error handling
 */
export function withApiMiddleware<T extends (...args: any[]) => Promise<Response>>(
  handler: T,
  options: { name?: string } = {}
): T {
  return withRequestLogging(withErrorHandling(handler), options);
}
