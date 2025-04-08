import { SignupInput, LoginInput } from '@schemas/auth.schema.js';
import { AddUserInput } from '@schemas/user.schema.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        organizationId: string;
      };
    }
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    validatedData?: {
      body?: SignupInput | LoginInput | AddUserInput;
    };
  }
}
