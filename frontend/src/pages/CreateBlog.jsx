import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useToast } from '../context/ToastContext';
import { BookOpen, ShieldAlert, Image, FileText, Send } from 'lucide-react';

const BLOG_CATEGORIES = [
  'Community Story',
  'Volunteer Experience',
  'Environment',
  'Education',
  'Social Impact',
  'Personal Reflection',
];

const CreateBlog = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(BLOG_CATEGORIES[0]);
  const [coverImage, setCoverImage] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 text-xs font-bold text-teal-700 uppercase tracking-widest">
          <BookOpen className="w-4 h-4" /> Share Community Voices
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Write & Submit Blog Story</h1>
        <p className="text-sm text-slate-600">
          Share your volunteer journey, community reflection, or environmental campaign insights.
        </p>
      </div>

      {/* Approval Banner */}
      <div className="p-5 rounded-2xl border border-sky-300 bg-sky-50 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm text-sky-900 leading-relaxed">
          <strong className="font-bold text-sky-900">Approval Workflow: </strong>
          Submitted blog stories are set to <span className="underline font-semibold">PENDING</span> status and reviewed by an administrator before appearing publicly in the blog directory.
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl space-y-6 border border-slate-200 shadow-md">
        
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Blog Title <span className="text-teal-600">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., What 5 Weeks of Bagmati Cleaning Taught Me About Community Unity"
            className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 rounded-2xl p-4 text-sm text-slate-900 outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 rounded-2xl p-4 text-sm text-slate-900 outline-none cursor-pointer"
            >
              {BLOG_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Image className="w-3.5 h-3.5 text-teal-600" /> Cover Image URL (Optional)
            </label>
            <input
              type="url"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 rounded-2xl p-4 text-sm text-slate-900 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-teal-600" /> Full Story Content <span className="text-teal-600">*</span>
          </label>
          <textarea
            required
            rows={10}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your story here in detail..."
            className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 rounded-2xl p-4 text-sm text-slate-900 outline-none"
          />
        </div>

        <div className="flex justify-end gap-4 pt-2">
          <button
            type="button"
            onClick={() => navigate('/blogs')}
            className="px-6 py-3.5 rounded-2xl text-sm font-semibold text-slate-600 bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3.5 rounded-2xl text-sm font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xl transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Send className="w-4 h-4" /> {loading ? 'Submitting...' : 'Submit Story for Review'}
          </button>
        </div>

      </form>

    </div>
  );
};

export default CreateBlog;
