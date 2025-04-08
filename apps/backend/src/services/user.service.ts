// in src/services/user.service.ts
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import bcrypt from 'bcrypt';
import { ApiError, ErrorType } from '../errors/ApiError.js';
import { eq } from 'drizzle-orm';

interface AddUserSchema {
  email: string;
  password: string;
  organizationId: string;
}

export class UserService {
  static async addUserToOrganization({
    email,
    password,
    organizationId,
  }: AddUserSchema) {
    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      throw new ApiError(
        400,
        ErrorType.DUPLICATE_ENTRY,
        'Email already registered'
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      // Create new user with the organization ID
      const [user] = await db
        .insert(users)
        .values({
          email,
          hashedPassword,
          organizationId,
        })
        .returning();

      if (!user) {
        throw new ApiError(
          500,
          ErrorType.INTERNAL_ERROR,
          'Failed to create user'
        );
      }

      return { id: user.userId, email: user.email };
    } catch (error) {
      console.error(error);
      throw new ApiError(
        500,
        ErrorType.INTERNAL_ERROR,
        'Failed to add user to organization'
      );
    }
  }
}
