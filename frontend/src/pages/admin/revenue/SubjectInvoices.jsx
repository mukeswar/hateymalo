import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import API from '../../../services/api';
import InvoiceForm from './InvoiceForm';
import { BTN_PRIMARY, Loading, errMsg, fmtDate } from '../sponsorship/shared';
import { InvoiceChip, OverdueChip, rs } from '../../../components/revenue/revenueShared';

export const invoiceLink = (id) => `/admin?tab=invoices&invoice=${id}`;

/**
 * Invoices of one ad campaign (GET /revenue/invoices?adCampaign=) with a
 * "Create invoice" shortcut. Finance staff with canManageRevenue only.
 */
const SubjectInvoices = ({ campaign, canInvoice, blockedNote }) => {
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    API.get('/revenue/invoices', { params: { adCampaign: campaign._id } })
      .then((r) => setList(r.data.data || []))
      .catch((e) => {
        setList([]);
        setError(errMsg(e, 'Could not load invoices'));
      });
  }, [campaign._id]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">{canInvoice ? 'Bill the booked value of this campaign. It can never be invoiced for more than that.' : blockedNote}</p>
        {canInvoice && (
          <button type="button" onClick={() => setCreating(true)} className={BTN_PRIMARY}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Create invoice
          </button>
        )}
      </div>
      {list === null ? (
        <Loading>Loading invoices…</Loading>
      ) : error ? (
        <p className="text-sm text-brand">{error}</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-muted">No invoices for this campaign yet.</p>
      ) : (
        <ul className="divide-y divide-sand rounded-2xl border border-sand bg-white">
          {list.map((i) => (
            <li key={i._id}>
              <Link to={invoiceLink(i._id)} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-paper">
                <span className="min-w-0">
                  <span className="block font-semibold tabular-nums text-ink">{i.number || 'Draft'}</span>
                  <span className="block text-xs text-muted">{i.issueDate ? `Issued ${fmtDate(i.issueDate)}` : 'Not issued'}{i.dueDate ? ` · due ${fmtDate(i.dueDate)}` : ''}</span>
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <InvoiceChip status={i.status} />
                  {i.overdue && <OverdueChip />}
                  <span className="text-sm font-semibold tabular-nums text-ink">{rs(i.totalPaisa)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {creating && (
        <InvoiceForm
          preset={{ sponsorAccount: campaign.advertiser?._id, subjectType: 'AD_CAMPAIGN', adCampaign: campaign._id }}
          onClose={() => setCreating(false)}
          onSaved={(inv) => {
            setCreating(false);
            navigate(invoiceLink(inv._id));
          }}
        />
      )}
    </div>
  );
};

export default SubjectInvoices;
