// frontend/src/main.tsx
import { StrictMode, useSyncExternalStore, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { ZeroProvider } from '@rocicorp/zero/react';
import { zeroRef } from './features/sync/zero-setup.ts'; // Import zeroRef
import { LoginProvider } from './features/auth/LoginProvider.tsx'; // Import LoginProvider

// Main component to manage Zero instance connection
function Main() {
  const z = useSyncExternalStore(
    zeroRef.onChange,
    useCallback(() => zeroRef.value, []),
  );

  // Don't render until the Zero instance is ready
  if (!z) {
    // Optionally return a loading spinner/message
    return <div>Loading Zero Sync...</div>;
  }

  return (
    <ZeroProvider zero={z}>
      <LoginProvider>
        <App />
      </LoginProvider>
    </ZeroProvider>
  );
}

// Ensure the root element exists
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Failed to find the root element");
}

createRoot(rootElement).render(
  <StrictMode>
    <Main />
  </StrictMode>,
);