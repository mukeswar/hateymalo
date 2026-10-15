import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import InvoiceDocument from '../../components/revenue/InvoiceDocument';
import { NotFoundCard, PageSkeleton } from '../../components/sponsorship/shared';
import { kindLabel } from '../../components/revenue/revenueShared';

/**
 * /invoices/:id/print — print-friendly invoice for finance staff and for
 * members of the billed sponsor account (GET /revenue/invoices/:id decides).
 * Site chrome and this toolbar are hidden when printing (print:hidden).
 */
const InvoicePrint = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const [inv, setInv] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    API.get(`/revenue/invoices/${id}`)
      .then((r) => setInv(r.data.data))
      .catch((e) => setError(e?.response?.data?.message || 'Invoice not found'));
  }, [id]);

  useEffect(() => {
    if (!inv) return undefined;
    const prev = document.title;
    // The title becomes the default file name for "Save as PDF"
    document.title = `${kindLabel(inv.kind)} ${inv.number || 'draft'} — ${inv.sponsorAccount?.name || ''}`.trim();
    return () => {
      document.title = prev;
    };
  }, [inv]);

  if (error) return <NotFoundCard title="Invoice not found" body="It may have been removed, or you do not have access to it." to={can('canManageRevenue') ? '/admin?tab=invoices' : '/sponsor/invoices'} cta="Back to invoices" />;
  if (!inv) return <PageSkeleton label="Loading invoice" />;

  const back = inv.viewer?.isFinance ? `/admin?tab=invoices&invoice=${inv._id}` : `/sponsor/invoices/${inv._id}`;

  return (
    <div className="invoice-print-page bg-paper-deep/60 py-6 sm:py-10 print:bg-white print:p-0">
      <div className="container-page mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <button type="button" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(back))} className="btn btn-sm btn-ghost min-h-10">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
        </button>
        <div className="flex flex-wrap items-center gap-3">
          {inv.status === 'DRAFT' && <span className="text-sm text-muted">Draft preview — the sponsor cannot see it yet.</span>}
          <button type="button" onClick={() => window.print()} className="btn btn-sm btn-primary min-h-10">
            <Printer className="h-4 w-4" aria-hidden="true" /> Print / Save as PDF
          </button>
        </div>
      </div>
      <div className="px-2 sm:px-4 print:px-0">
        <div className="mx-auto max-w-[210mm] rounded-[var(--radius-card)] shadow-[var(--shadow-lift)] print:rounded-none print:shadow-none">
          <InvoiceDocument inv={inv} />
        </div>
      </div>
    </div>
  );
};

export default InvoicePrint;
