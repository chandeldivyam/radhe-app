// frontend/src/routes/index.tsx
import { createBrowserRouter } from 'react-router-dom';
import { RootLayout } from './RootLayout';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { SignupPage } from '@/features/auth/pages/SignupPage';
import UserListPage from '@/features/users/pages/UserListPage'; // Adjust path
import { MainLayout } from '@/components/layout/MainLayout';
import { ThemeProvider } from "@/components/theme-provider";

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
            index: true, // Matches '/' path when inside MainLayout
            element: <UserListPage />,
          },
          {
            path: 'activity',
            element: <div>Activity Page</div>,
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