// in src/middlewares/authenticate.ts
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@utils/jwt.js';
import { ApiError, ErrorType } from '@errors/ApiError.js';

interface User {
  sub: string;
  email: string;
  organizationId: string;
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies.jwt as string;

    if (!token) {
      throw new ApiError(
        401,
        ErrorType.UNAUTHORIZED,
        'Authentication required'
      );
    }

    const decoded: User = verifyToken(token);
    if (!decoded.email || !decoded.organizationId || !decoded.sub) {
      throw new ApiError(
        401,
        ErrorType.UNAUTHORIZED,
        'Invalid or expired token'
      );
    }

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      organizationId: decoded.organizationId,
    };

    next();
  } catch (error) {
    console.error(error);
    next(new ApiError(401, ErrorType.UNAUTHORIZED, 'Invalid or expired token'));
  }
};

export const serverAuthenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      throw new ApiError(
        401,
        ErrorType.UNAUTHORIZED,
        'Authentication required'
      );
    }
    const decoded: User = verifyToken(token);
    if (!decoded.email || !decoded.organizationId || !decoded.sub) {
      throw new ApiError(
        401,
        ErrorType.UNAUTHORIZED,
        'Invalid or expired token'
      );
    }
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      organizationId: decoded.organizationId,
    };
    next();
  } catch (error) {
    console.error(error);
    next(new ApiError(401, ErrorType.UNAUTHORIZED, 'Invalid or expired token'));
  }
};