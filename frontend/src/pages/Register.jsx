import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { HeartHandshake, UserPlus, Mail, Lock, MapPin, Image, FileText, ArrowRight, Ban, ShieldCheck, Eye, EyeOff } from 'lucide-react';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [profilePicture, setProfilePicture] = useState('');
  const [location, setLocation] = useState('Kathmandu, Nepal');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');
  const [interests, setInterests] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const { showToast } = useToast();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const registrationsClosed = settings && settings.allowRegistrations === false;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (registrationsClosed) {
      showToast('Registration is currently disabled by the administrators.', 'error');
      return;
    }
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail || !password) {
      showToast('Please fill required fields (Name, Email, Password)', 'error');
      return;
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters long.', 'error');
      return;
    }

    setLoading(true);
    try {
      await register({
        name: cleanName,
        email: cleanEmail,
        password,
        profilePicture: profilePicture.trim() || undefined,
        location: location.trim(),
        bio: bio.trim(),
        skills: skills.trim(),
        interests: interests.trim(),
      });
      showToast('Account created successfully! Welcome to HAATEMALO.', 'success');
      navigate('/dashboard');
    } catch (error) {
      showToast(error.response?.data?.message || 'Registration failed. Please check inputs.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-xl space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <Link to="/" className="inline-block">
            <img src="/logo.png" alt="हातेमालो (HAATEMALO)" className="h-16 mx-auto w-auto object-contain" />
          </Link>
          <h2 className="text-2xl font-black text-slate-900">Join HAATEMALO Community</h2>
          <p className="text-xs text-slate-500 font-medium">"मद्दत मागौँ। सहयोग गरौँ। सँगै परिवर्तन ल्याऔँ।"</p>
        </div>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-teal-50/90 border border-teal-200 text-teal-900 text-xs font-bold shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
          <span>Protected Registration • 256-Bit SSL Data Encryption</span>
        </div>

        {registrationsClosed && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900">
            <Ban className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Registration is currently closed</p>
              <p className="text-xs mt-0.5">New account sign-ups have been temporarily disabled by the administrators. Please check back later.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className={`space-y-6 ${registrationsClosed ? 'opacity-40 pointer-events-none select-none' : ''}`}>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Full Name <span className="text-teal-600">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sita Shrestha"
                className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-2xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Email Address <span className="text-teal-600">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sita@example.com"
                className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-2xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Password <span className="text-teal-600">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-2xl pl-4 pr-11 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-700 transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-teal-600" /> Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Lalitpur, Nepal"
                className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-2xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Image className="w-3.5 h-3.5 text-teal-600" /> Profile Picture URL (Optional)
            </label>
            <input
              type="url"
              value={profilePicture}
              onChange={(e) => setProfilePicture(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-2xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-teal-600" /> Bio / About You
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Share your interests, skills, or why you want to support community drives..."
              className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-2xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Skills (comma separated)
              </label>
              <input
                type="text"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="e.g., Teaching, First Aid, Gardening"
                className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-2xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Interests (comma separated)
              </label>
              <input
                type="text"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                placeholder="e.g., Cleaning, Plantation, Youth Tutoring"
                className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-2xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || registrationsClosed}
            className="w-full py-4 px-4 rounded-2xl font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-base"
          >
            {loading ? 'Creating Account...' : 'Complete Registration'} <ArrowRight className="w-5 h-5" />
          </button>

        </form>

        <div className="text-center pt-2">
          <p className="text-xs text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-teal-700 hover:underline">
              Log In
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default Register;
