import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../services/api';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, ShieldCheck, ImageIcon, Send, PenLine, Lightbulb } from 'lucide-react';

const BLOG_CATEGORIES = [
  'Community Story',
  'Volunteer Experience',
  'Environment',
  'Education',
  'Social Impact',
  'Personal Reflection',
];

const isHttpUrl = (s) => /^https?:\/\/\S+$/i.test(s);

const CreateBlog = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(BLOG_CATEGORIES[0]);
  const [coverImage, setCoverImage] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !content) {
      showToast('Title and story content are required', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await API.post('/blogs', {
        title,
        category,
        coverImage: coverImage || undefined,
        content,
      });

      if (res.data.success) {
        showToast(res.data.message, 'success');
        navigate('/blogs');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Blog submission failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const showPreview = isHttpUrl(coverImage) && !previewFailed;

  return (
    <div className="container-page pt-6 sm:pt-8 pb-20">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link
          to="/blogs"
          className="inline-flex items-center gap-2 min-h-10 text-sm font-semibold text-ink-soft hover:text-brand transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> All stories
        </Link>

        {/* Header */}
        <div className="space-y-3 animate-rise">
          <span className="eyebrow">
            <PenLine className="w-4 h-4" aria-hidden="true" /> Write a story · <span className="deva normal-case tracking-normal">कथा लेख्नुहोस्</span>
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-ink leading-[1.08]">Tell us what happened</h1>
          <p className="text-muted text-lg leading-relaxed">
            A volunteer day, a neighbour who helped, a lesson from the field — write it the way you'd tell a friend.
          </p>
        </div>

        {/* Review note */}
        <div className="flex items-start gap-3 rounded-[var(--radius-card)] bg-sky-tint p-4 sm:p-5">
          <ShieldCheck className="w-5 h-5 text-sky-ink shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-ink-soft leading-relaxed">
            <strong className="font-semibold text-sky-ink">Reviewed before publishing. </strong>
            New stories are saved as <span className="font-semibold">pending</span> and appear in Stories once an administrator approves them.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card p-6 sm:p-8 space-y-6">
          <div>
            <label htmlFor="blog-title" className="field-label">
              Title <span className="text-brand" aria-hidden="true">*</span>
            </label>
            <input
              id="blog-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. What five weeks of cleaning the Bagmati taught me"
              className="field !text-lg font-display"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="blog-category" className="field-label">
                Category
              </label>
              <select
                id="blog-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="field cursor-pointer"
              >
                {BLOG_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="blog-cover" className="field-label">
                Cover image link <span className="font-normal text-muted">(optional)</span>
              </label>
              <input
                id="blog-cover"
                type="url"
                value={coverImage}
                onChange={(e) => {
                  setCoverImage(e.target.value);
                  setPreviewFailed(false);
                }}
                placeholder="https://…"
                aria-describedby="blog-cover-hint"
                className="field"
              />
              <p id="blog-cover-hint" className="mt-1.5 text-sm text-muted">
                Paste a link to a photo you have the right to share.
              </p>
            </div>
          </div>

          {/* Cover preview */}
          <div className="overflow-hidden rounded-2xl border border-dashed border-sand bg-paper aspect-[16/7] flex items-center justify-center">
            {showPreview ? (
              <img
                src={coverImage}
                alt="Cover image preview"
                onError={() => setPreviewFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="flex flex-col items-center gap-2 text-sm text-muted px-4 text-center">
                <ImageIcon className="w-6 h-6" aria-hidden="true" />
                {previewFailed ? "We couldn't load that image — check the link." : 'Your cover image preview will appear here'}
              </span>
            )}
          </div>

          <div>
            <div className="flex items-end justify-between gap-3">
              <label htmlFor="blog-content" className="field-label">
                Your story <span className="text-brand" aria-hidden="true">*</span>
              </label>
              <span className="mb-1.5 text-xs text-muted tabular-nums" aria-live="polite">
                {words} {words === 1 ? 'word' : 'words'}
              </span>
            </div>
            <textarea
              id="blog-content"
              required
              rows={14}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start with the moment it began…"
              aria-describedby="blog-content-hint"
              className="field !text-base leading-relaxed resize-y min-h-[16rem]"
            />
            <p id="blog-content-hint" className="mt-2 flex items-start gap-2 text-sm text-muted">
              <Lightbulb className="w-4 h-4 shrink-0 mt-0.5 text-marigold-text" aria-hidden="true" />
              Leave a blank line between paragraphs. Please don't share private details like phone numbers or home addresses.
            </p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-sand">
            <button type="button" onClick={() => navigate('/blogs')} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              <Send className="w-4 h-4" aria-hidden="true" /> {loading ? 'Submitting…' : 'Submit for review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateBlog;
