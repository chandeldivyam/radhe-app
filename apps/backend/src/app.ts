import express from 'express';
import cookieParser from 'cookie-parser';
import config from './config/index.js';
import routes from './routes/index.js';
import { errorHandler } from './errors/errorHandler.js';

const app = express();

// Middlewares
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
