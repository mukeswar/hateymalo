import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { MapPin, Image, ArrowRight, Ban, Eye, EyeOff, AlertCircle, Mail, User, Lock } from 'lucide-react';

const PANEL_IMAGE = 'https://images.unsplash.com/photo-1763733595228-7d0a3e35dbad?auto=format&fit=crop&w=1200&q=75';

// Desktop-only photo panel beside the form
const PhotoPanel = () => (
  <aside className="hidden lg:block relative overflow-hidden rounded-[2rem] min-h-[40rem] bg-night lg:sticky lg:top-24 lg:self-start lg:h-[calc(100dvh-8rem)]" aria-hidden="true">
    <img src={PANEL_IMAGE} alt="" className="absolute inset-0 w-full h-full object-cover" />
    <div className="absolute inset-0 bg-gradient-to-t from-night/85 via-night/25 to-transparent" />
    <div className="absolute inset-x-0 bottom-0 p-10 text-white">
      <p className="deva font-display text-2xl xl:text-[1.75rem] font-semibold leading-snug">हातेमालो — हात मिलाऔँ।</p>
      <p className="mt-2 text-white/85 text-lg">Neighbours helping neighbours, hand in hand.</p>
    </div>
  </aside>
);

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
  const [formError, setFormError] = useState('');

  const { register } = useAuth();
  const { showToast } = useToast();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const registrationsClosed = settings && settings.allowRegistrations === false;

  const fail = (msg) => {
    setFormError(msg);
    showToast(msg, 'error');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (registrationsClosed) {
      fail('Registration is currently disabled by the administrators.');
      return;
    }
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail || !password) {
      fail('Please fill required fields (Name, Email, Password)');
      return;
    }

    if (password.length < 6) {
      fail('Password must be at least 6 characters long.');
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
      showToast('Account created successfully! Welcome to HATEYMALO.', 'success');
      navigate('/dashboard');
    } catch (error) {
      fail(error.response?.data?.message || 'Registration failed. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-page py-8 sm:py-12">
      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 xl:gap-16">
        <div className="flex justify-center">
          <div className="w-full max-w-xl animate-rise">
            <p className="eyebrow deva">हातेमालोमा स्वागत छ</p>
            <h1 className="mt-2 text-4xl sm:text-5xl font-bold text-ink">Join the community</h1>
            <p className="mt-3 text-muted text-lg">
              Create a free account to ask for help, offer your time, and join drives near you.
            </p>

            {registrationsClosed && (
              <div role="status" className="mt-6 flex items-start gap-3 p-4 rounded-2xl bg-marigold-tint border border-marigold/40 text-ink">
                <Ban className="w-5 h-5 shrink-0 mt-0.5 text-marigold-text" aria-hidden="true" />
                <div>
                  <p className="font-semibold">Registration is currently closed</p>
                  <p className="text-sm text-ink-soft mt-0.5">
                    New sign-ups have been paused by the administrators. Please check back later.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8">
              <fieldset disabled={registrationsClosed} className={`space-y-6 ${registrationsClosed ? 'opacity-50 select-none' : ''}`}>
                {formError && (
                  <div role="alert" className="flex items-start gap-2.5 rounded-2xl bg-brand-tint text-brand-dark border border-brand/20 px-4 py-3 text-sm font-medium">
                    <AlertCircle className="w-[18px] h-[18px] shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{formError}</span>
                  </div>
                )}

                <section className="space-y-5" aria-labelledby="reg-account">
                  <h2 id="reg-account" className="text-lg font-semibold text-ink">Your account</h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="reg-name" className="field-label">
                        Full name <span className="text-brand" aria-hidden="true">*</span>
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                        <input
                          id="reg-name"
                          name="name"
                          type="text"
                          required
                          autoComplete="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your full name"
                          className="field pl-10"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="reg-email" className="field-label">
                        Email address <span className="text-brand" aria-hidden="true">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                        <input
                          id="reg-email"
                          name="email"
                          type="email"
                          required
                          autoComplete="email"
                          inputMode="email"
                          autoCapitalize="none"
                          spellCheck={false}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="field pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="reg-password" className="field-label">
                      Password <span className="text-brand" aria-hidden="true">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                      <input
                        id="reg-password"
                        name="new-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        autoComplete="new-password"
                        aria-describedby="reg-password-hint"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Choose a password"
                        className="field pl-10 pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-muted hover:text-ink hover:bg-paper-deep transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showPassword}
                        aria-controls="reg-password"
                      >
                        {showPassword ? <EyeOff className="w-[18px] h-[18px]" aria-hidden="true" /> : <Eye className="w-[18px] h-[18px]" aria-hidden="true" />}
                      </button>
                    </div>
                    <p id="reg-password-hint" className="text-sm text-muted mt-1.5">At least 6 characters.</p>
                  </div>
                </section>

                <section className="space-y-5 pt-6 border-t border-sand" aria-labelledby="reg-about">
                  <div>
                    <h2 id="reg-about" className="text-lg font-semibold text-ink">About you</h2>
                    <p className="text-sm text-muted">Optional — you can fill these in later from your profile.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="reg-location" className="field-label flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-muted" aria-hidden="true" /> Location
                      </label>
                      <input
                        id="reg-location"
                        name="location"
                        type="text"
                        autoComplete="address-level2"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g. Lalitpur, Nepal"
                        className="field"
                      />
                    </div>

                    <div>
                      <label htmlFor="reg-photo" className="field-label flex items-center gap-1.5">
                        <Image className="w-4 h-4 text-muted" aria-hidden="true" /> Profile photo URL
                      </label>
                      <input
                        id="reg-photo"
                        name="photo"
                        type="url"
                        autoComplete="photo"
                        value={profilePicture}
                        onChange={(e) => setProfilePicture(e.target.value)}
                        placeholder="https://…"
                        className="field"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="reg-bio" className="field-label">Bio</label>
                    <textarea
                      id="reg-bio"
                      name="bio"
                      rows={3}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="A few lines about yourself and how you'd like to help."
                      className="field resize-y"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="reg-skills" className="field-label">Skills</label>
                      <input
                        id="reg-skills"
                        name="skills"
                        type="text"
                        autoComplete="off"
                        aria-describedby="reg-skills-hint"
                        value={skills}
                        onChange={(e) => setSkills(e.target.value)}
                        placeholder="e.g. Teaching, First aid"
                        className="field"
                      />
                      <p id="reg-skills-hint" className="text-sm text-muted mt-1.5">Separate with commas.</p>
                    </div>

                    <div>
                      <label htmlFor="reg-interests" className="field-label">Causes you care about</label>
                      <input
                        id="reg-interests"
                        name="interests"
                        type="text"
                        autoComplete="off"
                        aria-describedby="reg-interests-hint"
                        value={interests}
                        onChange={(e) => setInterests(e.target.value)}
                        placeholder="e.g. Plantation, Youth tutoring"
                        className="field"
                      />
                      <p id="reg-interests-hint" className="text-sm text-muted mt-1.5">Separate with commas.</p>
                    </div>
                  </div>
                </section>

                <button type="submit" disabled={loading || registrationsClosed} className="btn btn-primary btn-lg w-full">
                  {loading ? 'Creating your account…' : 'Create account'}
                  {!loading && <ArrowRight className="w-5 h-5" aria-hidden="true" />}
                </button>
              </fieldset>
            </form>

            <p className="mt-8 pt-6 border-t border-sand text-ink-soft">
              Already a member?{' '}
              <Link to="/login" className="font-semibold text-brand hover:text-brand-dark underline-offset-4 hover:underline">
                Log in
              </Link>
            </p>
          </div>
        </div>

        <PhotoPanel />
      </div>
    </div>
  );
};

export default Register;
