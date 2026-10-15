import React, { useEffect, useState } from 'react';
import { Info, Landmark } from 'lucide-react';
import API from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import { Field, Loading, Modal, errMsg } from '../sponsorship/shared';

const FIELDS = ['sellerName', 'sellerPan', 'sellerAddress', 'sellerEmail', 'sellerPhone', 'vatRegistered', 'vatRate', 'invoicePrefix', 'fiscalYearStart', 'defaultDueDays', 'paymentInstructions', 'footerNote'];

/**
 * Billing profile (GET/PUT /revenue/settings): who issues the invoices, VAT,
 * numbering, fiscal year start and the text printed on every invoice.
 * Changes apply to invoices issued from now on; issued invoices keep their copy.
 */
const BillingProfile = ({ onClose, onSaved }) => {
  const { showToast } = useToast();
  const [f, setF] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    API.get('/revenue/settings')
      .then((r) => setF(Object.fromEntries(FIELDS.map((k) => [k, r.data.data[k] ?? '']))))
      .catch((e) => setError(errMsg(e, 'Could not load the billing profile')));
  }, []);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (f.vatRegistered && !String(f.sellerPan).trim()) {
      showToast('Add your PAN/VAT number before turning on VAT invoices', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await API.put('/revenue/settings', { ...f, vatRate: Number(f.vatRate), defaultDueDays: Number(f.defaultDueDays) });
      showToast(res.data.message || 'Billing profile saved', 'success');
      onSaved?.(res.data.data);
      onClose();
    } catch (err) {
      showToast(errMsg(err, 'Could not save the billing profile'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Billing profile" icon={Landmark} onClose={onClose} size="max-w-2xl">
      {error ? (
        <p className="text-sm text-brand">{error}</p>
      ) : !f ? (
        <Loading>Loading billing profile…</Loading>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <p className="text-sm text-muted">Printed on every invoice issued from now on. Invoices already issued keep the details they were issued with.</p>
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="field-label sm:col-span-2">Seller</legend>
            <Field id="bp-name" label="Legal name (required to issue)">
              <input id="bp-name" className="field" maxLength={160} value={f.sellerName} onChange={set('sellerName')} />
            </Field>
            <Field id="bp-pan" label="PAN / VAT number" hint="Required for VAT invoices.">
              <input id="bp-pan" className="field" maxLength={20} inputMode="numeric" value={f.sellerPan} onChange={set('sellerPan')} />
            </Field>
            <Field id="bp-addr" label="Address (required to issue)" className="sm:col-span-2">
              <textarea id="bp-addr" rows={2} className="field" maxLength={300} value={f.sellerAddress} onChange={set('sellerAddress')} />
            </Field>
            <Field id="bp-email" label="Email">
              <input id="bp-email" type="email" className="field" maxLength={160} value={f.sellerEmail} onChange={set('sellerEmail')} />
            </Field>
            <Field id="bp-phone" label="Phone">
              <input id="bp-phone" className="field" maxLength={40} value={f.sellerPhone} onChange={set('sellerPhone')} />
            </Field>
          </fieldset>

          <fieldset className="space-y-3 rounded-2xl border border-sand p-4">
            <legend className="px-1 text-sm font-bold text-ink">VAT</legend>
            <label htmlFor="bp-vat" className="flex cursor-pointer items-start gap-3">
              <input id="bp-vat" type="checkbox" checked={!!f.vatRegistered} onChange={set('vatRegistered')} className="mt-0.5 h-5 w-5 shrink-0 accent-[#B5232C]" />
              <span>
                <span className="block text-sm font-semibold text-ink">We are VAT registered</span>
                <span className="block text-xs text-muted">
                  On: invoices are <strong>tax invoices</strong> with VAT added on top of the subtotal (needs the PAN above). Off: plain invoices with no VAT. Deal and ad amounts are treated as before VAT.
                </span>
              </span>
            </label>
            {f.vatRegistered && (
              <Field id="bp-rate" label="VAT rate (%)" className="max-w-[10rem]">
                <input id="bp-rate" type="number" min="0" max="100" step="0.01" className="field" value={f.vatRate} onChange={set('vatRate')} />
              </Field>
            )}
            <p className="flex gap-2 rounded-xl bg-sky-tint px-3 py-2 text-xs text-sky-ink">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              VAT treatment to be confirmed by your accountant. Nepal’s standard rate is 13%, and only a VAT-registered seller may charge it.
            </p>
          </fieldset>

          <fieldset className="grid gap-3 sm:grid-cols-3">
            <legend className="field-label sm:col-span-3">Numbering and terms</legend>
            <Field id="bp-prefix" label="Number prefix" hint="e.g. HM → HM-2083/84-0001">
              <input id="bp-prefix" className="field uppercase" maxLength={10} pattern="[A-Za-z0-9]{1,10}" value={f.invoicePrefix} onChange={set('invoicePrefix')} />
            </Field>
            <Field id="bp-fy" label="Fiscal year starts (MM-DD)" hint="1 Shrawan; usually 07-16 or 07-17">
              <input id="bp-fy" className="field" maxLength={5} pattern="(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])" value={f.fiscalYearStart} onChange={set('fiscalYearStart')} />
            </Field>
            <Field id="bp-due" label="Days to pay" hint="Default due date after issue">
              <input id="bp-due" type="number" min="0" max="180" className="field" value={f.defaultDueDays} onChange={set('defaultDueDays')} />
            </Field>
          </fieldset>

          <Field id="bp-pay" label="Payment instructions" hint="Bank name, account name and number, or wallet IDs. Shown on every open invoice.">
            <textarea id="bp-pay" rows={3} className="field" maxLength={2000} value={f.paymentInstructions} onChange={set('paymentInstructions')} />
          </Field>
          <Field id="bp-foot" label="Footer note">
            <textarea id="bp-foot" rows={2} className="field" maxLength={1000} value={f.footerNote} onChange={set('footerNote')} />
          </Field>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Saving…' : 'Save billing profile'}</button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default BillingProfile;
