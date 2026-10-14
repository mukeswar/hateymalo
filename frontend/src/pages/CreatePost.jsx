import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { PlusCircle, ShieldCheck, ImageIcon, MapPin, CalendarDays, Users, FileText, Tag, Info } from 'lucide-react';

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

const StepHeading = ({ n, title, hint }) => (
  <div className="flex items-start gap-4">
    <span className="w-9 h-9 shrink-0 rounded-full bg-brand-tint text-brand font-display font-bold flex items-center justify-center">
      {n}
    </span>
    <div>
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      {hint && <p className="text-sm text-muted">{hint}</p>}
    </div>
  </div>
);

const CreatePost = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { settings } = useSettings();
  // Mirrors the backend: member posts go to the moderation queue unless the
  // Super Admin has turned "Require post approval" off.
  const needsApproval = settings ? settings.requirePostApproval !== false : true;

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
  const [previewFailed, setPreviewFailed] = useState(false);

  useEffect(() => {
    setPreviewFailed(false);
  }, [imageUrl]);

  const showPreview = /^https?:\/\/\S+$/i.test(imageUrl.trim()) && !previewFailed;

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
    <div className="pb-20">
      {/* Header */}
      <header className="container-page pt-10 sm:pt-14 pb-8">
        <div className="max-w-3xl mx-auto">
          <p className="eyebrow">
            <PlusCircle className="w-4 h-4" aria-hidden="true" /> New request
            <span className="deva normal-case tracking-normal font-semibold text-ink-soft">· सहयोग माग्नुहोस्</span>
          </p>
          <h1 className="mt-3 text-4xl sm:text-5xl font-bold text-ink">Ask the community for a hand</h1>
          <p className="mt-3 text-muted text-lg">
            Share what you need or the drive you're organising. A clear title, a place and a little context help people say yes.
          </p>
        </div>
      </header>

      <div className="container-page">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Moderation notice — only when the platform requires approval */}
          {needsApproval && (
            <div className="rounded-[var(--radius-card)] bg-sky-tint p-4 sm:p-5 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-sky-ink shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-sm text-ink-soft leading-relaxed">
                <strong className="font-semibold text-ink">A moderator reviews every request first.</strong>{' '}
                Your post will show as <em>pending</em> until it's approved — this keeps the platform safe and free of spam.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="card p-6 sm:p-8 space-y-10">
            {/* Step 1 */}
            <fieldset className="space-y-5">
              <legend className="w-full mb-5">
                <StepHeading n={1} title="What do you need?" hint="Lead with the action, e.g. who, what and when." />
              </legend>

              <div>
                <label htmlFor="cp-title" className="field-label">
                  Title <span className="text-brand" aria-hidden="true">*</span>
                </label>
                <input
                  id="cp-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Bagmati riverbank clean-up this Saturday"
                  className="field"
                />
              </div>

              <div>
                <label htmlFor="cp-category" className="field-label flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-muted" aria-hidden="true" /> Cause <span className="text-brand" aria-hidden="true">*</span>
                </label>
                <select
                  id="cp-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="field cursor-pointer"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-sm text-muted">Helps people who care about this cause find your request.</p>
              </div>

              <div>
                <label htmlFor="cp-description" className="field-label flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-muted" aria-hidden="true" /> Description <span className="text-brand" aria-hidden="true">*</span>
                </label>
                <textarea
                  id="cp-description"
                  required
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="The background, what helpers will do, anything to bring, and where to meet…"
                  className="field leading-relaxed"
                  aria-describedby="cp-description-hint"
                />
                <p id="cp-description-hint" className="mt-1.5 text-sm text-muted">
                  Tip: mention any tools, skills or timing helpers should know about.
                </p>
              </div>
            </fieldset>

            {/* Step 2 */}
            <fieldset className="space-y-5 pt-8 border-t border-sand">
              <legend className="w-full mb-5">
                <StepHeading n={2} title="Where, when and how many?" />
              </legend>

              <div>
                <label htmlFor="cp-location" className="field-label flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-muted" aria-hidden="true" /> Location <span className="text-brand" aria-hidden="true">*</span>
                </label>
                <input
                  id="cp-location"
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Patan Durbar Square, Lalitpur"
                  className="field"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-5">
                <div>
                  <label htmlFor="cp-members" className="field-label flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-muted" aria-hidden="true" /> Helpers needed
                  </label>
                  <input
                    id="cp-members"
                    type="number"
                    min={1}
                    value={requiredMembers}
                    onChange={(e) => setRequiredMembers(e.target.value)}
                    className="field"
                  />
                </div>

                <div>
                  <label htmlFor="cp-datetime" className="field-label flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 text-muted" aria-hidden="true" /> Date & time
                  </label>
                  <input
                    id="cp-datetime"
                    type="datetime-local"
                    value={dateTime}
                    onChange={(e) => setDateTime(e.target.value)}
                    className="field"
                  />
                  <p className="mt-1.5 text-sm text-muted">Optional — leave blank if it's flexible.</p>
                </div>
              </div>
            </fieldset>

            {/* Step 3 */}
            <fieldset className="space-y-5 pt-8 border-t border-sand">
              <legend className="w-full mb-5">
                <StepHeading n={3} title="Add a photo" hint="Optional, but a real photo of the place or need helps a lot." />
              </legend>

              <div>
                <label htmlFor="cp-image" className="field-label flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-muted" aria-hidden="true" /> Image URL
                </label>
                <input
                  id="cp-image"
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://…"
                  className="field"
                />
              </div>

              {imageUrl.trim() && (
                <div className="surface-sunken overflow-hidden aspect-[16/9] flex items-center justify-center">
                  {showPreview ? (
                    <img
                      src={imageUrl.trim()}
                      alt="Preview of your photo"
                      onError={() => setPreviewFailed(true)}
                      className="w-full h-full object-cover animate-in"
                    />
                  ) : (
                    <p className="flex items-center gap-2 px-6 text-sm text-muted text-center">
                      <Info className="w-4 h-4 shrink-0" aria-hidden="true" />
                      We can't preview this link yet. Check it's a direct link to an image.
                    </p>
                  )}
                </div>
              )}
            </fieldset>

            {/* Submit */}
            <div className="pt-6 border-t border-sand flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
              <button type="button" onClick={() => navigate('/dashboard')} className="btn btn-ghost">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn btn-primary btn-lg">
                {loading ? 'Submitting…' : needsApproval ? 'Submit for review' : 'Publish request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreatePost;
