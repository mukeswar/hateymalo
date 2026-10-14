import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff } from 'lucide-react';
import API from '../services/api';
import { useToast } from '../context/ToastContext';

// Lets any signed-in member (including admins) change their own password.
const ChangePasswordCard = () => {
  const { showToast } = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.newPassword.length < 8) return setError('New password must be at least 8 characters.');
    if (form.newPassword !== form.confirmPassword) return setError('The new passwords do not match.');

    setSaving(true);
    try {
      const res = await API.put('/auth/password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      if (res.data.success) {
        showToast('Password updated successfully', 'success');
        setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update the password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const type = show ? 'text' : 'password';

  return (
    <section className="card p-6 sm:p-7" aria-labelledby="change-password-title">
      <div className="flex items-start gap-3 mb-5">
        <span className="w-10 h-10 rounded-full bg-brand-tint text-brand flex items-center justify-center shrink-0">
          <KeyRound className="w-[18px] h-[18px]" aria-hidden="true" />
        </span>
        <div>
          <h2 id="change-password-title" className="text-xl font-bold text-ink">Account security</h2>
          <p className="text-sm text-muted">Change your password. Use at least 8 characters that you don't use anywhere else.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-3 md:items-end">
        <div>
          <label htmlFor="cp-current" className="field-label">Current password</label>
          <input id="cp-current" type={type} autoComplete="current-password" required value={form.currentPassword} onChange={update('currentPassword')} className="field" />
        </div>
        <div>
          <label htmlFor="cp-new" className="field-label">New password</label>
          <input id="cp-new" type={type} autoComplete="new-password" required minLength={8} value={form.newPassword} onChange={update('newPassword')} className="field" />
        </div>
        <div>
          <label htmlFor="cp-confirm" className="field-label">Confirm new password</label>
          <input id="cp-confirm" type={type} autoComplete="new-password" required minLength={8} value={form.confirmPassword} onChange={update('confirmPassword')} className="field" />
        </div>

        {error && (
          <p role="alert" className="md:col-span-3 text-sm font-medium text-brand bg-brand-tint rounded-xl px-4 py-2.5">
            {error}
          </p>
        )}

        <div className="md:col-span-3 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? 'Updating…' : 'Update password'}
          </button>
          <button type="button" onClick={() => setShow((s) => !s)} className="btn btn-ghost btn-sm" aria-pressed={show}>
            {show ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
            {show ? 'Hide passwords' : 'Show passwords'}
          </button>
        </div>
      </form>
    </section>
  );
};

export default ChangePasswordCard;
