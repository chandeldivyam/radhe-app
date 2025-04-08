import { Request, Response, NextFunction } from 'express';
import { ApiError, ErrorType } from './ApiError.js';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  if (err instanceof ApiError) {
    const errorType = Object.values(ErrorType).includes(
      err.message as ErrorType
    )
      ? err.message
      : ErrorType.INTERNAL_ERROR;

    res.status(err.statusCode).json({
      error: {
        type: errorType,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  console.error(err.stack);
  res.status(500).json({
    error: {
      type: ErrorType.INTERNAL_ERROR,
      message: 'An unexpected internal server error occurred.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    },
  });
};
