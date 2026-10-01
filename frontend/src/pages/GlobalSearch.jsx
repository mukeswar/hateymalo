import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import API from '../services/api';
import PostCard from '../components/PostCard';
import VerificationBadge from '../components/VerificationBadge';
import {
  Search,
  Calendar,
  BookOpen,
  Users,
  Building2,
  Filter,
  ArrowRight,
  MapPin,
  Clock,
  Heart,
  Eye,
} from 'lucide-react';

const GlobalSearch = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('query') || searchParams.get('search') || '';

  const [query, setQuery] = useState(initialQuery);
  const [entityType, setEntityType] = useState('ALL');
  const [category, setCategory] = useState('All');
  const [location, setLocation] = useState('');
  const [results, setResults] = useState({
    posts: [],
    events: [],
    blogs: [],
    members: [],
    organizations: [],
  });
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const performSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.append('query', query);
      if (entityType) params.append('entityType', entityType);
      if (category && category !== 'All') params.append('category', category);
      if (location) params.append('location', location);

      const res = await API.get(`/search?${params.toString()}`);
      if (res.data.success) {
        setResults(res.data.data);
        setTotalCount(res.data.count);
      }
    } catch (error) {
      console.error('Global search error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    performSearch();
  }, [entityType, category]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setSearchParams({ query });
    performSearch();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Header & Search Bar */}
      <div className="space-y-4 max-w-4xl mx-auto text-center">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Universal Search Engine</h1>
        <p className="text-sm text-slate-600">Search across posts, official assemblies, blog stories, members, and NGOs across Nepal.</p>

        <form onSubmit={handleFormSubmit} className="bg-white p-3 rounded-3xl border border-slate-200 shadow-lg flex items-center gap-2">
          <Search className="w-5 h-5 text-slate-400 ml-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search keywords, locations, skills, NGOs, events..."
            className="w-full bg-transparent text-slate-900 text-sm outline-none px-2 placeholder-slate-400"
          />
          <button type="submit" className="px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md">
            Search
          </button>
        </form>
      </div>

      {/* Entity Filters Bar */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 pb-3">
        {[
          { key: 'ALL', label: `All Results (${totalCount})` },
          { key: 'POSTS', label: `Help & Posts (${results.posts.length})` },
          { key: 'EVENTS', label: `Official Events (${results.events.length})` },
          { key: 'BLOGS', label: `Blog Stories (${results.blogs.length})` },
          { key: 'MEMBERS', label: `Members (${results.members.length})` },
          { key: 'ORGANIZATIONS', label: `Organizations (${results.organizations.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setEntityType(tab.key)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              entityType === tab.key
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SEARCH RESULTS */}
      {loading ? (
        <div className="h-64 rounded-3xl animate-pulse bg-slate-200" />
      ) : totalCount > 0 ? (
        <div className="space-y-10">

          {/* 1. Posts */}
          {(entityType === 'ALL' || entityType === 'POSTS') && results.posts.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-teal-700">Community Help & Posts</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {results.posts.map((post) => (
                  <PostCard key={post._id} post={post} />
                ))}
              </div>
            </div>
          )}

          {/* 2. Official Events */}
          {(entityType === 'ALL' || entityType === 'EVENTS') && results.events.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-sky-700">Official Assemblies & Events</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {results.events.map((ev) => (
                  <div key={ev._id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-md space-y-3 flex flex-col justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-teal-800 border border-teal-200">{ev.category}</span>
                      <h4 className="font-bold text-slate-900 text-base line-clamp-1">{ev.title}</h4>
                      <p className="text-xs text-slate-600 line-clamp-2">{ev.description}</p>
                    </div>
                    <Link to={`/events/${ev._id}`} className="py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-teal-600 hover:text-white text-slate-800 text-center border border-slate-200 block">
                      View Event
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Blogs */}
          {(entityType === 'ALL' || entityType === 'BLOGS') && results.blogs.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-700">Community Blog Stories</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {results.blogs.map((b) => (
                  <Link key={b._id} to={`/blogs/${b._id}`} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-md space-y-3 flex flex-col justify-between hover:border-amber-300">
                    <div>
                      <h4 className="font-bold text-slate-900 text-base line-clamp-2">{b.title}</h4>
                      <p className="text-xs text-slate-600 mt-1">By {b.author?.name}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 4. Members */}
          {(entityType === 'ALL' || entityType === 'MEMBERS') && results.members.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-purple-700">Community Members</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {results.members.map((m) => (
                  <div key={m._id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-md flex items-center gap-3">
                    <img src={m.profilePicture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'} alt={m.name} className="w-10 h-10 rounded-xl object-cover" />
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1">
                        {m.name} <VerificationBadge level={m.memberLevel} isVerified={m.isVerified} showLabel={false} />
                      </h4>
                      <p className="text-[10px] text-slate-600">{m.location}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Organizations */}
          {(entityType === 'ALL' || entityType === 'ORGANIZATIONS') && results.organizations.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-700">Verified Organizations & NGOs</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {results.organizations.map((org) => (
                  <div key={org._id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-md space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold border border-emerald-200">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          {org.orgDetails?.orgName || org.name} <VerificationBadge level="ORGANIZATION" isVerified={true} />
                        </h4>
                        <p className="text-xs text-emerald-700">{org.orgDetails?.orgType || 'Community Organization'}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600">{org.orgDetails?.description || org.bio}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      ) : (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-2">
          <p className="text-slate-600 text-sm">No results found matching your search query.</p>
        </div>
      )}

    </div>
  );
};

export default GlobalSearch;
