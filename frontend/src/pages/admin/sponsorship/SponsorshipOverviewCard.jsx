import React, { useEffect, useState } from 'react';
import { Handshake } from 'lucide-react';
import API from '../../../services/api';
import { SP, OPEN_STAGES, npr, hasValue } from './shared';

/**
 * Small sponsorship block for the dashboard Overview. Render only for staff
 * with canManageSponsorships or canManageSponsorFinance (the summary endpoint
 * refuses everyone else). Loads once per mount.
 */
const SponsorshipOverviewCard = ({ onOpen }) => {
  const [s, setS] = useState(null);
  useEffect(() => {
    API.get(`${SP}/admin/summary`).then((r) => setS(r.data.data)).catch(() => setS(false));
  }, []);
  if (!s) return null;
  const openDeals = (s.pipeline || []).filter((p) => OPEN_STAGES.includes(p.stage)).reduce((sum, p) => sum + p.deals, 0);
  const items = [
    { k: 'Contracted cash', v: npr(s.contractedCash) },
    ...(hasValue(s.outstandingCash) ? [{ k: 'Outstanding', v: npr(s.outstandingCash) }] : []),
    { k: 'Open proposals', v: openDeals, tab: 'sponsorDeals' },
    { k: 'Sponsors to verify', v: s.pendingSponsorAccounts, tab: 'sponsors' },
  ];
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
          <Handshake className="h-5 w-5 text-brand" aria-hidden="true" /> Sponsorship
        </h2>
        <button type="button" onClick={() => onOpen('sponsorDeals')} className="text-sm font-semibold text-brand hover:underline">
          Open pipeline
        </button>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((it) => (
          <div key={it.k} className="rounded-2xl bg-paper p-3">
            <dt className="text-xs font-semibold text-muted">{it.k}</dt>
            <dd className="mt-1 font-display text-xl font-bold tabular-nums text-ink">
              {it.tab ? (
                <button type="button" onClick={() => onOpen(it.tab)} className="hover:text-brand hover:underline">{it.v}</button>
              ) : (
                it.v
              )}
            </dd>
          </div>
        ))}
      </dl>
      {(s.inKind?.pledgedValue || s.inKind?.receivedValue) > 0 && (
        <p className="mt-2 text-xs text-muted">
          Plus {npr((s.inKind.pledgedValue || 0) + (s.inKind.receivedValue || 0))} of in-kind support — estimated value, not cash.
        </p>
      )}
    </div>
  );
};

export default SponsorshipOverviewCard;
