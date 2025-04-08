import { assert } from './helper.js';

export type AuthData = {
  sub: string;
  organizationId: string;
  email: string;
  iat: number;
  exp: number;
};

export function assertIsLoggedIn(authData: AuthData | undefined): asserts authData {
  assert(authData, 'user must be logged in for this operation');
}
