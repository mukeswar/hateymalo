import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import API from '../services/api';
import PostCard from '../components/PostCard';
import Avatar from '../components/ui/Avatar';
import {
  Search,
  CalendarDays,
  BookOpen,
  Users,
  Building2,
  HandHelping,
  ArrowRight,
  MapPin,
  BadgeCheck,
  SearchX,
  LayoutGrid,
} from 'lucide-react';

const SectionTitle = ({ icon: Icon, title, count, tone }) => (
  <div className="flex items-center gap-3 mb-5">
    <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${tone}`}>
      <Icon className="w-5 h-5" aria-hidden="true" />
    </span>
    <h2 className="text-2xl font-semibold text-ink">{title}</h2>
    <span className="chip bg-paper-deep text-ink-soft">{count}</span>
  </div>
);

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

  const tabs = [
    { key: 'ALL', label: 'All', icon: LayoutGrid, count: totalCount },
    { key: 'POSTS', label: 'Help requests', icon: HandHelping, count: results.posts.length },
    { key: 'EVENTS', label: 'Events', icon: CalendarDays, count: results.events.length },
    { key: 'BLOGS', label: 'Stories', icon: BookOpen, count: results.blogs.length },
    { key: 'MEMBERS', label: 'Members', icon: Users, count: results.members.length },
    { key: 'ORGANIZATIONS', label: 'Organisations', icon: Building2, count: results.organizations.length },
  ];

  const show = (key, list) => (entityType === 'ALL' || entityType === key) && list.length > 0;

  return (
    <div className="pb-20">
      {/* Header & search */}
      <header className="relative overflow-hidden border-b border-sand bg-paper-deep/60">
        <div className="absolute inset-0 grain opacity-60" aria-hidden="true" />
        <div className="container-page relative pt-10 sm:pt-14 pb-8">
          <div className="max-w-3xl mx-auto text-center space-y-3 animate-rise">
            <span className="eyebrow deva justify-center">खोज्नुहोस्</span>
            <h1 className="text-4xl sm:text-5xl font-bold text-ink leading-[1.08]">Find people, help and stories</h1>
            <p className="text-muted text-lg">Search help requests, events, stories, members and organisations across Nepal.</p>
          </div>

          <form
            role="search"
            onSubmit={handleFormSubmit}
            className="mt-8 max-w-3xl mx-auto card !rounded-full p-1.5 sm:p-2 flex items-center gap-2 focus-within:ring-4 focus-within:ring-brand/10 focus-within:border-brand transition-shadow"
          >
            <Search className="w-5 h-5 text-muted ml-3 sm:ml-4 shrink-0" aria-hidden="true" />
            <label htmlFor="global-search-input" className="sr-only">Search Hateymalo</label>
            <input
              id="global-search-input"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Keywords, places, skills, organisations…"
              className="w-full min-w-0 bg-transparent text-ink text-base sm:text-lg outline-none py-2.5 placeholder:text-[#9A8F84]"
            />
            <button type="submit" className="btn btn-primary shrink-0">
              Search
            </button>
          </form>
        </div>

        {/* Tabs */}
        <div className="container-page relative">
          <div className="flex gap-1 overflow-x-auto -mb-px max-w-full" role="tablist" aria-label="Filter results by type">
            {tabs.map(({ key, label, icon: Icon, count }) => {
              const active = entityType === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setEntityType(key)}
                  className={`inline-flex items-center gap-2 px-4 min-h-12 border-b-2 text-sm font-semibold whitespace-nowrap transition-colors ${
                    active ? 'border-brand text-ink' : 'border-transparent text-muted hover:text-ink'
                  }`}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  {label}
                  <span className={`text-xs tabular-nums rounded-full px-1.5 ${active ? 'bg-brand-tint text-brand' : 'bg-white/70 text-muted'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Results */}
      <section className="container-page pt-10" aria-live="polite" aria-busy={loading}>
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-64 bg-paper-deep animate-pulse rounded-[var(--radius-card)]" />
            ))}
          </div>
        ) : totalCount > 0 ? (
          <div className="space-y-14">
            {/* Posts */}
            {show('POSTS', results.posts) && (
              <div>
                <SectionTitle icon={HandHelping} title="Help requests" count={results.posts.length} tone="bg-brand-tint text-brand" />
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {results.posts.map((post) => (
                    <PostCard key={post._id} post={post} />
                  ))}
                </div>
              </div>
            )}

            {/* Events */}
            {show('EVENTS', results.events) && (
              <div>
                <SectionTitle icon={CalendarDays} title="Events" count={results.events.length} tone="bg-sky-tint text-sky-ink" />
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {results.events.map((ev) => (
                    <Link key={ev._id} to={`/events/${ev._id}`} className="card card-hover p-6 flex flex-col group">
                      {ev.category && <span className="chip bg-sky-tint text-sky-ink self-start mb-3">{ev.category}</span>}
                      <h3 className="text-lg font-semibold text-ink leading-snug line-clamp-2 group-hover:text-brand transition-colors">{ev.title}</h3>
                      {ev.description && <p className="text-sm text-muted line-clamp-2 mt-2">{ev.description}</p>}
                      <span className="mt-auto pt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
                        View event <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Blogs */}
            {show('BLOGS', results.blogs) && (
              <div>
                <SectionTitle icon={BookOpen} title="Stories" count={results.blogs.length} tone="bg-marigold-tint text-marigold-text" />
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {results.blogs.map((b) => (
                    <Link key={b._id} to={`/blogs/${b._id}`} className="card card-hover p-6 flex flex-col group">
                      <h3 className="text-lg font-semibold text-ink leading-snug line-clamp-2 group-hover:text-brand transition-colors">{b.title}</h3>
                      {b.author?.name && (
                        <div className="mt-auto pt-4 flex items-center gap-2 text-sm text-muted">
                          <Avatar name={b.author.name} src={b.author.profilePicture} size="xs" />
                          <span className="truncate">By {b.author.name}</span>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Members */}
            {show('MEMBERS', results.members) && (
              <div>
                <SectionTitle icon={Users} title="Members" count={results.members.length} tone="bg-pine-tint text-pine" />
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.members.map((m) => (
                    <Link key={m._id} to={`/profile/${m._id}`} className="card card-hover p-4 flex items-center gap-3 group">
                      <Avatar name={m.name} src={m.profilePicture} size="md" />
                      <div className="min-w-0">
                        <h3 className="font-semibold text-ink flex items-center gap-1.5 group-hover:text-brand transition-colors">
                          <span className="truncate">{m.name}</span>
                          {m.isVerified && <BadgeCheck className="w-4 h-4 text-pine shrink-0" aria-label="Verified" />}
                        </h3>
                        {m.location && (
                          <p className="text-sm text-muted flex items-center gap-1 truncate">
                            <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> {m.location}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Organisations */}
            {show('ORGANIZATIONS', results.organizations) && (
              <div>
                <SectionTitle icon={Building2} title="Organisations" count={results.organizations.length} tone="bg-sky-tint text-sky-ink" />
                <div className="grid md:grid-cols-2 gap-5">
                  {results.organizations.map((org) => {
                    const name = org.orgDetails?.orgName || org.name;
                    const description = org.orgDetails?.description || org.bio;
                    return (
                      <Link key={org._id} to={`/profile/${org._id}`} className="card card-hover p-5 flex gap-4 group">
                        <Avatar name={name} src={org.profilePicture} size="lg" rounded="rounded-2xl" />
                        <div className="min-w-0 space-y-1.5">
                          <h3 className="text-lg font-semibold text-ink leading-snug group-hover:text-brand transition-colors">{name}</h3>
                          <div className="flex flex-wrap gap-2">
                            <span className="chip bg-sky-tint text-sky-ink">{org.orgDetails?.orgType || 'Organisation'}</span>
                            {org.isVerified && (
                              <span className="chip bg-pine-tint text-pine">
                                <BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" /> Verified
                              </span>
                            )}
                          </div>
                          {description && <p className="text-sm text-muted line-clamp-2">{description}</p>}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="card p-10 sm:p-14 text-center max-w-xl mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-paper-deep text-ink-soft flex items-center justify-center mx-auto">
              <SearchX className="w-7 h-7" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-semibold text-ink">Nothing found{query ? ` for “${query}”` : ''}</h2>
            <p className="text-muted">Try a shorter word, a nearby place, or a different category.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/explore" className="btn btn-primary">Browse help requests</Link>
              <Link to="/members" className="btn btn-ghost">See members</Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default GlobalSearch;
