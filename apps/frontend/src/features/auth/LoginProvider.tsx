// frontend/src/features/auth/LoginProvider.tsx
import React, { useSyncExternalStore, useCallback } from 'react';
import { loginContext, type LoginContext } from './useLogin';
import { authRef, logout as performLogout } from '../sync/zero-setup'; // Adjust path

export function LoginProvider({ children }: { children: React.ReactNode }) {
  const loginState = useSyncExternalStore(
    authRef.onChange,
    useCallback(() => authRef.value, [])
  );

  const contextValue: LoginContext = {
    loginState,
    logout: performLogout
  };

  return (
    <loginContext.Provider value={contextValue}>
      {children}
    </loginContext.Provider>
  );
}