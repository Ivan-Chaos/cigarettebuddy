/** An error with an HTTP status attached, thrown from routes and services. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code: string = 'error',
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }

  static badRequest(message: string, details?: unknown) {
    return new HttpError(400, message, 'bad_request', details);
  }

  static notFound(message = 'Resource not found') {
    return new HttpError(404, message, 'not_found');
  }

  static conflict(message: string, details?: unknown) {
    return new HttpError(409, message, 'conflict', details);
  }
}
