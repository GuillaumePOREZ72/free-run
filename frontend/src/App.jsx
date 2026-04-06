import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import RoutePlanner from './pages/RoutePlanner';
import LiveTracking from './pages/LiveTracking';
import RunDetail from './pages/RunDetail';
import Profile from './pages/Profile';
import AuthCallback from './pages/AuthCallback';
import './index.css';

function AppContent() {
  const location = useLocation();

  // Check URL fragment for session_id synchronously during render
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className="w-full min-h-screen flex flex-col bg-[#0A0A0A] relative md:border-x md:border-[#27272A] shadow-2xl">
      {!isAuthPage && (
        <ProtectedRoute>
          <Header />
        </ProtectedRoute>
      )}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/planner" element={<ProtectedRoute><RoutePlanner /></ProtectedRoute>} />
        <Route path="/tracking" element={<ProtectedRoute><LiveTracking /></ProtectedRoute>} />
        <Route path="/runs/:runId" element={<ProtectedRoute><RunDetail /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
