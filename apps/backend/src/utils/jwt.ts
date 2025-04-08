import config from '@config/index.js';
import jwt from 'jsonwebtoken';

export const generateToken = (payload: {
  userId: string;
  organizationId?: string;
  email: string;
}) => {
  return jwt.sign(
    {
      sub: payload.userId,
      organizationId: payload.organizationId,
      email: payload.email,
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    },
    config.jwt.secret,
    { algorithm: 'HS256' }
  );
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, config.jwt.secret) as {
      sub: string;
      organizationId: string;
      email: string;
    };
  } catch (error) {
    console.error(error);
    throw new Error('Invalid token');
  }
};
