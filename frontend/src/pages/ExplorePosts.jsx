import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import API from '../services/api';
import PostCard from '../components/PostCard';
import { Search, Filter, MapPin, RefreshCw, Compass } from 'lucide-react';

const FALLBACK_CATEGORY_OPTIONS = [
  'All',
  'Help Request',
  'Education Support',
  'Assignment Guidance',
  'Writing Support',
  'Cleaning Campaign',
  'Street Cleaning',
  'Tree Plantation',
  'Social Help',
  'Community Activity',
  'Awareness Campaign',
  'Project Collaboration',
  'Other',
];

const ExplorePosts = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [posts, setPosts] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState(FALLBACK_CATEGORY_OPTIONS);
  const [loading, setLoading] = useState(true);

  // Load active admin-managed categories so the filter reflects real categories.
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await API.get('/categories?activeOnly=true');
        if (res.data.success && res.data.data.length > 0) {
          setCategoryOptions(['All', ...res.data.data.map((c) => c.name)]);
        }
      } catch (err) {
        console.error('Failed to load categories:', err.message);
      }
    };
    loadCategories();
  }, []);

  // Filters state initialized from URL search params
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'All');
  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [sort, setSort] = useState('newest');

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (category && category !== 'All') params.append('category', category);
      if (location) params.append('location', location);
      if (sort) params.append('sort', sort);

      const res = await API.get(`/posts?${params.toString()}`);
      if (res.data.success) {
        setPosts(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch public posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [category, sort]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPosts();
  };

  const handleClearFilters = () => {
    setSearch('');
    setCategory('All');
    setLocation('');
    setSort('newest');
    setSearchParams({});
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-teal-700 font-bold text-xs uppercase tracking-widest">
          <Compass className="w-4 h-4" /> Community Explorer
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900">
          Explore Public Help & Collaboration Opportunities
        </h1>
        <p className="text-slate-600 text-sm max-w-2xl">
          Browse verified community requests, educational assistance, tree planting drives, and cleaning campaigns across Nepal.
        </p>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white p-6 rounded-3xl space-y-4 border border-slate-200 shadow-md">
        
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Keyword Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search keyword..."
              className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none"
            />
          </div>

          {/* Location Search */}
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location (e.g. Patan, Pokhara)..."
              className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none"
            />
          </div>

          {/* Sort selector */}
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-xl px-3 py-2.5 text-sm text-slate-900 outline-none cursor-pointer"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 rounded-xl transition-all shadow-md text-sm flex items-center justify-center gap-1.5"
            >
              <Filter className="w-4 h-4" /> Filter
            </button>
            <button
              type="button"
              onClick={handleClearFilters}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200"
              title="Reset Filters"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

        </form>

        {/* Category Pills Slider */}
        <div className="pt-2 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categoryOptions.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setCategory(cat);
                setSearchParams(cat === 'All' ? {} : { category: cat });
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                category === cat
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

      </div>

      {/* Posts Count & Status */}
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>Showing <strong className="text-slate-900">{posts.length}</strong> approved public posts</span>
        {category !== 'All' && (
          <span className="text-teal-700">Filtered by: <strong>{category}</strong></span>
        )}
      </div>

      {/* Posts Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-80 rounded-2xl animate-pulse bg-slate-200" />
          ))}
        </div>
      ) : posts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {posts.map((post) => (
            <PostCard key={post._id} post={post} />
          ))}
        </div>
      ) : (
        <div className="bg-white p-16 rounded-3xl border border-slate-200 text-center space-y-4 max-w-lg mx-auto">
          <p className="text-lg font-bold text-slate-900">No posts match your filters</p>
          <p className="text-sm text-slate-600">
            Try searching with different keywords or reset category filters.
          </p>
          <button
            onClick={handleClearFilters}
            className="px-5 py-2.5 rounded-xl font-bold bg-teal-600 text-white text-sm"
          >
            Clear Filters
          </button>
        </div>
      )}

    </div>
  );
};

export default ExplorePosts;
