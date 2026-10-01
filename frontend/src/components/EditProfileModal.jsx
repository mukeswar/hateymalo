import React, { useState, useEffect } from 'react';
import { X, UserCheck, Camera, Sparkles, MapPin, AlignLeft, Award, Heart, Upload, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-[#C8382C] flex items-center justify-center border border-rose-200 shadow-xs">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Edit Public Profile</h3>
              <p className="text-xs text-slate-500">Upload profile picture and update bio, skills, and interests</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          
          {/* Avatar Upload & Live Preview Section */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Profile Photo Selection
            </label>

            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="relative group shrink-0">
                <img
                  src={profilePicture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80'}
                  alt={name}
                  className="w-24 h-24 rounded-2xl object-cover border-2 border-[#C8382C] shadow-md"
                />
                <label
                  htmlFor="profile-file-input"
                  className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center cursor-pointer text-white"
                  title="Change Photo"
                >
                  <Camera className="w-7 h-7" />
                </label>
              </div>

              <div className="space-y-2 flex-1 w-full text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <label
                    htmlFor="profile-file-input"
                    className="px-4 py-2.5 rounded-xl font-bold bg-[#C8382C] hover:bg-[#b02e23] text-white text-xs shadow-sm cursor-pointer inline-flex items-center gap-2 transition-all hover:scale-102"
                  >
                    <Upload className="w-4 h-4" /> Upload Image from Computer / Phone
                  </label>
                  <input
                    id="profile-file-input"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  {profilePicture && (
                    <button
                      type="button"
                      onClick={() => setProfilePicture('')}
                      className="px-3 py-2.5 rounded-xl font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs transition-colors"
                    >
                      Reset Photo
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-500">
                  Select any PNG, JPG, or WebP photo from your device. You can also paste an image URL below.
                </p>

                <div className="pt-2 border-t border-slate-200/80">
                  <input
                    type="url"
                    value={profilePicture}
                    onChange={(e) => setProfilePicture(e.target.value)}
                    placeholder="Or paste image URL (https://...)"
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Name <span className="text-[#C8382C]">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#C8382C] rounded-xl p-3 text-xs text-slate-900 outline-none font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" /> Location / District
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Kathmandu, Nepal"
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#C8382C] rounded-xl p-3 text-xs text-slate-900 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <AlignLeft className="w-3.5 h-3.5 text-slate-500" /> Bio / About Me
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell the community about yourself, your passion, and how you'd like to collaborate..."
              className="w-full bg-slate-50 border border-slate-200 focus:border-[#C8382C] rounded-xl p-3 text-xs text-slate-900 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-teal-600" /> Skills (comma separated)
            </label>
            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="e.g., First Aid, Teaching, Event Organizing, Web Development, Cooking"
              className="w-full bg-slate-50 border border-slate-200 focus:border-[#C8382C] rounded-xl p-3 text-xs text-slate-900 outline-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">Separate each skill with a comma to render as community badges.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Heart className="w-3.5 h-3.5 text-rose-600" /> Community Interests (comma separated)
            </label>
            <input
              type="text"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              placeholder="e.g., Tree Plantation, Blood Donation, Youth Mentoring, Clean Drive"
              className="w-full bg-slate-50 border border-slate-200 focus:border-[#C8382C] rounded-xl p-3 text-xs text-slate-900 outline-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">Helps match you with relevant volunteer help requests near you.</p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#C8382C] hover:bg-[#b02e23] text-white shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading ? 'Saving Profile...' : 'Save Profile Changes'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;
