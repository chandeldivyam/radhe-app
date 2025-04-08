import { Router } from 'express';
import { AuthService } from '@services/auth.service.js';
import { validateRequest } from '@middlewares/validateRequest.js';
import {
  loginSchema,
  signupSchema,
  SignupInput,
  LoginInput,
} from '@schemas/auth.schema.js';

const router = Router();

router.post(
  '/signup',
  validateRequest(signupSchema),
  async (req, res, next) => {
    try {
      const token = await AuthService.signup(req.body as SignupInput);

      res.cookie('jwt', token, {
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      });
      res.status(201).json({ message: 'Signup successful' });
    } catch (error) {
      next(error);
    }
  }
);

router.post('/login', validateRequest(loginSchema), async (req, res, next) => {
  try {
    const token = await AuthService.login(req.body as LoginInput);
    res.cookie('jwt', token, {
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });
    res.status(200).json({ message: 'Login successful' });
  } catch (error) {
    next(error);
  }
});

export default router;
