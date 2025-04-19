// frontend/src/routes/index.tsx
import { createBrowserRouter, Navigate } from 'react-router-dom'; // Import Navigate
import { RootLayout } from './RootLayout';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { SignupPage } from '@/features/auth/pages/SignupPage';
import UserListPage from '@/features/users/pages/UserListPage';
import HomePage from '@/features/notes/pages/HomePage';
import { NoteViewer } from '@/features/notes/components/NoteViewer'; // Import NoteViewer
import { MainLayout } from '@/components/layout/MainLayout';
import { ThemeProvider } from "@/components/theme-provider";

// Placeholder component for the initial state when no note is selected
function SelectNotePlaceholder() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center text-muted-foreground">
      <p>Select a note from the list</p>
      <p>or create a new one.</p>
    </div>
  );
}


export const router = createBrowserRouter([
  {
    path: '/',
    element: <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme"><RootLayout /></ThemeProvider>,
    children: [
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'signup',
        element: <SignupPage />,
      },
      {
        element: <MainLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/notes" replace />,
          },
          {
            // Notes Feature Parent Route
            path: 'notes',
            element: <HomePage />, // HomePage now renders NoteList + Outlet
            children: [
              {
                index: true, // Rendered when path is exactly '/notes'
                element: <SelectNotePlaceholder />,
              },
              {
                path: ':noteId', // Rendered for '/notes/some-id'
                element: <NoteViewer />,
              },
            ],
          },
          {
            path: 'activity',
            element: <div>Activity Page</div>,
          },
          {
            path: 'settings',
            element: <UserListPage />,
          },
        ]
      },
      {
         path: '*', // Catch-all for 404 Not Found
         element: <div>Page Not Found</div>, // Replace with a proper 404 component
      }
    ],
  },
]);