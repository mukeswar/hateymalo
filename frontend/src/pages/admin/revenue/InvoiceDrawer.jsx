import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Ban, Pencil, Printer, Send, Trash2 } from 'lucide-react';
import API from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import InvoiceForm from './InvoiceForm';
import {
  BTN_DANGER, BTN_GHOST, BTN_PINE, BTN_PRIMARY, Drawer, Empty, Field, Loading, Modal, NoteDialog, Select, errMsg, fmtDate, fmtDateTime,
} from '../sponsorship/shared';
import {
  METHOD_LABELS, OPEN_INVOICE, PAYMENT_METHODS, InvoiceChip, OverdueChip, SOURCE_LABELS, kindLabel, rs, subjectLine, todayInput,
} from '../../../components/revenue/revenueShared';

const Row = ({ k, children }) => (
  <div className="flex flex-col gap-0.5 py-1.5 sm:flex-row sm:gap-3">
    <dt className="w-36 shrink-0 text-sm text-muted">{k}</dt>
    <dd className="min-w-0 text-sm font-medium text-ink">{children}</dd>
  </div>
);

const Tile = ({ k, v, tone = 'text-ink' }) => (
  <div className="rounded-2xl border border-sand bg-white p-3">
    <p className="text-xs text-muted">{k}</p>
    <p className={`mt-0.5 font-display text-lg font-bold tabular-nums ${tone}`}>{v}</p>
  </div>
);

const emptyPayment = () => ({ amount: '', method: 'BANK_TRANSFER', reference: '', receivedAt: todayInput(), note: '' });

/**
 * Finance view of one invoice: edit / delete a draft, issue, void, record and
 * remove payments, billing position of the deal or campaign, print link.
 */
