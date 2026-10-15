import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import CommentSection from '../components/CommentSection';
import AdSlot from '../components/ads/AdSlot';
import Avatar from '../components/ui/Avatar';
import { Reveal } from '../components/ui/motion';
import { BookOpen, Eye, Heart, Share2, ArrowLeft, Check, PenLine } from 'lucide-react';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1600&q=70';

const readMinutes = (s = '') =>
  Math.max(1, Math.round(s.replace(/<[^>]*>?/gm, ' ').split(/\s+/).filter(Boolean).length / 200));

const BlogDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchBlog = async () => {
    try {
      const res = await API.get(`/blogs/${id}`);
      if (res.data.success) {
        setBlog(res.data.data);
      }
    } catch (error) {
      showToast('Failed to load blog details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlog();
  }, [id]);

  if (loading) {
    return (
      <div className="container-page pt-8 pb-20" aria-busy="true" aria-label="Loading story">
        <div className="max-w-[68ch] mx-auto space-y-4">
          <div className="h-5 w-32 bg-paper-deep animate-pulse rounded-full" />
          <div className="h-12 w-full bg-paper-deep animate-pulse rounded-2xl" />
          <div className="h-12 w-3/4 bg-paper-deep animate-pulse rounded-2xl" />
        </div>
        <div className="mt-8 max-w-5xl mx-auto h-72 sm:h-[28rem] bg-paper-deep animate-pulse rounded-[var(--radius-card)]" />
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="container-page py-20">
        <div className="card max-w-md mx-auto p-10 text-center space-y-4">
          <span className="mx-auto w-14 h-14 rounded-full bg-paper-deep flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-muted" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold text-ink">We couldn't find this story</h1>
          <p className="text-muted">It may have been removed or is still waiting for review.</p>
          <Link to="/blogs" className="btn btn-primary">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to stories
          </Link>
        </div>
      </div>
    );
  }

  const { title, content, coverImage, category, author, reactions = [], views, createdAt } = blog;
  const hasReacted = user && reactions.some((r) => r._id === user._id || r === user._id);
  const published = new Date(createdAt);
  const publishedLabel = Number.isNaN(published.getTime())
    ? ''
    : published.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const handleReactToggle = async () => {
    if (!user) {
      showToast('Please log in to react to stories', 'info');
      navigate('/login');
      return;
    }

    setActionLoading(true);
    try {
      const res = await API.post(`/blogs/${id}/react`);
      if (res.data.success) {
        showToast(res.data.message, 'success');
        fetchBlog();
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Reaction failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    showToast('Blog link copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 3000);
  };

  const renderActions = (className = "") => (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={handleReactToggle}
        disabled={actionLoading}
        aria-pressed={!!hasReacted}
        className={`btn btn-sm min-h-10 ${hasReacted ? 'bg-brand text-white hover:bg-brand-dark' : 'btn-ghost'}`}
      >
        <Heart className={`w-4 h-4 ${hasReacted ? 'fill-white' : 'text-brand'}`} aria-hidden="true" />
        {reactions.length} {reactions.length === 1 ? 'Reaction' : 'Reactions'}
      </button>
      <button type="button" onClick={handleShare} className="btn btn-sm btn-ghost min-h-10">
        {copied ? <Check className="w-4 h-4 text-pine" aria-hidden="true" /> : <Share2 className="w-4 h-4" aria-hidden="true" />}
        {copied ? 'Link copied' : 'Share'}
      </button>
    </div>
  );

  return (
    <article className="pb-20">
      {/* Title block */}
      <header className="container-page pt-6 sm:pt-8">
        <div className="max-w-[68ch] mx-auto space-y-6 animate-rise">
          <button
            type="button"
            onClick={() => navigate('/blogs')}
            className="inline-flex items-center gap-2 min-h-10 text-sm font-semibold text-ink-soft hover:text-brand transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> All stories
          </button>

          <div className="space-y-4">
            {category && <span className="eyebrow">{category}</span>}
            <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-bold text-ink leading-[1.08]">{title}</h1>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-sand">
            <div className="flex items-center gap-3 min-w-0">
              {author && <Avatar name={author.name} src={author.profilePicture} size="md" />}
              <div className="min-w-0">
                <p className="font-semibold text-ink truncate">{author?.name || 'Community member'}</p>
                <p className="text-sm text-muted">
                  {publishedLabel && <>{publishedLabel} · </>}
                  {readMinutes(content)} min read ·{' '}
                  <span className="inline-flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" aria-hidden="true" /> {views} views
                  </span>
                </p>
              </div>
            </div>
            {renderActions()}
          </div>
        </div>
      </header>

      {/* Cover */}
      <div className="container-page mt-8">
        <figure className="max-w-5xl mx-auto overflow-hidden rounded-[var(--radius-card)] bg-paper-deep shadow-[var(--shadow-soft)] aspect-[16/9] animate-in">
          <img src={coverImage || FALLBACK_IMAGE} alt="" className="w-full h-full object-cover" />
        </figure>
      </div>

      {/* Story body */}
      <div className="container-page mt-10 sm:mt-14">
        <div className="max-w-[68ch] mx-auto">
          <div className="text-ink-soft text-lg sm:text-[1.22rem] leading-[1.85] whitespace-pre-line break-words first-letter:font-display first-letter:text-6xl first-letter:font-bold first-letter:text-brand first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:leading-[0.85]">
            {content}
          </div>

          <div className="mt-12 pt-6 border-t border-sand flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted">Did this story move you? Let the author know.</p>
            {renderActions()}
          </div>

          {/* Author card */}
          {author && (
            <Reveal className="mt-8 surface-sunken p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center gap-5">
              <Avatar name={author.name} src={author.profilePicture} size="lg" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Written by</p>
                <p className="font-display text-xl font-bold text-ink">{author.name}</p>
                <p className="text-sm text-ink-soft mt-1">{author.bio || 'Community contributor on HATEYMALO.'}</p>
              </div>
              <Link to="/create-blog" className="btn btn-ghost btn-sm min-h-10 self-start sm:self-center">
                <PenLine className="w-4 h-4" aria-hidden="true" /> Write your own
              </Link>
            </Reveal>
          )}

          {/* Sponsored, below the story (nothing when no ad is served) */}
          <AdSlot placement="content.footer" layout="wide" category={category} className="mt-12" />

          {/* Discussion */}
          <div className="mt-12">
            <CommentSection postId={id} />
          </div>
        </div>
      </div>
    </article>
  );
};

export default BlogDetails;
