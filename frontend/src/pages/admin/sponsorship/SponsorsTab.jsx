import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, BadgeCheck, Ban, RotateCcw, Globe, Mail, Phone, Handshake, Download } from 'lucide-react';
import API from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import Avatar from '../../../components/ui/Avatar';
import {
  SP, VERIFICATION, label, fmtDate, fmtDateTime, errMsg, downloadCsv,
  Chip, Panel, Modal, NoteDialog, Loading, Empty, BTN_GHOST, BTN_PINE, BTN_DANGER,
} from './shared';

const AccountDetails = ({ accountId, summary, canVerify, onVerify, onViewDeals, onClose }) => {
  const { showToast } = useToast();
  const [acc, setAcc] = useState(null);
  useEffect(() => {
    API.get(`${SP}/accounts/${accountId}`)
      .then((r) => setAcc(r.data.data))
      .catch((e) => {
        showToast(errMsg(e, 'Could not load the account'), 'error');
        setAcc(summary);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);
  const a = acc || summary;
  return (
    <Modal title={a.name} icon={Building2} size="max-w-2xl" onClose={onClose}>
      {!acc ? (
        <Loading />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Chip status={a.verificationStatus}>{a.verificationStatus === 'VERIFIED' ? 'Verified' : label(a.verificationStatus)}</Chip>
            <span className="chip bg-paper-deep text-ink-soft">{label(a.type)}</span>
            {a.vatRegistered && <span className="chip bg-sky-tint text-sky-ink">VAT registered</span>}
            <span className="text-sm text-muted">Registered {fmtDate(a.createdAt)}</span>
          </div>
          {a.verificationNote && (
            <p className="rounded-2xl bg-paper-deep px-4 py-3 text-sm text-ink-soft">
              <span className="font-semibold">Verification note:</span> {a.verificationNote}
              {a.verifiedAt && <span className="text-muted"> · {fmtDateTime(a.verifiedAt)}</span>}
            </p>
          )}
          {a.description && <p className="whitespace-pre-line text-sm text-ink-soft">{a.description}</p>}
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div><dt className="text-muted">PAN</dt><dd className="font-semibold text-ink">{a.panNumber || '—'}</dd></div>
            <div><dt className="text-muted">Address</dt><dd className="font-semibold text-ink">{a.address || '—'}</dd></div>
            <div>
              <dt className="text-muted">Contact</dt>
              <dd className="space-y-0.5 font-semibold text-ink">
                <p>{a.contactName || '—'}</p>
                {a.contactEmail && <a href={`mailto:${a.contactEmail}`} className="flex items-center gap-1 text-sky-ink hover:underline"><Mail className="h-3.5 w-3.5" aria-hidden="true" />{a.contactEmail}</a>}
                {a.contactPhone && <p className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-muted" aria-hidden="true" />{a.contactPhone}</p>}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Website</dt>
              <dd className="font-semibold">
                {a.website ? <a href={a.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all text-sky-ink hover:underline"><Globe className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{a.website}</a> : '—'}
              </dd>
            </div>
            <div><dt className="text-muted">Deals</dt><dd className="font-semibold text-ink">{summary.dealCount} total · {summary.contractedDeals} agreed</dd></div>
          </dl>
          {a.logos?.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-ink-soft">Logos</p>
              <div className="flex flex-wrap gap-3">
                {a.logos.map((l) => (
                  <figure key={l._id || l.url} className="rounded-xl border border-sand p-2 text-center">
                    <img src={l.url} alt={`${a.name} — ${l.label}`} className={`h-14 w-28 object-contain ${l.background === 'DARK' ? 'rounded bg-night' : 'bg-white'}`} />
                    <figcaption className="mt-1 text-xs text-muted">{l.label} · {label(l.background)}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="mb-2 text-sm font-semibold text-ink-soft">Team</p>
            <ul className="divide-y divide-sand rounded-2xl border border-sand">
              {(a.members || []).map((m, i) => (
                <li key={m.user?._id || i} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Avatar name={m.user?.name || '?'} src={m.user?.profilePicture} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">{m.user?.name || 'Member'}</span>
                      <span className="block truncate text-xs text-muted">{m.user?.email}</span>
                    </span>
                  </span>
                  <span className="chip bg-paper-deep text-ink-soft">{label(m.role)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-sand pt-4">
            {summary.dealCount > 0 && onViewDeals && (
              <button type="button" onClick={() => onViewDeals(a._id)} className={BTN_GHOST}><Handshake className="h-4 w-4" aria-hidden="true" /> View deals</button>
            )}
            {canVerify && a.verificationStatus !== 'REJECTED' && (
              <button type="button" onClick={() => onVerify(summary, 'REJECTED')} className={BTN_DANGER}><Ban className="h-4 w-4" aria-hidden="true" /> Reject</button>
            )}
            {canVerify && a.verificationStatus !== 'PENDING' && (
              <button type="button" onClick={() => onVerify(summary, 'PENDING')} className={BTN_GHOST}><RotateCcw className="h-4 w-4" aria-hidden="true" /> Back to pending</button>
            )}
            {canVerify && a.verificationStatus !== 'VERIFIED' && (
              <button type="button" onClick={() => onVerify(summary, 'VERIFIED')} className={BTN_PINE}><BadgeCheck className="h-4 w-4" aria-hidden="true" /> Verify</button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

const VERIFY_COPY = {
  VERIFIED: { title: 'Verify sponsor', confirm: 'Verify', msg: 'Confirm you have checked their registration (PAN / company documents). The sponsor team is notified.' },
  REJECTED: { title: 'Reject sponsor', confirm: 'Reject', msg: 'Rejected accounts cannot apply to campaigns. Tell them why — they will see this note.' },
  PENDING: { title: 'Move back to pending', confirm: 'Move to pending', msg: 'The account returns to the verification queue.' },
};

/** Sponsor organisations: verification queue, details and team. */
const SponsorsTab = ({ search = '', refreshKey = 0, onViewDeals }) => {
  const { can } = useAuth();
  const { showToast } = useToast();
  const canVerify = can('canManageSponsorships');
  const [status, setStatus] = useState('');
  const [list, setList] = useState(null);
  const [openAcc, setOpenAcc] = useState(null);
  const [verifying, setVerifying] = useState(null); // { acc, status }

  const load = useCallback(async () => {
    try {
      const res = await API.get(`${SP}/admin/accounts`, { params: status ? { status } : {} });
      setList(res.data.data || []);
    } catch (e) {
      setList([]);
      showToast(errMsg(e, 'Could not load sponsor accounts'), 'error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (list || []).filter((a) => !q || [a.name, a.contactName, a.contactEmail, a.panNumber].some((x) => (x || '').toLowerCase().includes(q)));
  }, [list, search]);

  const verify = async (note) => {
    const { acc, status: to } = verifying;
    if (to === 'REJECTED' && !note) {
      showToast('Add a reason for the sponsor', 'error');
      return;
    }
    try {
      const res = await API.put(`${SP}/admin/accounts/${acc._id}/verify`, { status: to, note });
      showToast(res.data.message || 'Updated', 'success');
      setVerifying(null);
      setOpenAcc(null);
      load();
    } catch (e) {
      showToast(errMsg(e, 'Could not update verification'), 'error');
    }
  };

  const exportCsv = () => {
    const rows = shown.map((a) => ({
      Name: a.name, Type: a.type, Verification: a.verificationStatus, PAN: a.panNumber || '', 'VAT registered': a.vatRegistered ? 'yes' : 'no',
      Contact: a.contactName || '', Email: a.contactEmail || '', Phone: a.contactPhone || '', Website: a.website || '',
      Deals: a.dealCount, 'Agreed deals': a.contractedDeals, Registered: a.createdAt ? new Date(a.createdAt).toISOString().slice(0, 10) : '',
    }));
    if (!downloadCsv(rows, 'hateymalo_sponsor_accounts')) showToast('No accounts to export', 'info');
  };

  const pending = (list || []).filter((a) => a.verificationStatus === 'PENDING').length;

  return (
    <Panel
      title="Sponsor accounts"
      count={list ? shown.length : undefined}
      description={canVerify ? 'Check each organisation before they can be trusted as a sponsor. Verified accounts show a badge to campaign teams.' : 'Organisations registered as sponsors.'}
      actions={
        <>
          <label htmlFor="sp-acc-status" className="sr-only">Verification status</label>
          <select id="sp-acc-status" value={status} onChange={(e) => setStatus(e.target.value)} className="field !w-auto !py-2">
            <option value="">All statuses</option>
            {VERIFICATION.map((s) => <option key={s} value={s}>{label(s)}</option>)}
          </select>
          <button type="button" onClick={exportCsv} className={BTN_GHOST}><Download className="h-4 w-4" aria-hidden="true" /> CSV</button>
        </>
      }
    >
      {!status && pending > 0 && canVerify && (
        <button type="button" onClick={() => setStatus('PENDING')} className="flex w-full items-center justify-between gap-2 border-b border-sand bg-marigold-tint px-5 py-3 text-left text-sm font-semibold text-marigold-text hover:brightness-[0.98]">
          {pending} account{pending > 1 ? 's' : ''} waiting for verification <span aria-hidden="true">→</span>
        </button>
      )}
      {list === null ? (
        <Loading />
      ) : shown.length === 0 ? (
        <Empty icon={Building2}>{search ? 'No accounts match your search.' : 'No sponsor accounts here yet.'}</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-paper/70 text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Organisation</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Team</th>
                <th className="px-4 py-3 font-semibold">Deals</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {shown.map((a) => (
                <tr key={a._id} className="hover:bg-paper">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {a.logos?.[0]?.url ? (
                        <img src={a.logos[0].url} alt="" className="h-9 w-14 shrink-0 rounded-lg border border-sand bg-white object-contain" />
                      ) : (
                        <Avatar name={a.name} size="sm" rounded="rounded-lg" />
                      )}
                      <div className="min-w-0">
                        <button type="button" onClick={() => setOpenAcc(a)} className="block max-w-[16rem] truncate text-left font-semibold text-ink hover:text-brand hover:underline">{a.name}</button>
                        <p className="text-xs text-muted">{label(a.type)}{a.panNumber ? ` · PAN ${a.panNumber}` : ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Chip status={a.verificationStatus}>{a.verificationStatus === 'VERIFIED' ? 'Verified' : label(a.verificationStatus)}</Chip></td>
                  <td className="max-w-[14rem] px-4 py-3">
                    <p className="truncate text-ink-soft">{a.contactName || '—'}</p>
                    <p className="truncate text-xs text-muted">{a.contactEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{(a.members || []).length}</td>
                  <td className="px-4 py-3 tabular-nums text-ink-soft">{a.dealCount} <span className="text-xs text-muted">({a.contractedDeals} agreed)</span></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {canVerify && a.verificationStatus === 'PENDING' && (
                        <>
                          <button type="button" onClick={() => setVerifying({ acc: a, status: 'VERIFIED' })} className={BTN_PINE}>Verify</button>
                          <button type="button" onClick={() => setVerifying({ acc: a, status: 'REJECTED' })} className={BTN_DANGER}>Reject</button>
                        </>
                      )}
                      <button type="button" onClick={() => setOpenAcc(a)} className={BTN_GHOST}>Details</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openAcc && (
        <AccountDetails
          accountId={openAcc._id}
          summary={openAcc}
          canVerify={canVerify}
          onVerify={(acc, to) => setVerifying({ acc, status: to })}
          onViewDeals={onViewDeals}
          onClose={() => setOpenAcc(null)}
        />
      )}
      {verifying && (
        <NoteDialog
          title={`${VERIFY_COPY[verifying.status].title}: ${verifying.acc.name}`}
          message={VERIFY_COPY[verifying.status].msg}
          fieldLabel={verifying.status === 'REJECTED' ? 'Reason (shown to the sponsor)' : 'Note (optional, shown to the sponsor)'}
          required={verifying.status === 'REJECTED'}
          danger={verifying.status === 'REJECTED'}
          confirmLabel={VERIFY_COPY[verifying.status].confirm}
          onCancel={() => setVerifying(null)}
          onConfirm={verify}
        />
      )}
    </Panel>
  );
};

export default SponsorsTab;
