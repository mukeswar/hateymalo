import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useToast } from '../context/ToastContext';
import { PlusCircle, ShieldAlert, Image, MapPin, Calendar, Users, FileText } from 'lucide-react';

// Fallback list used only if the categories API is unavailable.
const FALLBACK_CATEGORIES = [
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

const CreatePost = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(FALLBACK_CATEGORIES[0]);

  // Load only ACTIVE admin-managed categories so deactivated ones can't be selected.
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await API.get('/categories?activeOnly=true');
        if (res.data.success && res.data.data.length > 0) {
          const names = res.data.data.map((c) => c.name);
          setCategories(names);
          setCategory(names[0]);
        }
      } catch (err) {
        console.error('Failed to load categories:', err.message);
      }
    };
    loadCategories();
  }, []);
  const [location, setLocation] = useState('Kathmandu, Nepal');
  const [imageUrl, setImageUrl] = useState('');
  const [requiredMembers, setRequiredMembers] = useState(5);
  const [dateTime, setDateTime] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !description || !category || !location) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await API.post('/posts', {
        title,
        description,
        category,
        location,
        images: imageUrl ? [imageUrl] : undefined,
        requiredMembers: parseInt(requiredMembers) || 1,
        dateTime: dateTime ? new Date(dateTime) : undefined,
      });

      if (res.data.success) {
        showToast(res.data.message, 'success');
        navigate('/dashboard');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to create post', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 text-xs font-bold text-teal-700 uppercase tracking-widest">
          <PlusCircle className="w-4 h-4" /> Mutual Aid & Campaign
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Create Help or Collaboration Request</h1>
        <p className="text-sm text-slate-600">
          Publish a community initiative, request assistance, or start a local environmental campaign.
        </p>
      </div>

      {/* Admin Approval Notice Banner */}
      <div className="p-4 sm:p-5 rounded-2xl border border-sky-300 bg-sky-50 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm text-sky-900 leading-relaxed">
          <strong className="font-bold text-sky-900">Approval Workflow: </strong>
          To ensure platform safety and prevent commercial spam, your post will be set to <span className="underline font-semibold">PENDING</span> status and reviewed by an administrator before appearing publicly.
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl space-y-6 border border-slate-200 shadow-md">
        
        {/* Title */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Post Title <span className="text-teal-600">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Bagmati Riverbank Clean-up Drive this Saturday"
            className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-2xl p-4 text-sm text-slate-900 placeholder-slate-400 outline-none"
          />
        </div>

        {/* Category & Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Category <span className="text-teal-600">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-2xl p-4 text-sm text-slate-900 outline-none cursor-pointer"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-teal-600" /> Location <span className="text-teal-600">*</span>
            </label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Patan Durbar Square, Lalitpur"
              className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-2xl p-4 text-sm text-slate-900 placeholder-slate-400 outline-none"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-teal-600" /> Full Description <span className="text-teal-600">*</span>
          </label>
          <textarea
            required
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explain the background, goals, required tools, meeting spot, and how volunteers can participate..."
            className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-2xl p-4 text-sm text-slate-900 placeholder-slate-400 outline-none"
          />
        </div>

        {/* Image URL & Members & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          
          <div className="sm:col-span-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Image className="w-3.5 h-3.5 text-teal-600" /> Image URL (Optional)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-2xl p-4 text-sm text-slate-900 placeholder-slate-400 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-teal-600" /> Volunteers Needed
            </label>
            <input
              type="number"
              min={1}
              value={requiredMembers}
              onChange={(e) => setRequiredMembers(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-2xl p-4 text-sm text-slate-900 outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-teal-600" /> Scheduled Date & Time
            </label>
            <input
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-2xl p-4 text-sm text-slate-900 outline-none"
            />
          </div>

        </div>

        {/* Submit */}
        <div className="pt-4 flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3.5 rounded-2xl text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3.5 rounded-2xl text-sm font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xl transition-all disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Post for Review'}
          </button>
        </div>

      </form>

    </div>
  );
};

export default CreatePost;
