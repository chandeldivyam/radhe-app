// frontend/src/routes/RootLayout.tsx
import React, { useSyncExternalStore, useCallback, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ZeroProvider } from '@rocicorp/zero/react';
import { zeroRef } from '@/features/sync/zero-setup'; // Adjust path if needed
import { LoginProvider } from '@/features/auth/LoginProvider'; // Import from auth index
import { useLogin } from '@/features/auth/useLogin';
import { Toaster } from "@/components/ui/sonner"; // For shadcn toasts

function ZeroInitializer({ children }: { children: React.ReactNode }) {
  const z = useSyncExternalStore(
    zeroRef.onChange,
    useCallback(() => zeroRef.value, []),
  );

  if (!z) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <div>Loading Sync Engine...</div> {/* Or a proper spinner */}
        </div>
    );
  }

  return <ZeroProvider zero={z}>{children}</ZeroProvider>;
}

// Component to handle authentication checks and redirects
function AuthGuard({ children }: { children: React.ReactNode }) {
    const { loginState } = useLogin();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // If not logged in and not already on a public page (login/signup)
        if (!loginState && location.pathname !== '/login' && location.pathname !== '/signup') {
            console.log('AuthGuard: Not logged in, redirecting to /login');
            navigate('/login', { replace: true });
        }
        // If logged in and trying to access login/signup, redirect to home
        else if (loginState && (location.pathname === '/login' || location.pathname === '/signup')) {
            console.log('AuthGuard: Logged in, redirecting to / from public route');
            navigate('/', { replace: true });
        }
    }, [loginState, navigate, location.pathname]);

     // Avoid rendering children during the redirect phase after state change
    if (!loginState && location.pathname !== '/login' && location.pathname !== '/signup') {
        return null; // Or a loading indicator
    }
    if (loginState && (location.pathname === '/login' || location.pathname === '/signup')) {
        return null; // Or a loading indicator
    }


    return <>{children}</>;
}


export function RootLayout() {
  return (
    <LoginProvider> {/* Provides login state and logout */}
        <AuthGuard>  {/* Handles redirects based on auth state */}
            <ZeroInitializer> {/* Ensures Zero is ready before rendering protected content */}
                <Outlet /> {/* Renders the matched child route */}
                <Toaster /> {/* Renders toast notifications */}
            </ZeroInitializer>
        </AuthGuard>
    </LoginProvider>
  );
}