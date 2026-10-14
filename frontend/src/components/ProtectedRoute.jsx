import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 bg-paper" role="status" aria-live="polite">
        <span className="w-10 h-10 rounded-full border-[3px] border-sand border-t-brand animate-spin" aria-hidden="true" />
        <span className="text-sm text-muted">Loading…</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
