import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ApiError, ErrorType } from '@errors/ApiError.js';

export const validateRequest = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Explicitly type the object being passed to schema.parse
      const data: {
        body: unknown;
        query: unknown;
        params: unknown;
      } = {
        body: req.body,
        query: req.query,
        params: req.params,
      };

      schema.parse(data);
      next();
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        next(new ApiError(400, ErrorType.VALIDATION_ERROR, error.errors));
      } else {
        next(
          new ApiError(
            500,
            ErrorType.INTERNAL_ERROR,
            error instanceof Error ? error.message : 'Unknown validation error'
          )
        );
      }
    }
  };
};
