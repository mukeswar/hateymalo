import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home as HomeIcon, ArrowLeft, Search, HandHelping, Signpost } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const onSearch = (e) => {
    e.preventDefault();
    navigate(q.trim() ? `/search?query=${encodeURIComponent(q.trim())}` : '/search');
  };

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 grain opacity-60" aria-hidden="true" />
      <div className="container-page relative py-20 sm:py-28">
        <div className="max-w-xl mx-auto text-center space-y-6 animate-rise">
          <div className="relative mx-auto w-fit">
            <span className="font-display font-bold text-[7rem] sm:text-[9rem] leading-none text-paper-deep select-none" aria-hidden="true">
              404
            </span>
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="w-16 h-16 rounded-2xl bg-white border border-sand text-brand flex items-center justify-center shadow-[var(--shadow-lift)] animate-float">
                <Signpost className="w-8 h-8" aria-hidden="true" />
              </span>
            </span>
          </div>

          <div className="space-y-3">
            <span className="eyebrow deva justify-center">बाटो बिराइयो</span>
            <h1 className="text-4xl sm:text-5xl font-bold text-ink leading-tight">This path doesn't lead anywhere</h1>
            <p className="text-muted text-lg">
              The page may have moved or no longer exists. Let's get you back to the people and the help.
            </p>
          </div>

          <form role="search" onSubmit={onSearch} className="card !rounded-full p-1.5 flex items-center gap-2 max-w-md mx-auto">
            <Search className="w-5 h-5 text-muted ml-3 shrink-0" aria-hidden="true" />
            <label htmlFor="notfound-search" className="sr-only">Search Hateymalo</label>
            <input
              id="notfound-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search Hateymalo"
              className="w-full min-w-0 bg-transparent outline-none text-ink py-2 placeholder:text-[#9A8F84]"
            />
            <button type="submit" className="btn btn-primary btn-sm shrink-0 min-h-10">Search</button>
          </form>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link to="/" className="btn btn-primary">
              <HomeIcon className="w-4 h-4" aria-hidden="true" /> Back to home
            </Link>
            <Link to="/explore" className="btn btn-ghost">
              <HandHelping className="w-4 h-4" aria-hidden="true" /> Help requests
            </Link>
            <button type="button" onClick={() => navigate(-1)} className="btn btn-ghost">
              <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Go back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