const InvoiceDrawer = ({ invoiceId, onClose, onChanged, onDeleted }) => {
  const { showToast } = useToast();
  const [inv, setInv] = useState(null);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(null); // 'edit' | 'delete' | 'issue' | 'void' | { removePayment }
  const [issueDate, setIssueDate] = useState(todayInput());
  const [pay, setPay] = useState(emptyPayment());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await API.get(`/revenue/invoices/${invoiceId}`);
      setInv(res.data.data);
    } catch (e) {
      setError(errMsg(e, 'Could not load the invoice'));
    }
  }, [invoiceId]);

  useEffect(() => {
    setInv(null);
    setDialog(null);
    setPay(emptyPayment());
    load();
  }, [load]);

  const done = (res, msg) => {
    showToast(res.data.message || msg, 'success');
    setDialog(null);
    onChanged?.(res.data.data);
    load(); // brings back recordedBy names and the billing position
  };

  const issue = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await API.post(`/revenue/invoices/${invoiceId}/issue`, { issueDate });
      done(res, 'Invoice issued');
    } catch (err) {
      showToast(errMsg(err, 'Could not issue the invoice'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const voidIt = async (reason) => {
    try {
      done(await API.post(`/revenue/invoices/${invoiceId}/void`, { reason }), 'Invoice voided');
    } catch (err) {
      showToast(errMsg(err, 'Could not void the invoice'), 'error');
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const res = await API.delete(`/revenue/invoices/${invoiceId}`);
      showToast(res.data.message || 'Draft deleted', 'success');
      onDeleted?.(invoiceId);
      onClose();
    } catch (err) {
      showToast(errMsg(err, 'Could not delete the draft'), 'error');
      setDialog(null);
    } finally {
      setBusy(false);
    }
  };

  const recordPayment = async (e) => {
    e.preventDefault();
    if (pay.method !== 'CASH' && !pay.reference.trim()) {
      showToast('Add the bank or transaction reference', 'error');
      return;
    }
    setBusy(true);
    try {
      const res = await API.post(`/revenue/invoices/${invoiceId}/payments`, { ...pay, amount: Number(pay.amount) });
      setPay(emptyPayment());
      done(res, 'Payment recorded');
    } catch (err) {
      showToast(errMsg(err, 'Could not record the payment'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const removePayment = async (reason) => {
    try {
      done(await API.delete(`/revenue/invoices/${invoiceId}/payments/${dialog.removePayment._id}`, { params: { reason } }), 'Payment removed');
    } catch (err) {
      showToast(errMsg(err, 'Could not remove the payment'), 'error');
    }
  };

  const isDraft = inv?.status === 'DRAFT';
  const open = inv && OPEN_INVOICE.includes(inv.status);
  const canVoid = inv && OPEN_INVOICE.includes(inv.status);
  const hasPayments = (inv?.payments || []).length > 0;

  return (
    <Drawer
      title={inv ? `${kindLabel(inv.kind)} ${inv.number || '· Draft'}` : 'Invoice'}
      subtitle={inv ? `${inv.sponsorAccount?.name || ''} · ${subjectLine(inv)}` : ''}
      onClose={onClose}
      headerExtra={
        inv && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <InvoiceChip status={inv.status} />
            {inv.overdue && <OverdueChip />}
            <a href={`/invoices/${inv._id}/print`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-sky-ink hover:underline">
              <Printer className="h-3.5 w-3.5" aria-hidden="true" /> Print view
            </a>
          </div>
        )
      }
    >
      {error ? (
        <Empty icon={AlertTriangle} action={<button type="button" onClick={load} className={BTN_GHOST}>Try again</button>}>{error}</Empty>
      ) : !inv ? (
        <Loading>Loading invoice…</Loading>
      ) : (
        <div className="space-y-5 p-4 sm:p-6">
          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {isDraft && (
              <>
                <button type="button" onClick={() => setDialog('issue')} className={BTN_PINE}><Send className="h-4 w-4" aria-hidden="true" /> Issue</button>
                <button type="button" onClick={() => setDialog('edit')} className={BTN_GHOST}><Pencil className="h-4 w-4" aria-hidden="true" /> Edit draft</button>
                <button type="button" onClick={() => setDialog('delete')} className={BTN_DANGER}><Trash2 className="h-4 w-4" aria-hidden="true" /> Delete draft</button>
              </>
            )}
            {canVoid && (
              <button
                type="button"
                onClick={() => setDialog('void')}
                disabled={hasPayments}
                title={hasPayments ? 'Remove the recorded payments first' : undefined}
                className={BTN_DANGER}
              >
                <Ban className="h-4 w-4" aria-hidden="true" /> Void
              </button>
            )}
            <a href={`/invoices/${inv._id}/print`} target="_blank" rel="noopener noreferrer" className={BTN_GHOST}><Printer className="h-4 w-4" aria-hidden="true" /> Print / PDF</a>
          </div>
          {canVoid && hasPayments && <p className="text-xs text-muted">An invoice with payments cannot be voided. Remove the payments first (with a reason) if it was issued by mistake.</p>}
          {isDraft && <p className="rounded-2xl bg-paper-deep px-4 py-3 text-sm text-ink-soft">Drafts are only visible to finance staff. Issuing gives it the next number, locks it, posts it to the ledger and notifies the sponsor.</p>}
          {inv.status === 'VOID' && <p className="rounded-2xl bg-brand-tint p-3 text-sm text-brand"><strong>Voided{inv.voidedAt ? ` ${fmtDate(inv.voidedAt)}` : ''}:</strong> {inv.voidReason}</p>}

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Tile k="Subtotal" v={rs(inv.subtotalPaisa)} />
            <Tile k={inv.kind === 'TAX_INVOICE' ? `VAT ${inv.vatRate}%` : 'VAT'} v={inv.kind === 'TAX_INVOICE' ? rs(inv.vatPaisa) : 'None'} />
            <Tile k="Paid" v={rs(inv.paidPaisa)} tone="text-pine" />
            <Tile k="Balance due" v={inv.status === 'VOID' || isDraft ? '—' : rs(inv.balancePaisa)} tone={open && inv.balancePaisa > 0 ? 'text-brand' : 'text-ink'} />
          </div>

          <section className="card p-4 sm:p-5">
            <h3 className="mb-2 text-base font-bold text-ink">Details</h3>
            <dl>
              <Row k="Bill to">{inv.billTo?.name || inv.sponsorAccount?.name}{inv.billTo?.pan ? ` · PAN ${inv.billTo.pan}` : ''}</Row>
              <Row k="For">{subjectLine(inv)}</Row>
              <Row k="Revenue stream">{SOURCE_LABELS[inv.source] || inv.source}</Row>
              <Row k="Type">{kindLabel(inv.kind)}{inv.kind === 'TAX_INVOICE' ? ` (${inv.vatRate}% VAT)` : ' (no VAT)'}</Row>
              <Row k="Issued">{inv.issueDate ? fmtDate(inv.issueDate) : 'Not yet'}{inv.fiscalYear ? ` · FY ${inv.fiscalYear}` : ''}</Row>
              <Row k="Due">{inv.dueDate ? fmtDate(inv.dueDate) : 'Set when issued'}</Row>
              {inv.notes && <Row k="Notes"><span className="whitespace-pre-line">{inv.notes}</span></Row>}
            </dl>
          </section>

          {inv.billing && (
            <section className="card p-4 sm:p-5">
              <h3 className="mb-1 text-base font-bold text-ink">Billing position of this {inv.subjectType === 'AD_CAMPAIGN' ? 'campaign' : 'deal'}</h3>
              <p className="mb-3 text-xs text-muted">Before VAT. A deal or campaign is never invoiced for more than its contracted value.</p>
              <div className="grid grid-cols-3 gap-2.5">
                <Tile k="Contracted" v={rs(inv.billing.contractedPaisa)} />
                <Tile k="Invoiced" v={rs(inv.billing.invoicedPaisa)} />
                <Tile k="Left to bill" v={rs(inv.billing.remainingPaisa)} tone={inv.billing.remainingPaisa ? 'text-pine' : 'text-ink'} />
              </div>
              {isDraft && inv.subtotalPaisa > inv.billing.remainingPaisa && (
                <p className="mt-3 text-sm font-semibold text-brand">This draft bills {rs(inv.subtotalPaisa)}, more than is left. Edit the lines before issuing.</p>
              )}
            </section>
          )}

          <section className="card p-4 sm:p-5">
            <h3 className="mb-2 text-base font-bold text-ink">Lines</h3>
            <ul className="divide-y divide-sand">
              {inv.lines.map((l, i) => (
                <li key={l._id || i} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
                  <span className="min-w-0">{l.description} <span className="text-muted">· {Number(l.quantity).toLocaleString('en-IN')} × {rs(l.unitPricePaisa)}</span></span>
                  <span className="font-semibold tabular-nums">{rs(l.amountPaisa)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 flex justify-between border-t border-sand pt-2 text-sm font-bold"><span>Total</span><span className="tabular-nums">{rs(inv.totalPaisa)}</span></p>
          </section>

          {!isDraft && (
            <section className="card p-4 sm:p-5">
              <h3 className="mb-2 text-base font-bold text-ink">Payments</h3>
              {hasPayments ? (
                <ul className="divide-y divide-sand">
                  {inv.payments.map((p) => (
                    <li key={p._id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                      <div className="min-w-0">
                        <p className="font-semibold tabular-nums text-ink">{rs(p.amountPaisa)} <span className="font-normal text-muted">· {METHOD_LABELS[p.method] || p.method}{p.reference ? ` · ${p.reference}` : ''}</span></p>
                        <p className="text-xs text-muted">Received {fmtDate(p.receivedAt)} · recorded by {p.recordedBy?.name || '—'}{p.note ? ` · ${p.note}` : ''}</p>
                      </div>
                      <button type="button" onClick={() => setDialog({ removePayment: p })} className={BTN_DANGER}>Remove</button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">No payments recorded.</p>
              )}

              {open && (
                <form onSubmit={recordPayment} className="mt-4 space-y-3 rounded-2xl border border-sand bg-paper p-4">
                  <p className="text-sm font-bold text-ink">Record a payment</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field id="ip-amt" label="Amount (NPR, incl. VAT)" hint={`Up to ${rs(inv.balancePaisa)} is still due.`}>
                      <div className="flex gap-2">
                        <input id="ip-amt" required type="number" min="1" step="0.01" inputMode="decimal" max={inv.balancePaisa / 100} value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} className="field" />
                        <button type="button" onClick={() => setPay({ ...pay, amount: String(inv.balancePaisa / 100) })} className={`${BTN_GHOST} shrink-0`}>Full</button>
                      </div>
                    </Field>
                    <Field id="ip-method" label="Method">
                      <Select id="ip-method" value={pay.method} onChange={(m) => setPay({ ...pay, method: m })} options={PAYMENT_METHODS} render={(m) => METHOD_LABELS[m]} />
                    </Field>
                    <Field id="ip-ref" label={pay.method === 'CASH' ? 'Reference (optional for cash)' : 'Bank / transaction reference'}>
                      <input id="ip-ref" required={pay.method !== 'CASH'} maxLength={120} value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} className="field" />
                    </Field>
                    <Field id="ip-date" label="Received on">
                      <input id="ip-date" required type="date" max={todayInput()} value={pay.receivedAt} onChange={(e) => setPay({ ...pay, receivedAt: e.target.value })} className="field" />
                    </Field>
                    <Field id="ip-note" label="Note (optional)" className="sm:col-span-2">
                      <input id="ip-note" maxLength={300} value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} className="field" />
                    </Field>
                  </div>
                  {inv.kind === 'TAX_INVOICE' && <p className="text-xs text-muted">The VAT part of each payment is kept apart in the ledger; only the net amount counts as received income.</p>}
                  <div className="flex justify-end">
                    <button type="submit" disabled={busy} className={BTN_PINE}>{busy ? 'Recording…' : 'Record payment'}</button>
                  </div>
                </form>
              )}
            </section>
          )}

          <p className="text-xs text-muted">
            Created {fmtDateTime(inv.createdAt)}{inv.updatedAt && inv.updatedAt !== inv.createdAt ? ` · updated ${fmtDateTime(inv.updatedAt)}` : ''}
          </p>
        </div>
      )}

      {dialog === 'edit' && inv && (
        <InvoiceForm
          invoice={inv}
          onClose={() => setDialog(null)}
          onSaved={(d) => {
            setDialog(null);
            onChanged?.(d);
            load();
          }}
        />
      )}
      {dialog === 'issue' && inv && (
        <Modal title="Issue this invoice?" icon={Send} onClose={() => setDialog(null)}>
          <form onSubmit={issue} className="space-y-4">
            <p className="text-sm text-ink-soft">
              It gets the next invoice number, is locked (mistakes are fixed by voiding and issuing a new one), is posted to the ledger as invoiced and the sponsor is notified.
              Seller details, the sponsor’s PAN and address, VAT and payment instructions are copied from the billing profile and the sponsor account now.
            </p>
            <p className="text-sm font-semibold text-ink">Total {rs(inv.totalPaisa)} to {inv.sponsorAccount?.name}</p>
            <Field id="iss-date" label="Issue date" hint="Usually today. It sets the fiscal year of the number.">
              <input id="iss-date" type="date" required max={todayInput()} value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="field" />
            </Field>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setDialog(null)} className="btn btn-ghost">Cancel</button>
              <button type="submit" disabled={busy} className={`${BTN_PRIMARY} !min-h-11`}>{busy ? 'Issuing…' : 'Issue invoice'}</button>
            </div>
          </form>
        </Modal>
      )}
      {dialog === 'delete' && (
        <Modal title="Delete this draft?" icon={Trash2} onClose={() => setDialog(null)}>
          <p className="text-sm text-ink-soft">The draft has no number yet and nobody else has seen it. This cannot be undone.</p>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setDialog(null)} className="btn btn-ghost">Cancel</button>
            <button type="button" onClick={remove} disabled={busy} className="btn bg-brand text-white hover:bg-brand-dark">{busy ? 'Deleting…' : 'Delete draft'}</button>
          </div>
        </Modal>
      )}
      {dialog === 'void' && inv && (
        <NoteDialog
          title={`Void ${inv.number}?`}
          message="The invoice keeps its number but no longer counts as invoiced, and the sponsor is told it was cancelled. Issue a new invoice if something still needs billing."
          fieldLabel="Reason (required, shown to the sponsor)"
          confirmLabel="Void invoice"
          required
          danger
          onCancel={() => setDialog(null)}
          onConfirm={voidIt}
        />
      )}
      {dialog?.removePayment && (
        <NoteDialog
          title="Remove payment"
          message={`Remove ${rs(dialog.removePayment.amountPaisa)} (${METHOD_LABELS[dialog.removePayment.method]}${dialog.removePayment.reference ? ` ${dialog.removePayment.reference}` : ''})? A reversal is posted to the ledger and the reason is kept in the activity log.`}
          fieldLabel="Reason"
          confirmLabel="Remove payment"
          required
          danger
          onCancel={() => setDialog(null)}
          onConfirm={removePayment}
        />
      )}
    </Drawer>
  );
};

export default InvoiceDrawer;
