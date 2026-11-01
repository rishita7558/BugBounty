/**
 * @file AppErrors.ts
 * @description Strongly typed application error hierarchy for CodeDuel: BugBounty Arena.
 * Provides granular error domain classification, serialization, and recoverable state reporting.
 */

/**
 * Enumeration of all discrete application error codes.
 * Implemented as a const object to maintain full compatibility with erasable TypeScript syntax.
 */
export const AppErrorCode = {
  // Game state & action machine errors
  GAME_ACTION_INVALID: 'GAME_ACTION_INVALID',
  GAME_PHASE_MISMATCH: 'GAME_PHASE_MISMATCH',
  GAME_SUBMISSION_REJECTED: 'GAME_SUBMISSION_REJECTED',

  // Code execution & sandbox errors
  CODE_EXECUTION_FAILED: 'CODE_EXECUTION_FAILED',
  CODE_EXECUTION_TIMEOUT: 'CODE_EXECUTION_TIMEOUT',
  CODE_SYNTAX_ERROR: 'CODE_SYNTAX_ERROR',

  // Network & API proxy errors
  NETWORK_REQUEST_FAILED: 'NETWORK_REQUEST_FAILED',
  API_RESPONSE_INVALID: 'API_RESPONSE_INVALID',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Storage & IndexedDB persistence errors
  STORAGE_READ_FAILED: 'STORAGE_READ_FAILED',
  STORAGE_WRITE_FAILED: 'STORAGE_WRITE_FAILED',
  STORAGE_CORRUPTED: 'STORAGE_CORRUPTED',

  // Validation & payload decoding errors
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  CHALLENGE_DECODE_FAILED: 'CHALLENGE_DECODE_FAILED',

  // Progressive hint errors
  HINT_EXHAUSTED: 'HINT_EXHAUSTED',
  HINT_UNAVAILABLE: 'HINT_UNAVAILABLE',

  // Audio synthesis errors
  AUDIO_PLAYBACK_FAILED: 'AUDIO_PLAYBACK_FAILED',

  // General fallback
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

/**
 * Union type representing all allowable application error codes.
 */
export type AppErrorCode = (typeof AppErrorCode)[keyof typeof AppErrorCode];

/**
 * Options for configuring an application error instance.
 */
export interface AppErrorOptions {
  /** Indicates whether the application can safely recover without reload. */
  recoverable?: boolean;
  /** Arbitrary domain context associated with the error. */
  context?: Record<string, unknown>;
  /** Underlying cause if this error wraps another exception. */
  cause?: unknown;
}

/**
 * Serialized representation of an application error.
 */
export interface SerializedAppError {
  name: string;
  code: AppErrorCode;
  message: string;
  recoverable: boolean;
  timestamp: string;
  context?: Record<string, unknown>;
  stack?: string;
}

/**
 * Abstract base class for all domain-specific application errors.
 * Preserves the prototype chain and standardizes serialization.
 */
export abstract class AppError extends Error {
  public abstract readonly code: AppErrorCode;
  public readonly recoverable: boolean;
  public readonly timestamp: string;
  public readonly context?: Record<string, unknown>;
  public override readonly cause?: unknown;

  /**
   * Initializes a new AppError instance.
   *
   * @param message Human-readable error message.
   * @param options Configuration options including recoverability and context.
   */
  constructor(message: string, options?: AppErrorOptions) {
    super(message);
    this.name = new.target.name;
    this.recoverable = options?.recoverable ?? true;
    this.timestamp = new Date().toISOString();
    this.context = options?.context;
    this.cause = options?.cause;

    // Restore prototype chain for proper instanceof checks across transpilation targets
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Serializes the error instance to a JSON-compatible object.
   *
   * @returns Structured error data suitable for logging or telemetry.
   */
  public toJSON(): SerializedAppError {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      recoverable: this.recoverable,
      timestamp: this.timestamp,
      context: this.context,
      stack: this.stack,
    };
  }

  /**
   * Returns a user-friendly presentation string suitable for arcade HUD banners.
   *
   * @returns Clean message without internal debugging jargon.
   */
  public getUserFriendlyMessage(): string {
    return this.message;
  }
}

/**
 * Error raised when an illegal action is dispatched to the GameActionMachine.
 */
export class GameActionError extends AppError {
  public readonly code: AppErrorCode = AppErrorCode.GAME_ACTION_INVALID;
  public readonly phase?: string;
  public readonly action?: string;

  /**
   * @param message Description of the invalid state transition.
   * @param phase The active game phase during the attempted action.
   * @param action The name of the rejected action.
   * @param options Additional error options.
   */
  constructor(
    message: string,
    phase?: string,
    action?: string,
    options?: AppErrorOptions
  ) {
    super(message, {
      ...options,
      context: { phase, action, ...options?.context },
    });
    this.phase = phase;
    this.action = action;
  }
}

/**
 * Error raised when the sandboxed Web Worker code runner encounters a failure or watchdog timeout.
 */
export class CodeExecutionError extends AppError {
  public readonly code: AppErrorCode;
  public readonly executionTimeMs?: number;
  public readonly sourceSnippet?: string;

  /**
   * @param message Description of the execution failure.
   * @param isTimeout Whether execution was aborted due to watchdog timeout.
   * @param executionTimeMs Total execution time before failure.
   * @param sourceSnippet Truncated code snippet for diagnostic context.
   * @param options Additional error options.
   */
  constructor(
    message: string,
    isTimeout = false,
    executionTimeMs?: number,
    sourceSnippet?: string,
    options?: AppErrorOptions
  ) {
    const code = isTimeout
      ? AppErrorCode.CODE_EXECUTION_TIMEOUT
      : AppErrorCode.CODE_EXECUTION_FAILED;
    super(message, {
      ...options,
      context: { isTimeout, executionTimeMs, ...options?.context },
    });
    this.code = code;
    this.executionTimeMs = executionTimeMs;
    this.sourceSnippet = sourceSnippet;
  }
}

/**
 * Error raised during HTTP communication with backend API services.
 */
export class NetworkApiError extends AppError {
  public readonly code: AppErrorCode;
  public readonly statusCode?: number;
  public readonly endpoint?: string;
  public readonly responseBody?: unknown;

  /**
   * @param message Error description.
   * @param statusCode HTTP response status code, if received.
   * @param endpoint Target API path.
   * @param responseBody Raw or parsed response payload.
   * @param options Additional error options.
   */
  constructor(
    message: string,
    statusCode?: number,
    endpoint?: string,
    responseBody?: unknown,
    options?: AppErrorOptions
  ) {
    const isRateLimit = statusCode === 429;
    const code = isRateLimit
      ? AppErrorCode.RATE_LIMIT_EXCEEDED
      : AppErrorCode.NETWORK_REQUEST_FAILED;

    super(message, {
      ...options,
      context: { statusCode, endpoint, ...options?.context },
    });
    this.code = code;
    this.statusCode = statusCode;
    this.endpoint = endpoint;
    this.responseBody = responseBody;
  }
}

/**
 * Error raised when client-side IndexedDB (Dexie) or local storage operations fail.
 */
export class StorageError extends AppError {
  public readonly code: AppErrorCode;
  public readonly table?: string;
  public readonly operation?: 'read' | 'write' | 'delete';

  /**
   * @param message Storage failure description.
   * @param operation The storage operation that failed.
   * @param table Target database store or table name.
   * @param options Additional error options.
   */
  constructor(
    message: string,
    operation?: 'read' | 'write' | 'delete',
    table?: string,
    options?: AppErrorOptions
  ) {
    const code =
      operation === 'read'
        ? AppErrorCode.STORAGE_READ_FAILED
        : AppErrorCode.STORAGE_WRITE_FAILED;

    super(message, {
      ...options,
      context: { operation, table, ...options?.context },
    });
    this.code = code;
    this.table = table;
    this.operation = operation;
  }
}

/**
 * Error raised when URL-compressed challenge payloads fail decoding or integrity checks.
 */
export class ChallengeValidationError extends AppError {
  public readonly code: AppErrorCode = AppErrorCode.CHALLENGE_DECODE_FAILED;
  public readonly rawPayload?: string;

  /**
   * @param message Parsing or validation failure message.
   * @param rawPayload Raw encoded payload string.
   * @param options Additional error options.
   */
  constructor(
    message: string,
    rawPayload?: string,
    options?: AppErrorOptions
  ) {
    super(message, {
      ...options,
      context: { rawPayloadLength: rawPayload?.length, ...options?.context },
    });
    this.rawPayload = rawPayload;
  }
}

/**
 * Error raised when a hint request violates HintStateMachine rules or quota limits.
 */
export class HintExhaustedError extends AppError {
  public readonly code: AppErrorCode = AppErrorCode.HINT_EXHAUSTED;
  public readonly hintsUsed: number;
  public readonly maxHints: number;

  /**
   * @param message Explanatory reason for hint rejection.
   * @param hintsUsed Count of hints already consumed.
   * @param maxHints Maximum allowed hints for the challenge.
   * @param options Additional error options.
   */
  constructor(
    message = 'All available hints have been exhausted for this challenge.',
    hintsUsed = 3,
    maxHints = 3,
    options?: AppErrorOptions
  ) {
    super(message, {
      ...options,
      context: { hintsUsed, maxHints, ...options?.context },
    });
    this.hintsUsed = hintsUsed;
    this.maxHints = maxHints;
  }
}

/**
 * Error raised when Web Audio API synthesis fails.
 */
export class AudioPlaybackError extends AppError {
  public readonly code: AppErrorCode = AppErrorCode.AUDIO_PLAYBACK_FAILED;
  public readonly soundType?: string;

  /**
   * @param message Audio error details.
   * @param soundType Name of the audio effect being synthesized.
   * @param options Additional error options.
   */
  constructor(message: string, soundType?: string, options?: AppErrorOptions) {
    super(message, {
      ...options,
      recoverable: true,
      context: { soundType, ...options?.context },
    });
    this.soundType = soundType;
  }
}

/**
 * General fallback error for unclassified runtime exceptions.
 */
export class UnknownAppError extends AppError {
  public readonly code: AppErrorCode = AppErrorCode.UNKNOWN_ERROR;

  /**
   * @param message Error description.
   * @param options Additional error options.
   */
  constructor(message: string, options?: AppErrorOptions) {
    super(message, options);
  }
}

/**
 * Type guard to determine if an unknown error object is an AppError instance.
 *
 * @param error Unknown candidate object.
 * @returns True if error is an instance of AppError.
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Normalizes an unknown caught error into a concrete AppError subclass.
 *
 * @param error Unknown error caught in a try/catch block.
 * @param fallbackMessage Default message to assign if the error has none.
 * @returns A guaranteed AppError instance.
 */
export function toAppError(
  error: unknown,
  fallbackMessage = 'An unexpected application error occurred.'
): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new UnknownAppError(error.message || fallbackMessage, {
      cause: error,
      context: { originalName: error.name, originalStack: error.stack },
    });
  }

  if (typeof error === 'string') {
    return new UnknownAppError(error);
  }

  return new UnknownAppError(fallbackMessage, {
    context: { rawError: String(error) },
  });
}
