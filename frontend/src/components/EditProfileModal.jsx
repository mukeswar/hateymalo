import React, { useState, useEffect } from 'react';
import { X, UserPen, Camera, MapPin, Award, Heart, Upload, Link2, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Avatar from './ui/Avatar';

const EditProfileModal = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');
  const [interests, setInterests] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setProfilePicture(user.profilePicture || '');
      setLocation(user.location || '');
      setBio(user.bio || '');
      setSkills(user.skills ? user.skills.join(', ') : '');
      setInterests(user.interests ? user.interests.join(', ') : '');
    }
  }, [user, isOpen]);

  // Close on Escape and lock background scroll while open
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, loading, onClose]);

  if (!isOpen || !user) return null;

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('Image file size must be less than 5MB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicture(reader.result);
        showToast('Photo uploaded & ready to save!', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile({
        name,
        profilePicture,
        location,
        bio,
        skills,
        interests,
      });
      showToast('Profile updated successfully!', 'success');
      onClose();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const isDataUrl = profilePicture.startsWith('data:');

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/50 backdrop-blur-sm animate-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
        className="card !rounded-t-3xl !rounded-b-none sm:!rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto animate-pop"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur flex items-start justify-between gap-4 px-6 sm:px-8 pt-6 pb-4 border-b border-sand">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-full bg-brand-tint text-brand flex items-center justify-center shrink-0">
              <UserPen className="w-5 h-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="edit-profile-title" className="text-xl font-bold text-ink leading-tight">Edit your profile</h2>
              <p className="text-sm text-muted">This is what other members see on your public profile.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-muted hover:text-ink hover:bg-paper-deep transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 sm:px-8 py-6 space-y-6">
          {/* Photo */}
          <fieldset className="surface-sunken p-5">
            <legend className="sr-only">Profile photo</legend>
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="relative group shrink-0">
                <Avatar name={name || user.name} src={profilePicture} size="xl" className="ring-4 ring-white shadow-[var(--shadow-soft)]" />
                <label
                  htmlFor="profile-file-input"
                  className="absolute inset-0 rounded-full bg-ink/45 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white"
                  title="Change photo"
                >
                  <Camera className="w-7 h-7" aria-hidden="true" />
                  <span className="sr-only">Change photo</span>
                </label>
              </div>

              <div className="space-y-3 flex-1 w-full text-center sm:text-left">
                <p className="field-label !mb-0">Profile photo</p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <label htmlFor="profile-file-input" className="btn btn-primary btn-sm cursor-pointer">
                    <Upload className="w-4 h-4" aria-hidden="true" /> Upload a photo
                  </label>
                  <input
                    id="profile-file-input"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="sr-only"
                  />
                  {profilePicture && (
                    <button type="button" onClick={() => setProfilePicture('')} className="btn btn-ghost btn-sm">
                      <RotateCcw className="w-4 h-4" aria-hidden="true" /> Remove photo
                    </button>
                  )}
                </div>
                <p className="text-sm text-muted">PNG, JPG or WebP, up to 5 MB. Or paste a link to an image below.</p>

                <div className="relative">
                  <Link2 className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                  <label htmlFor="profile-photo-url" className="sr-only">Image URL</label>
                  <input
                    id="profile-photo-url"
                    type="url"
                    value={isDataUrl ? '' : profilePicture}
                    onChange={(e) => setProfilePicture(e.target.value)}
                    placeholder={isDataUrl ? 'Uploaded photo selected' : 'https://…'}
                    className="field pl-10"
                    autoComplete="photo"
                  />
                </div>
              </div>
            </div>
          </fieldset>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="ep-name" className="field-label">
                Full name <span className="text-brand" aria-hidden="true">*</span>
              </label>
              <input
                id="ep-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className="field"
              />
            </div>

            <div>
              <label htmlFor="ep-location" className="field-label flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-muted" aria-hidden="true" /> Location / district
              </label>
              <input
                id="ep-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Kathmandu, Nepal"
                autoComplete="address-level2"
                className="field"
              />
            </div>
          </div>

          <div>
            <label htmlFor="ep-bio" className="field-label">About you</label>
            <textarea
              id="ep-bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A few lines about yourself and how you like to help."
              className="field resize-y"
            />
          </div>

          <div>
            <label htmlFor="ep-skills" className="field-label flex items-center gap-1.5">
              <Award className="w-4 h-4 text-pine" aria-hidden="true" /> Skills
            </label>
            <input
              id="ep-skills"
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="e.g. First aid, Teaching, Cooking"
              aria-describedby="ep-skills-hint"
              className="field"
            />
            <p id="ep-skills-hint" className="text-sm text-muted mt-1.5">Separate each skill with a comma.</p>
          </div>

          <div>
            <label htmlFor="ep-interests" className="field-label flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-brand" aria-hidden="true" /> Causes you care about
            </label>
            <input
              id="ep-interests"
              type="text"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              placeholder="e.g. Tree plantation, Blood donation, Youth mentoring"
              aria-describedby="ep-interests-hint"
              className="field"
            />
            <p id="ep-interests-hint" className="text-sm text-muted mt-1.5">
              Separate with commas. Helps match you with help requests near you.
            </p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-5 border-t border-sand">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;
