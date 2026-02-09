import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/context/AuthProvider';
import { ThemeProvider } from '@/context/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/config/routes';
import { PageSpinner } from '@/components/ui/Spinner';

// Views
import { LoginView } from '@/views/auth/LoginView';
import { SignUpView } from '@/views/auth/SignUpView';
import { HomeView } from '@/views/home/HomeView';
import { DiscoverView } from '@/views/discover/DiscoverView';
import { ProfileView } from '@/views/profile/ProfileView';
import { SettingsView } from '@/views/profile/SettingsView';
import { EventDetailView } from '@/views/event/EventDetailView';
import { CreateEventView } from '@/views/event/CreateEventView';
import { NotificationsView } from '@/views/notifications/NotificationsView';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// Protected route wrapper - redirects to login if not authenticated
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageSpinner />;
  }

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <>{children}</>;
}

// Public route wrapper (redirects to home if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageSpinner />;
  }

  if (user) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return <>{children}</>;
}

// Optional auth route wrapper - allows both authenticated and unauthenticated access
// Just waits for auth state to resolve before rendering
function OptionalAuthRoute({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return <PageSpinner />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path={ROUTES.LOGIN}
        element={
          <PublicRoute>
            <LoginView />
          </PublicRoute>
        }
      />
      <Route
        path={ROUTES.SIGNUP}
        element={
          <PublicRoute>
            <SignUpView />
          </PublicRoute>
        }
      />

      {/* Protected routes */}
      <Route
        path={ROUTES.HOME}
        element={
          <ProtectedRoute>
            <HomeView />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.DISCOVER}
        element={
          <ProtectedRoute>
            <DiscoverView />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.PROFILE}
        element={
          <ProtectedRoute>
            <ProfileView />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.SETTINGS}
        element={
          <ProtectedRoute>
            <SettingsView />
          </ProtectedRoute>
        }
      />
      {/* Event detail is publicly viewable - uses auth gate for actions */}
      <Route
        path={ROUTES.EVENT_DETAIL}
        element={
          <OptionalAuthRoute>
            <EventDetailView />
          </OptionalAuthRoute>
        }
      />
      <Route
        path={ROUTES.CREATE_EVENT}
        element={
          <ProtectedRoute>
            <CreateEventView />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.NOTIFICATIONS}
        element={
          <ProtectedRoute>
            <NotificationsView />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}