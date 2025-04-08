// frontend/src/features/auth/useLogin.ts
import { createContext, useContext } from 'react';
import type { LoginState } from '../sync/zero-setup';

export type LoginContext = {
  loginState: LoginState | undefined;
  // Add logout function here later if needed
};

export const loginContext = createContext<LoginContext | undefined>(undefined);

export function useLogin(): LoginContext {
  const state = useContext(loginContext);
  if (state === undefined) {
    throw new Error('useLogin must be used within a LoginProvider');
  }
  return state;
}