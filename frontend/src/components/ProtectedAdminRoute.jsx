import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedAdminRoute = ({ children }) => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 bg-paper" role="status" aria-live="polite">
        <span className="w-10 h-10 rounded-full border-[3px] border-sand border-t-brand animate-spin" aria-hidden="true" />
        <span className="text-sm text-muted">Loading…</span>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedAdminRoute;
