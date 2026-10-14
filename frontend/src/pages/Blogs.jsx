import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import Avatar from '../components/ui/Avatar';
import { Reveal } from '../components/ui/motion';
import { BookOpen, Eye, Heart, PenLine, Sparkles, ArrowRight, Search, Clock } from 'lucide-react';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=70';
const CATEGORIES = ['All', 'Community Story', 'Volunteer Experience', 'Environment', 'Education', 'Social Impact'];

const plain = (s = '') => s.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
const readMinutes = (s = '') => Math.max(1, Math.round(plain(s).split(' ').filter(Boolean).length / 200));
const formatDate = (d) => {
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const Byline = ({ blog, light = false }) => (
  <div className={`flex items-center gap-2.5 min-w-0 text-sm ${light ? 'text-white/90' : 'text-muted'}`}>
    {blog.author && <Avatar name={blog.author.name} src={blog.author.profilePicture} size="sm" />}
    <span className="min-w-0">
      <span className={`block font-semibold truncate ${light ? 'text-white' : 'text-ink-soft'}`}>{blog.author?.name || 'Community member'}</span>
      <span className="block text-xs">
        {formatDate(blog.createdAt)} · {readMinutes(blog.content)} min read
      </span>
    </span>
  </div>
);

const Stats = ({ blog, light = false }) => (
  <span className={`flex items-center gap-3 text-xs shrink-0 ${light ? 'text-white/85' : 'text-muted'}`}>
    <span className="flex items-center gap-1" title={`${blog.views || 0} views`}>
      <Eye className="w-3.5 h-3.5" aria-hidden="true" /> {blog.views || 0}
    </span>
    <span className="flex items-center gap-1" title={`${blog.reactions?.length || 0} reactions`}>
      <Heart className="w-3.5 h-3.5" aria-hidden="true" /> {blog.reactions?.length || 0}
    </span>
  </span>
);

const LeadStory = ({ blog }) => (
  <Link
    to={`/blogs/${blog._id}`}
    className="group card card-hover overflow-hidden grid lg:grid-cols-12 focus-visible:!outline-offset-4"
  >
    <div className="relative lg:col-span-7 aspect-[16/10] lg:aspect-auto lg:min-h-[26rem] overflow-hidden bg-paper-deep">
      <img
        src={blog.coverImage || FALLBACK_IMAGE}
        alt=""
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.04]"
      />
    </div>
    <div className="lg:col-span-5 p-6 sm:p-8 lg:p-10 flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5">
        {blog.isFeatured && (
          <span className="chip bg-marigold-tint text-marigold-text">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" /> Featured story
          </span>
        )}
        {blog.category && <span className="chip bg-paper-deep text-ink-soft">{blog.category}</span>}
      </div>
      <h2 className="text-3xl sm:text-4xl font-bold text-ink leading-[1.1] group-hover:text-brand transition-colors">
        {blog.title}
      </h2>
      <p className="text-muted text-base sm:text-lg leading-relaxed line-clamp-4">{plain(blog.content)}</p>
      <div className="mt-auto pt-5 border-t border-sand flex items-center justify-between gap-3">
        <Byline blog={blog} />
        <Stats blog={blog} />
      </div>
      <span className="inline-flex items-center gap-1.5 font-semibold text-ink group-hover:text-brand transition-colors">
        Read the story <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
      </span>
    </div>
  </Link>
);

const StoryCard = ({ blog }) => (
  <Link
    to={`/blogs/${blog._id}`}
    className="group card card-hover h-full overflow-hidden flex flex-col focus-visible:!outline-offset-4"
  >
    <div className="relative aspect-[3/2] w-full overflow-hidden bg-paper-deep">
      <img
        src={blog.coverImage || FALLBACK_IMAGE}
        alt=""
        loading="lazy"
        className="w-full h-full object-cover transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.04]"
      />
      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
        {blog.isFeatured && (
          <span className="chip bg-marigold-tint text-marigold-text shadow-sm">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" /> Featured
          </span>
        )}
        {blog.category && <span className="chip bg-white/95 text-ink shadow-sm">{blog.category}</span>}
      </div>
    </div>
    <div className="p-5 sm:p-6 flex flex-col gap-3 flex-grow">
      <h3 className="font-display text-xl font-semibold text-ink leading-snug line-clamp-2 group-hover:text-brand transition-colors">
        {blog.title}
      </h3>
      <p className="text-sm text-muted leading-relaxed line-clamp-3">{plain(blog.content)}</p>
      <div className="mt-auto pt-4 border-t border-sand flex items-center justify-between gap-3">
        <Byline blog={blog} />
        <Stats blog={blog} />
      </div>
    </div>
  </Link>
);

