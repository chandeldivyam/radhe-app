// frontend/src/routes/index.tsx
import { createBrowserRouter } from 'react-router-dom';
import { RootLayout } from './RootLayout';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { SignupPage } from '@/features/auth/pages/SignupPage';
import UserListPage from '@/features/users/pages/UserListPage'; // Adjust path

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />, // Root layout contains auth checks and providers
    children: [
      {
        index: true, // Matches the root path '/'
        element: <UserListPage />, // Protected route content
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'signup',
        element: <SignupPage />,
      },
      // Add other protected routes here as children of RootLayout
      // {
      //   path: 'dashboard',
      //   element: <DashboardPage />
      // }
      {
         path: '*', // Catch-all for 404 Not Found
         element: <div>Page Not Found</div>, // Replace with a proper 404 component
      }
    ],
  },
]);