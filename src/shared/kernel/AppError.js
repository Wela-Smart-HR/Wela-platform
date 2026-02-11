/**
 * Base Application Error class
 * Use this to distinguish expected Domain/App errors from unexpected System errors.
 */
export class AppError extends Error {
    constructor(message, code = 'GENERIC_ERROR') {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.isOperational = true; // Expected error (e.g. Validation), not a bug
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Common Domain Errors
 */

export class ValidationError extends AppError {
    constructor(message) {
        super(message, 'VALIDATION_ERROR');
    }
}

export class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 'NOT_FOUND');
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 'UNAUTHORIZED');
    }
}
