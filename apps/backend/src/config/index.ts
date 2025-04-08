import dotenv from 'dotenv';

dotenv.config();

const config = {
  postgres: {
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DB,
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    url: process.env.DATABASE_URL!,
  },
  jwt: {
    secret: process.env.ZERO_AUTH_SECRET!,
    expiresIn: '7d',
  },
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 8000,
};

if (!config.jwt.secret) {
  throw new Error('ZERO_AUTH_SECRET is not defined');
}

export default config;
