import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import API from '../services/api';
import PostCard from '../components/PostCard';
import AdSlot from '../components/ads/AdSlot';
import { Search, MapPin, RotateCcw, SlidersHorizontal, X, HandHeart, PlusCircle } from 'lucide-react';

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
  // Bumped to force a refetch (e.g. after clearing filters when category/sort did not change).
  const [reloadKey, setReloadKey] = useState(0);

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

  // Keep the category in sync when the URL changes while this page is already mounted
  // (e.g. following a /explore?category=... link from the navbar or another page).
  useEffect(() => {
    setCategory(searchParams.get('category') || 'All');
  }, [searchParams]);

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
  }, [category, sort, reloadKey]);

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
    setReloadKey((k) => k + 1);
  };

  const selectCategory = (cat) => {
    setCategory(cat);
    setSearchParams(cat === 'All' ? {} : { category: cat });
  };

  const hasActiveFilters = !!search || !!location || category !== 'All' || sort !== 'newest';

  return (
    <div className="pb-20">
      {/* Header */}
      <header className="container-page pt-10 sm:pt-14 pb-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="max-w-2xl">
            <p className="eyebrow">
              <HandHeart className="w-4 h-4" aria-hidden="true" /> Help Requests
              <span className="deva normal-case tracking-normal font-semibold text-ink-soft">· सहयोग अनुरोध</span>
            </p>
            <h1 className="mt-3 text-4xl sm:text-5xl font-bold text-ink">Find a way to lend a hand</h1>
            <p className="mt-3 text-muted text-lg">
              Browse requests from neighbours, students and community groups across Nepal — then join in where you can help.
            </p>
          </div>
          <Link to="/create-post" className="btn btn-ghost self-start md:self-auto">
            <PlusCircle className="w-4 h-4" aria-hidden="true" /> Ask for help
          </Link>
        </div>
      </header>

      {/* Filter bar (sticky under the navbar on desktop) */}
      <div className="lg:sticky lg:top-[72px] z-30 bg-paper/90 backdrop-blur-md border-y border-sand">
        <div className="container-page py-4 space-y-3">
          <form onSubmit={handleSearchSubmit} role="search" aria-label="Filter help requests" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_auto_auto] gap-3">
            <div className="relative">
              <label htmlFor="explore-search" className="sr-only">Search keyword</label>
              <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              <input
                id="explore-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by keyword…"
                className="field !pl-10"
              />
            </div>

            <div className="relative">
              <label htmlFor="explore-location" className="sr-only">Location</label>
              <MapPin className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              <input
                id="explore-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Location, e.g. Patan, Pokhara"
                className="field !pl-10"
              />
            </div>

            <div className="relative">
              <label htmlFor="explore-sort" className="sr-only">Sort order</label>
              <SlidersHorizontal className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              <select
                id="explore-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="field !pl-10 cursor-pointer"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary flex-1">
                <Search className="w-4 h-4" aria-hidden="true" /> Search
              </button>
              <button
                type="button"
                onClick={handleClearFilters}
                className="btn btn-ghost !px-3.5"
                title="Reset filters"
                aria-label="Reset all filters"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </form>

          {/* Category chips */}
          <div
            className="-mx-4 px-4 sm:mx-0 sm:px-0 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="group"
            aria-label="Filter by cause"
          >
            {categoryOptions.map((cat) => {
              const active = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => selectCategory(cat)}
                  aria-pressed={active}
                  className={`shrink-0 min-h-[40px] px-4 rounded-full text-sm font-semibold whitespace-nowrap border transition-all duration-200 ${
                    active
                      ? 'bg-ink text-white border-ink shadow-[var(--shadow-soft)]'
                      : 'bg-white text-ink-soft border-sand hover:border-ink hover:text-ink'
                  }`}
                >
                  {cat === 'All' ? 'All causes' : cat}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="container-page pt-8 space-y-6">
        {/* Result summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted" aria-live="polite">
          <span>
            {loading ? (
              'Looking for requests…'
            ) : (
              <>
                Showing <strong className="text-ink">{posts.length}</strong> {posts.length === 1 ? 'request' : 'requests'}
              </>
            )}
          </span>
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              {category !== 'All' && (
                <button type="button" onClick={() => selectCategory('All')} className="chip bg-brand-tint text-brand hover:bg-brand hover:text-white transition-colors">
                  {category} <X className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="sr-only">Remove cause filter</span>
                </button>
              )}
              <button type="button" onClick={handleClearFilters} className="text-sm font-semibold text-brand hover:text-brand-dark underline-offset-4 hover:underline">
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Posts grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-hidden="true">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="card overflow-hidden">
                <div className="aspect-[4/3] bg-paper-deep animate-pulse" />
                <div className="p-5 space-y-3">
                  <div className="h-5 w-3/4 bg-paper-deep animate-pulse rounded-full" />
                  <div className="h-4 w-full bg-paper-deep animate-pulse rounded-full" />
                  <div className="h-4 w-2/3 bg-paper-deep animate-pulse rounded-full" />
                  <div className="h-2 w-full bg-paper-deep animate-pulse rounded-full mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post, i) => (
              <React.Fragment key={post._id}>
                <div className="animate-rise" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
                  <PostCard post={post} />
                </div>
                {/* Sponsored card after every 6th request (nothing when no ad is served) */}
                {(i + 1) % 6 === 0 && <AdSlot placement="feed.inline" layout="card" category={category} className="h-full" />}
              </React.Fragment>
            ))}
          </div>
        ) : (
          <div className="card max-w-lg mx-auto p-10 sm:p-14 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-paper-deep text-brand flex items-center justify-center">
              <Search className="w-6 h-6" aria-hidden="true" />
            </div>
            <h2 className="mt-5 text-2xl font-semibold text-ink">No requests match yet</h2>
            <p className="mt-2 text-muted">
              Try a different keyword or place, or browse every cause. New requests are added by the community all the time.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={handleClearFilters} className="btn btn-primary">
                <RotateCcw className="w-4 h-4" aria-hidden="true" /> Clear filters
              </button>
              <Link to="/create-post" className="btn btn-ghost">Ask for help</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExplorePosts;
