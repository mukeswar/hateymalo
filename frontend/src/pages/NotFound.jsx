import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Compass, Home as HomeIcon, ArrowLeft, Search } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center space-y-8">
      <div className="space-y-3">
        <div className="w-20 h-20 rounded-3xl bg-rose-50 text-[#C8382C] flex items-center justify-center border border-rose-200 mx-auto">
          <Compass className="w-10 h-10" />
        </div>
        <p className="text-6xl font-black text-slate-900 tracking-tight">404</p>
        <h1 className="text-2xl font-extrabold text-slate-900">Page Not Found</h1>
        <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
          The page you're looking for doesn't exist, may have been moved, or the content is no longer available.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="px-5 py-3 rounded-2xl text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200 flex items-center gap-2 transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
        <Link
          to="/"
          className="px-5 py-3 rounded-2xl text-sm font-bold terracotta-btn flex items-center gap-2 shadow-lg"
        >
          <HomeIcon className="w-4 h-4" /> Back to Home
        </Link>
        <Link
          to="/explore"
          className="px-5 py-3 rounded-2xl text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200 flex items-center gap-2 transition-all"
        >
          <Search className="w-4 h-4" /> Explore Community
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
