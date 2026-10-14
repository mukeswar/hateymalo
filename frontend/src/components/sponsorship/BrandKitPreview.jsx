import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, Palette } from 'lucide-react';
import API from '../../services/api';
import { BRAND_ITEMS, renderBrandKitSvg } from '../../lib/brandKitSvg';
import { errMsg, fmtDate } from './shared';

// Read-only preview of the campaign's field branding (vests, banners…) for an
// agreed sponsor. Logos the owners have not approved are skipped by the
// renderer; we list them so nobody is surprised.
const BrandKitPreview = ({ opportunityId }) => {
  const [kit, setKit] = useState(null);
  const [error, setError] = useState('');
  const [item, setItem] = useState('VEST_FRONT');

  useEffect(() => {
    let alive = true;
    API.get(`/sponsorship/opportunities/${opportunityId}/brand-kit`)
      .then((r) => alive && setKit(r.data?.data || null))
      .catch((err) => alive && setError(errMsg(err, 'The brand kit is not available yet.')));
    return () => {
      alive = false;
    };
  }, [opportunityId]);

  const slots = useMemo(() => (kit?.slots || []).filter((s) => (s.placements || []).includes(item)), [kit, item]);

  const svg = useMemo(() => {
    if (!kit) return '';
    const o = kit.opportunity || {};
    return renderBrandKitSvg({
      item,
      campaignLabel: kit.campaignLabel,
      accentColor: kit.accentColor,
      brandLogoHref: `${window.location.origin}/logo-mark.png`,
      title: o.title,
      dateText: fmtDate(o.startDate),
      location: o.location,
      sponsors: slots.map((s) => ({ name: s.sponsorName, logoHref: s.logoUrl, size: s.size, order: s.order, logoUsageApproved: s.logoUsageApproved })),
    });
  }, [kit, item, slots]);

  if (error) return <p className="text-sm text-muted">{error}</p>;
  if (!kit) {
    return (
      <p className="text-sm text-muted flex items-center gap-2" role="status">
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Loading brand kit…
      </p>
    );
  }

  const unapproved = slots.filter((s) => !s.logoUsageApproved).map((s) => s.sponsorName);
  const usedItems = Object.keys(BRAND_ITEMS).filter((k) => (kit.slots || []).some((s) => (s.placements || []).includes(k)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {kit.approvedAt ? (
          <span className="chip bg-pine-tint text-pine">Approved for print {fmtDate(kit.approvedAt)}</span>
        ) : (
          <span className="chip bg-marigold-tint text-marigold-text">Draft — not yet approved for print</span>
        )}
        <span className="text-xs text-muted">Preview only. Final artwork is produced by the Hateymalo media team.</span>
      </div>
      <div role="group" aria-label="Brand item" className="flex gap-2 overflow-x-auto pb-1">
        {Object.entries(BRAND_ITEMS).map(([k, v]) => (
          <button
            key={k}
            type="button"
            aria-pressed={item === k}
            onClick={() => setItem(k)}
            className={`chip !py-1.5 !px-3.5 border shrink-0 ${item === k ? 'bg-ink text-white border-ink' : 'bg-white text-ink-soft border-sand hover:border-ink/40'}`}
          >
            {v.label}
            {usedItems.includes(k) && <span className="w-1.5 h-1.5 rounded-full bg-brand" aria-label="(has sponsor logos)" />}
          </button>
        ))}
      </div>
      {unapproved.length > 0 && (
        <p className="flex items-start gap-2 text-sm text-marigold-text bg-marigold-tint rounded-2xl p-3" role="note">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span>Not shown because the logo is not yet approved: {unapproved.join(', ')}.</span>
        </p>
      )}
      {slots.length === 0 && <p className="text-sm text-muted">No sponsor logos are placed on this item.</p>}
      <div
        className="surface-sunken p-4 sm:p-6 flex items-center justify-center [&>svg]:w-full [&>svg]:h-auto [&>svg]:max-h-[26rem] [&>svg]:drop-shadow-[0_18px_30px_rgb(31_27_22/0.18)]"
        role="img"
        aria-label={`${BRAND_ITEMS[item].label} preview`}
        // SVG built by brandKitSvg, which escapes every text and URL it embeds
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {kit.notes && (
        <p className="text-sm text-ink-soft flex gap-2"><Palette className="w-4 h-4 text-brand mt-0.5 shrink-0" aria-hidden="true" /> {kit.notes}</p>
      )}
    </div>
  );
};

export default BrandKitPreview;
