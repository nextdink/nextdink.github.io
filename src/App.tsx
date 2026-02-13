import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useSearchParams,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthProvider";
import { ThemeProvider } from "@/context/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/config/routes";
import { PageSpinner } from "@/components/ui/Spinner";

// Views
import { LoginView } from "@/views/auth/LoginView";
import { SignUpView } from "@/views/auth/SignUpView";
import { HomeView } from "@/views/home/HomeView";
import { ProfileView } from "@/views/profile/ProfileView";
import { SettingsView } from "@/views/profile/SettingsView";
import { EventDetailView } from "@/views/event/EventDetailView";
import { CreateEventView } from "@/views/event/CreateEventView";
import { EditEventView } from "@/views/event/EditEventView";
import { NotificationsView } from "@/views/notifications/NotificationsView";
import { ListsView } from "@/views/list/ListsView";
import { ListDetailView } from "@/views/list/ListDetailView";
import { CreateListView } from "@/views/list/CreateListView";

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

// Public route wrapper (redirects to return URL or home if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();

  if (loading) {
    return <PageSpinner />;
  }

  if (user) {
    // Check for redirect parameter and navigate there, otherwise go home
    const redirectUrl = searchParams.get("redirect");
    const destination = redirectUrl
      ? decodeURIComponent(redirectUrl)
      : ROUTES.HOME;
    return <Navigate to={destination} replace />;
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
        path={ROUTES.LISTS}
        element={
          <ProtectedRoute>
            <ListsView />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.LIST_DETAIL}
        element={
          <ProtectedRoute>
            <ListDetailView />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.CREATE_LIST}
        element={
          <ProtectedRoute>
            <CreateListView />
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
        path={ROUTES.EDIT_EVENT}
        element={
          <ProtectedRoute>
            <EditEventView />
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
          <HashRouter>
            <AppRoutes />
          </HashRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
