// utils/errorTypes.js
class ValidationError extends Error {
    constructor(message, field) {
        super(message);
        this.name = 'ValidationError';
        this.statusCode = 400;
        this.field = field;
    }
}

class DatabaseError extends Error {
    constructor(message, operation) {
        super(message);
        this.name = 'DatabaseError';
        this.statusCode = 500;
        this.operation = operation;
    }
}

class ExternalAPIError extends Error {
    constructor(message, service, statusCode) {
        super(message);
        this.name = 'ExternalAPIError';
        this.statusCode = statusCode || 502;
        this.service = service;
    }
}