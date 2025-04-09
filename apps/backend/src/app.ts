import express from 'express';
import cookieParser from 'cookie-parser';
import config from './config/index.js';
import routes from './routes/index.js';
import { errorHandler } from './errors/errorHandler.js';
import cors from 'cors';

const app = express();
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

// Middlewares
app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api', routes);

// Error handling
app.use(errorHandler);

export const startServer = () => {
  return app.listen(config.port, () => {
    console.log(`Server running at http://localhost:${config.port}`);
  });
};
