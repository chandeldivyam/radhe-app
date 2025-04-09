// backend/src/routes/zero.route.ts
import { Router } from 'express';

import postgres from 'postgres';
import { serverAuthenticate } from '../middlewares/authenticate.js'; // Your JWT auth middleware
import config from '../config/index.js'; // Import your config for DB URL
import { ApiError, ErrorType } from '../errors/ApiError.js';
import type { AuthData } from '@radhe/zero-shared';
import { schema, createMutators } from '@radhe/zero-shared';
import { PushProcessor, connectionProvider } from '@rocicorp/zero/pg';
const router = Router();

const pgClient = postgres(config.postgres.url, {
  max: 10,
});

router.post('/push', serverAuthenticate, async (req, res, next) => {
  try {
    const processor = new PushProcessor(schema, connectionProvider(pgClient));
    if (!req.user) {
      throw new ApiError(
        401,
        ErrorType.UNAUTHORIZED,
        'Authentication required'
      );
    }

    const authData: AuthData = {
      sub: req.user.id,
      email: req.user.email,
      organizationId: req.user.organizationId,
      iat: 0,
      exp: 0,
    };

    const serverMutators = createMutators(authData);

    const result = await processor.process(serverMutators, req.query, req.body);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error processing Zero push request:', error);
    next(
      error instanceof ApiError
        ? error
        : new ApiError(
            500,
            ErrorType.INTERNAL_ERROR,
            'Failed to process mutations'
          )
    );
  }
});

export default router;
