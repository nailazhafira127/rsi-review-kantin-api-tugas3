export type FieldError = { field: string; message: string };

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(public readonly errors: FieldError[]) {
    super(400, 'Validasi gagal');
    this.name = 'ValidationError';
  }
}