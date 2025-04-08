// backend/src/routes/zero.route.ts
import { Router } from 'express';

import postgres from 'postgres';
import { serverAuthenticate } from '../middlewares/authenticate.js'; // Your JWT auth middleware
import config from '../config/index.js'; // Import your config for DB URL
import { ApiError, ErrorType } from '../errors/ApiError.js';
import type { AuthData } from '@radhe/zero-shared'
import { schema, createMutators } from '@radhe/zero-shared';
import { PushProcessor, connectionProvider } from '@rocicorp/zero/pg';
const router = Router();

// --- Database Connection for Zero ---
// Use the same connection string Drizzle likely uses
// Ensure ZERO_UPSTREAM_DB is set in your environment (.env file)
const pgClient = postgres(config.postgres.url, {
  // Add any specific postgres.js options if needed
  // Consider options for connection pooling, timeouts, etc.
  max: 10, // Example: Set max connections
});

// --- Zero Push Processor ---
// Instantiate the processor with schema and DB connection

// --- Push Endpoint ---
// Use POST method as specified by Zero
router.post(
  '/push',
  serverAuthenticate,
  async (req, res, next) => {
    try {
      // 1. Authentication Check (handled by middleware)
      // req.user should be populated by the 'authenticate' middleware
      const processor = new PushProcessor(schema, connectionProvider(pgClient));
      if (!req.user) {
        // Should technically be caught by 'authenticate', but belt-and-suspenders
        throw new ApiError(
          401,
          ErrorType.UNAUTHORIZED,
          'Authentication required'
        );
      }

      // 2. Prepare AuthData for Mutators
      // Map req.user (from your middleware) to the AuthData type expected by createMutators
      // Your AuthData expects 'sub', yours middleware provides 'id' (which is the sub)
      const authData: AuthData = {
        sub: req.user.id,
        email: req.user.email,
        organizationId: req.user.organizationId,
        // iat and exp are typically not needed server-side for authorization logic
        // within mutators, but add them if your mutators depend on them.
        // You might need to decode the raw token again if you need iat/exp
        iat: 0, // Placeholder or decode token again if needed
        exp: 0, // Placeholder or decode token again if needed
      };

      // 3. Instantiate Server Mutators
      // Pass the authenticated user data to your mutator creation function
      const serverMutators = createMutators(authData);

      // 4. Process the Push Request
      // processor.process handles:
      // - Parsing the request body (mutations from zero-cache)
      // - Getting a DB transaction from the connectionProvider
      // - Executing the correct server-side mutator from 'serverMutators' within the transaction
      // - Handling potential errors thrown by mutators
      // - Formatting the correct PushResponse
      const result = await processor.process(
        serverMutators,
        req.query, // Pass query params (Zero might use these in the future)
        req.body // Pass the request body (contains the mutations)
      );

      // 5. Send Response
      // Send the structured response back to zero-cache
      res.status(200).json(result);
    } catch (error) {
      // Catch any errors not handled by PushProcessor (like auth issues before processing)
      // or re-thrown errors.
      console.error('Error processing Zero push request:', error);
      // Let your generic error handler deal with it, or return a specific format if needed
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
  }
);

export default router;