const Blogs = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (category && category !== 'All') params.append('category', category);

      const res = await API.get(`/blogs?${params.toString()}`);
      if (res.data.success) {
        setBlogs(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch blogs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, [category]);

  // Search previously had no way to run; submitting the search form now re-fetches.
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchBlogs();
  };

  // Lead with a featured story when there is one, otherwise the newest story.
  const lead = blogs.find((b) => b.isFeatured) || blogs[0];
  const rest = lead ? blogs.filter((b) => b._id !== lead._id) : [];

  return (
    <div className="pb-20">
      {/* Masthead */}
      <header className="bg-paper-deep/60 border-b border-sand grain">
        <div className="container-page pt-10 sm:pt-14 pb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl space-y-3 animate-rise">
              <span className="eyebrow">
                <BookOpen className="w-4 h-4" aria-hidden="true" /> Stories · <span className="deva normal-case tracking-normal">कथाहरू</span>
              </span>
              <h1 className="text-4xl sm:text-5xl font-bold text-ink leading-[1.08]">Stories from hand to hand</h1>
              <p className="text-muted text-lg leading-relaxed">
                First-hand accounts of mutual aid, volunteering and community work, written by people across Nepal.
              </p>
            </div>
            <Link to="/create-blog" className="btn btn-primary self-start md:self-auto">
              <PenLine className="w-4 h-4" aria-hidden="true" /> Write a story
            </Link>
          </div>

          {/* Search + categories */}
          <div className="mt-8 flex flex-col lg:flex-row lg:items-center gap-4">
            <form onSubmit={handleSearchSubmit} role="search" className="relative w-full lg:w-80 shrink-0">
              <label htmlFor="story-search" className="sr-only">Search stories</label>
              <Search className="w-4 h-4 text-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              <input
                id="story-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search stories, press Enter"
                className="field !rounded-full !pl-10"
              />
            </form>
            <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto">
              <div role="tablist" aria-label="Filter stories by category" className="flex items-center gap-2 pb-1 w-max">
                {CATEGORIES.map((cat) => {
                  const active = category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setCategory(cat)}
                      className={`min-h-10 px-4 rounded-full text-sm font-semibold whitespace-nowrap transition-all border ${
                        active ? 'bg-ink text-white border-ink' : 'bg-white text-ink-soft border-sand hover:border-ink'
                      }`}
                    >
                      {cat === 'All' ? 'All stories' : cat}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container-page pt-10 space-y-12">
        {loading ? (
          <div className="space-y-8" aria-busy="true" aria-label="Loading stories">
            <div className="h-80 lg:h-[26rem] bg-paper-deep animate-pulse rounded-[var(--radius-card)]" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-80 bg-paper-deep animate-pulse rounded-[var(--radius-card)]" />
              ))}
            </div>
          </div>
        ) : lead ? (
          <>
            <Reveal>
              <LeadStory blog={lead} />
            </Reveal>

            {rest.length > 0 && (
              <section aria-labelledby="more-stories" className="space-y-6">
                <div className="flex items-center gap-4">
                  <h2 id="more-stories" className="text-2xl font-bold text-ink shrink-0">More stories</h2>
                  <span className="h-px flex-1 bg-sand" aria-hidden="true" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rest.map((blog, i) => (
                    <Reveal key={blog._id} delay={(i % 3) * 80} className="h-full">
                      <StoryCard blog={blog} />
                    </Reveal>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <div className="card p-10 sm:p-14 text-center max-w-xl mx-auto space-y-4">
            <span className="mx-auto w-14 h-14 rounded-full bg-paper-deep flex items-center justify-center">
              <Clock className="w-6 h-6 text-muted" aria-hidden="true" />
            </span>
            <h2 className="text-2xl font-bold text-ink">No stories here yet</h2>
            <p className="text-muted">
              {search || category !== 'All'
                ? 'Nothing matches your search or filter. Try another category, or be the one to write it.'
                : 'Every community has stories worth telling. Yours could be the first one here.'}
            </p>
            <Link to="/create-blog" className="btn btn-primary">
              <PenLine className="w-4 h-4" aria-hidden="true" /> Write a story
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Blogs;
