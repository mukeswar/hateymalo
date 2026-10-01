import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import CommentSection from '../components/CommentSection';
import {
  BookOpen,
  Eye,
  Heart,
  Share2,
  Calendar,
  User,
  ArrowLeft,
  Check,
} from 'lucide-react';

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
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white border border-slate-200 shadow-md rounded-3xl text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Blog Story Not Found</h2>
        <Link to="/blogs" className="inline-block px-5 py-2.5 rounded-xl font-bold bg-teal-600 text-white text-xs">
          Back to Blogs
        </Link>
      </div>
    );
  }

  const { title, content, coverImage, category, author, reactions = [], views, createdAt } = blog;
  const hasReacted = user && reactions.some((r) => r._id === user._id || r === user._id);

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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Back Link */}
      <button
        onClick={() => navigate('/blogs')}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Community Stories
      </button>

      {/* Cover Image */}
      <div className="rounded-3xl overflow-hidden bg-white border border-slate-200 h-80 sm:h-96 relative shadow-md">
        <img
          src={coverImage || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80'}
          alt={title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 left-4">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/90 text-slate-900 shadow">
            {category}
          </span>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 space-y-8 border border-slate-200 shadow-md">
        
        {/* Header Metadata */}
        <div className="space-y-4 border-b border-slate-100 pb-6">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
            {title}
          </h1>

          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
            {author && (
              <div className="flex items-center gap-3">
                <img
                  src={author.profilePicture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                  alt={author.name}
                  className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                />
                <div>
                  <p className="font-bold text-slate-900 text-sm">{author.name}</p>
                  <p className="text-[11px] text-slate-500">Published on {new Date(createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-slate-600">
                <Eye className="w-4 h-4 text-teal-700" /> {views} views
              </span>

              {/* Reaction Button */}
              <button
                onClick={handleReactToggle}
                disabled={actionLoading}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                  hasReacted
                    ? 'bg-rose-600 text-white border-rose-500 shadow-md'
                    : 'bg-slate-100 text-rose-600 border-rose-200 hover:bg-rose-600 hover:text-white'
                }`}
              >
                <Heart className={`w-4 h-4 ${hasReacted ? 'fill-white' : 'fill-rose-600'}`} />
                <span>{reactions.length} Reactions</span>
              </button>

              {/* Share Button */}
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                <span>{copied ? 'Copied' : 'Share'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Story Text */}
        <div className="prose max-w-none text-slate-800 text-base sm:text-lg leading-relaxed space-y-4 whitespace-pre-line">
          {content}
        </div>

        {/* Author Footer Card */}
        {author && (
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-4">
            <img
              src={author.profilePicture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
              alt={author.name}
              className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shrink-0"
            />
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Written by {author.name}</h4>
              <p className="text-xs text-slate-500 mt-0.5">{author.bio || 'Community contributor on HAATEMALO.'}</p>
            </div>
          </div>
        )}

      </div>

      {/* Discussion Comments */}
      <CommentSection postId={id} />

    </div>
  );
};

export default BlogDetails;
