import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Avatar from '../../components/ui/Avatar';
import AccountForm, { accountToForm } from '../../components/sponsorship/AccountForm';
import {
  ACCOUNT_TYPES,
  BackLink,
  Chip,
  LogoTile,
  Modal,
  NotFoundCard,
  PageSkeleton,
  VERIFICATION,
  errMsg,
  fmtDate,
  safeUrl,
  sameId,
} from '../../components/sponsorship/shared';
import { Building2, ExternalLink, Globe, Loader2, LogOut, Mail, Pencil, Phone, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react';

const ROLE_INFO = {
  OWNER: 'Owner — manages the team, edits the account, applies and approves logos',
  EDITOR: 'Editor — edits the account, applies, messages and approves logos',
  VIEWER: 'Viewer — read-only access to proposals and reports',
};

const SponsorAccount = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [acc, setAcc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('EDITOR');
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState(null); // { userId, name, self }

  const load = () =>
    API.get(`/sponsorship/accounts/${id}`)
      .then((r) => setAcc(r.data?.data || null))
      .catch(() => setAcc(null));

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <PageSkeleton label="Loading sponsor account" />;
  if (!acc) {
    return <NotFoundCard title="We couldn't open this sponsor account" body="It may not exist, or you may not be a member of it." to="/sponsor/portal" cta="Back to sponsor portal" />;
  }

  const myRole = acc.myRole;
  const canEdit = ['OWNER', 'EDITOR'].includes(myRole);
  const isOwner = myRole === 'OWNER';
  const website = safeUrl(acc.website);

  const save = async (payload) => {
    setSaving(true);
    try {
      const res = await API.put(`/sponsorship/accounts/${acc._id}`, payload);
      showToast(res.data.message || 'Saved', 'success');
      await load();
      setEditing(false);
    } catch (err) {
      showToast(errMsg(err, 'Could not save'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const addMember = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setAdding(true);
    try {
      const res = await API.post(`/sponsorship/accounts/${acc._id}/members`, { email: email.trim(), role });
      showToast(res.data.message || 'Member added', 'success');
      setEmail('');
      await load();
    } catch (err) {
      showToast(errMsg(err, 'Could not add this person'), 'error');
    } finally {
      setAdding(false);
    }
  };

  const removeMember = async () => {
    const c = confirm;
    try {
      await API.delete(`/sponsorship/accounts/${acc._id}/members/${c.userId}`);
      setConfirm(null);
      if (c.self) {
        showToast(`You left ${acc.name}`, 'success');
        navigate('/sponsor/portal');
      } else {
        showToast(`${c.name} removed`, 'success');
        load();
      }
    } catch (err) {
      showToast(errMsg(err, 'Could not remove this person'), 'error');
    }
  };

  return (
    <div className="pb-10">
      <section className="relative overflow-hidden border-b border-sand bg-paper-deep/60">
        <div className="absolute inset-0 grain opacity-60" aria-hidden="true" />
        <div className="container-page relative pt-6 pb-10 space-y-6">
          <BackLink to="/sponsor/portal">Sponsor portal</BackLink>
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 animate-rise">
            <LogoTile url={acc.logos?.[0]?.url} name={acc.name} className="w-20 h-20 sm:w-24 sm:h-24 shadow-[var(--shadow-lift)]" />
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap gap-2">
                <Chip map={VERIFICATION} value={acc.verificationStatus} />
                <span className="chip bg-white text-ink-soft">{ACCOUNT_TYPES[acc.type] || acc.type}</span>
                {myRole && <span className="chip bg-white text-ink-soft">You are {myRole.toLowerCase()}</span>}
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-ink leading-tight break-words">{acc.name}</h1>
              <p className="text-sm text-muted">Registered {fmtDate(acc.createdAt)}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="container-page pt-8 grid lg:grid-cols-3 gap-6 lg:gap-8 items-start">
        <div className="lg:col-span-2 space-y-6 min-w-0">
          {/* Verification */}
          <section aria-labelledby="ver-h" className={`card p-5 sm:p-6 flex gap-4 ${acc.verificationStatus === 'REJECTED' ? '!border-brand/40' : ''}`}>
            <span className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${VERIFICATION[acc.verificationStatus]?.cls || ''}`}>
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <h2 id="ver-h" className="text-lg font-semibold text-ink">{VERIFICATION[acc.verificationStatus]?.label || acc.verificationStatus}</h2>
              <p className="text-sm text-ink-soft">
                {acc.verificationStatus === 'VERIFIED'
                  ? `Verified${acc.verifiedAt ? ` on ${fmtDate(acc.verifiedAt)}` : ''}. Changing the name or PAN number will need a fresh check.`
                  : acc.verificationStatus === 'REJECTED'
                    ? 'This organisation was not approved, so it cannot send new proposals. Contact the Hateymalo team if you think this is a mistake.'
                    : 'Our team checks each organisation before its name appears publicly. You can already send proposals.'}
              </p>
              {acc.verificationNote && <p className="text-sm text-muted italic">Note from the team: {acc.verificationNote}</p>}
            </div>
          </section>

          {/* Details / edit */}
          <section aria-labelledby="det-h" className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 id="det-h" className="text-xl font-bold text-ink flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-brand-tint text-brand flex items-center justify-center"><Building2 className="w-[18px] h-[18px]" aria-hidden="true" /></span>
                Organisation details
              </h2>
              {canEdit && !editing && (
                <button type="button" onClick={() => setEditing(true)} className="btn btn-ghost btn-sm"><Pencil className="w-4 h-4" aria-hidden="true" /> Edit</button>
              )}
            </div>
            {editing ? (
              <AccountForm key={acc.updatedAt} idPrefix="edit-acc" initial={accountToForm(acc)} onSubmit={save} saving={saving} submitLabel="Save changes" onCancel={() => setEditing(false)} />
            ) : (
              <div className="space-y-5">
                {acc.description && <p className="text-ink-soft whitespace-pre-line">{acc.description}</p>}
                <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                  {[
                    ['Contact person', acc.contactName],
                    ['Address', acc.address],
                    ['PAN number', acc.panNumber],
                    ['VAT registered', acc.vatRegistered ? 'Yes' : 'No'],
                  ].map(([k, val]) => (
                    <div key={k}>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-muted">{k}</dt>
                      <dd className="text-ink mt-0.5 break-words">{val || '—'}</dd>
                    </div>
                  ))}
                </dl>
                <div className="flex flex-wrap gap-2">
                  {website && <a href={website} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm"><Globe className="w-4 h-4" aria-hidden="true" /> Website <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" /></a>}
                  {acc.contactEmail && <a href={`mailto:${acc.contactEmail}`} className="btn btn-ghost btn-sm"><Mail className="w-4 h-4" aria-hidden="true" /> {acc.contactEmail}</a>}
                  {acc.contactPhone && <a href={`tel:${acc.contactPhone}`} className="btn btn-ghost btn-sm"><Phone className="w-4 h-4" aria-hidden="true" /> {acc.contactPhone}</a>}
                </div>
              </div>
            )}
          </section>

          {/* Logos */}
          {!editing && (
            <section aria-labelledby="logos-h" className="card p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 id="logos-h" className="text-xl font-bold text-ink">Logos</h2>
                {canEdit && <button type="button" onClick={() => setEditing(true)} className="btn btn-ghost btn-sm">Manage logos</button>}
              </div>
              {acc.logos?.length ? (
                <ul className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {acc.logos.map((l) => (
                    <li key={l._id || l.url} className="space-y-2">
                      <div className="grid grid-cols-2 gap-1.5">
                        <LogoTile url={l.url} name={l.label || acc.name} className="w-full h-20" />
                        <LogoTile url={l.url} name={l.label || acc.name} className="w-full h-20" dark />
                      </div>
                      <p className="text-sm font-semibold text-ink truncate">{l.label || 'Logo'}</p>
                      <p className="text-xs text-muted">{l.background === 'DARK' ? 'For dark backgrounds' : l.background === 'LIGHT' ? 'For light backgrounds' : 'Any background'}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">No logos yet. Add image links so you can pick one when a sponsorship is agreed.</p>
              )}
              <p className="text-xs text-muted mt-4">Logos are only used on a campaign after you approve them on that specific sponsorship.</p>
            </section>
          )}
        </div>

        {/* Team */}
        <aside className="space-y-6 min-w-0">
          <section aria-labelledby="team-h" className="card p-5 sm:p-6 space-y-4">
            <h2 id="team-h" className="text-xl font-bold text-ink flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-pine-tint text-pine flex items-center justify-center"><Users className="w-[18px] h-[18px]" aria-hidden="true" /></span>
              Team
            </h2>
            <ul className="space-y-3">
              {(acc.members || []).map((m) => {
                const u = m.user || {};
                const self = sameId(u, user?._id);
                return (
                  <li key={u._id || String(m.user)} className="flex items-center gap-3">
                    <Avatar name={u.name} src={u.profilePicture} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink truncate">{u.name || 'Member'}{self && <span className="text-muted font-normal"> (you)</span>}</p>
                      <p className="text-xs text-muted truncate">{u.email}</p>
                      <span className="chip bg-paper-deep text-ink-soft mt-0.5" title={ROLE_INFO[m.role]}>{m.role.charAt(0) + m.role.slice(1).toLowerCase()}</span>
                    </div>
                    {(isOwner || self) && (
                      <button
                        type="button"
                        onClick={() => setConfirm({ userId: u._id, name: u.name, self })}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-muted hover:text-brand hover:bg-brand-tint shrink-0"
                        aria-label={self ? 'Leave this sponsor account' : `Remove ${u.name}`}
                      >
                        {self ? <LogOut className="w-4 h-4" aria-hidden="true" /> : <Trash2 className="w-4 h-4" aria-hidden="true" />}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

            {isOwner && (
              <form onSubmit={addMember} className="pt-4 border-t border-sand space-y-3">
                <h3 className="text-sm font-semibold text-ink">Add a team member</h3>
                <div>
                  <label htmlFor="mem-email" className="field-label">Email of their Hateymalo account</label>
                  <input id="mem-email" type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@example.com" />
                </div>
                <div>
                  <label htmlFor="mem-role" className="field-label">Role</label>
                  <select id="mem-role" className="field" value={role} onChange={(e) => setRole(e.target.value)} aria-describedby="mem-role-hint">
                    <option value="EDITOR">Editor</option>
                    <option value="VIEWER">Viewer</option>
                    <option value="OWNER">Owner</option>
                  </select>
                  <p id="mem-role-hint" className="text-xs text-muted mt-1">{ROLE_INFO[role]}</p>
                </div>
                <button type="submit" disabled={adding || !email.trim()} className="btn btn-pine btn-sm w-full">
                  {adding ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <UserPlus className="w-4 h-4" aria-hidden="true" />} Add member
                </button>
              </form>
            )}
          </section>
          <Link to="/sponsor/portal" className="btn btn-ghost w-full">Back to my sponsorships</Link>
        </aside>
      </div>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} labelledBy="rm-title">
        {confirm && (
          <div className="p-6 sm:p-8 space-y-4">
            <h2 id="rm-title" className="text-2xl font-bold text-ink pr-10">{confirm.self ? `Leave ${acc.name}?` : `Remove ${confirm.name}?`}</h2>
            <p className="text-sm text-muted">
              {confirm.self
                ? 'You will lose access to this organisation’s proposals, agreements and reports.'
                : `${confirm.name} will lose access to this organisation’s proposals, agreements and reports.`}
            </p>
            <div className="flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => setConfirm(null)} className="btn btn-ghost">Cancel</button>
              <button type="button" onClick={removeMember} className="btn btn-primary">{confirm.self ? 'Leave account' : 'Remove member'}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SponsorAccount;
