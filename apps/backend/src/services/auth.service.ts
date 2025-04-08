import { db } from '@db/client.js';
import { organizations, users } from '@db/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { ApiError, ErrorType } from '@errors/ApiError.js';
import { generateToken } from '@utils/jwt.js';

export class AuthService {
  static async signup({
    email,
    password,
    organizationName,
  }: {
    email: string;
    password: string;
    organizationName: string;
  }) {
    const existingOrg = await db.query.organizations.findFirst({
      where: eq(organizations.name, organizationName),
    });

    if (existingOrg) {
      throw new ApiError(
        400,
        ErrorType.DUPLICATE_ENTRY,
        'Organization name already taken'
      );
    }

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
      const result = await db.transaction(async (tx) => {
        const [org] = await tx
          .insert(organizations)
          .values({ name: organizationName })
          .returning();
        if (!org)
          throw new ApiError(
            500,
            ErrorType.INTERNAL_ERROR,
            'Failed to create organization'
          );
        const [user] = await tx
          .insert(users)
          .values({ email, hashedPassword, organizationId: org.organizationId })
          .returning();
        if (!user)
          throw new ApiError(
            500,
            ErrorType.INTERNAL_ERROR,
            'Failed to create user'
          );
        return { org, user };
      });

      return generateToken({
        userId: result.user.userId,
        organizationId: result.org.organizationId,
        email: result.user.email,
      });
    } catch (error) {
      console.error(error);
      throw new ApiError(
        500,
        ErrorType.INTERNAL_ERROR,
        'Failed to create user'
      );
    }
  }

  static async login({ email, password }: { email: string; password: string }) {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
      with: { organization: true },
    });

    if (!user || !user.isActive) {
      throw new ApiError(401, ErrorType.INVALID_CREDENTIALS);
    }

    const passwordMatch = await bcrypt.compare(password, user.hashedPassword);
    if (!passwordMatch) {
      throw new ApiError(401, ErrorType.INVALID_CREDENTIALS);
    }

    return generateToken({
      userId: user.userId,
      organizationId: user.organizationId,
      email: user.email,
    });
  }
}
