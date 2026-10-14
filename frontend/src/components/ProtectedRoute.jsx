import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 bg-paper" role="status" aria-live="polite">
        <span className="w-10 h-10 rounded-full border-[3px] border-sand border-t-brand animate-spin" aria-hidden="true" />
        <span className="text-sm text-muted">Loading…</span>
      </div>
    );
  }

  if (!user) {
    // Remember where they were going so Login can send them back
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
};

export default ProtectedRoute;
