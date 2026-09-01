import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { Analytics } from '@vercel/analytics/react';
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation, useNavigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { appClient } from '@/api/appClient';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import AnalyticsTracker from '@/components/AnalyticsTracker';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import Home from '@/pages/Home';
import Dashboard from '@/pages/Dashboard';
import Events from '@/pages/Events';
import Hubs from '@/pages/Hubs';
import HubDetail from '@/pages/HubDetail';
import AdminMaster from '@/pages/AdminMaster';
import HubAdmin from '@/pages/HubAdmin';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
// Add page imports here

const AuthRecoveryRedirect = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const hasRecoveryHash = window.location.hash.includes('type=recovery');
    const hasRecoveryQuery = new URLSearchParams(location.search).get('type') === 'recovery';
    if ((hasRecoveryHash || hasRecoveryQuery) && location.pathname !== '/reset-password') {
      navigate(`/reset-password${location.search}${window.location.hash}`, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    const { data } = appClient.supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password', { replace: true });
      }
    });

    return () => data.subscription.unsubscribe();
  }, [navigate]);

  return null;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/events" element={<Events />} />
        <Route path="/hubs" element={<Hubs />} />
        <Route path="/hubs/:hubId" element={<HubDetail />} />
      </Route>
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/admin" element={<AdminMaster />} />
        <Route path="/admin/hub/:hubId" element={<HubAdmin />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthRecoveryRedirect />
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <Analytics />
        <AnalyticsTracker />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
