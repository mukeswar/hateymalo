import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Save } from 'lucide-react-native';
import API, { errorMessage } from '../../lib/api';
import { Button, Field, Loading, Row, Sheet, T } from '../ui';
import { ToggleRow } from '../admin/people/PeopleKit';
import { Notice, digits } from '../sponsorship/AdminSponsorKit';
import { decimalInput } from './RevenueBits';

// Billing profile (web: "Billing profile" section). GET / PUT /revenue/settings.
// Issuing invoices needs a name and address; VAT invoices also need a PAN.
const toForm = (s = {}) => ({
  sellerName: s.sellerName || '',
  sellerPan: s.sellerPan || '',
  sellerAddress: s.sellerAddress || '',
  sellerEmail: s.sellerEmail || '',
  sellerPhone: s.sellerPhone || '',
  vatRegistered: !!s.vatRegistered,
  vatRate: s.vatRate !== undefined && s.vatRate !== null ? String(s.vatRate) : '13',
  invoicePrefix: s.invoicePrefix || 'HM',
  fiscalYearStart: s.fiscalYearStart || '07-17',
  defaultDueDays: s.defaultDueDays !== undefined && s.defaultDueDays !== null ? String(s.defaultDueDays) : '15',
  paymentInstructions: s.paymentInstructions || '',
  footerNote: s.footerNote || '',
});

export default function BillingProfileSheet({ visible, onClose, onSaved, showToast }) {
  const [f, setF] = useState(toForm());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    if (!visible) return undefined;
    let alive = true;
    setLoading(true);
    API.get('/revenue/settings')
      .then((res) => { if (alive) { setF(toForm(res.data?.data)); setError(''); } })
      .catch((err) => { if (alive) setError(errorMessage(err, 'Could not load the billing profile.')); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [visible]);

  const save = async () => {
    if (!f.sellerName.trim() || !f.sellerAddress.trim()) return showToast('Name and address are needed before invoices can be issued', 'warning');
    if (f.vatRegistered && !f.sellerPan.trim()) return showToast('Add your PAN/VAT number before turning on VAT invoices', 'warning');
    if (!/^[A-Za-z0-9]{1,10}$/.test(f.invoicePrefix.trim())) return showToast('Prefix must be 1–10 letters or digits', 'warning');
    if (!/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(f.fiscalYearStart.trim())) return showToast('Fiscal year start must look like 07-17', 'warning');
    setBusy(true);
    try {
      const res = await API.put('/revenue/settings', {
        sellerName: f.sellerName.trim(),
        sellerPan: f.sellerPan.trim(),
        sellerAddress: f.sellerAddress.trim(),
        sellerEmail: f.sellerEmail.trim(),
        sellerPhone: f.sellerPhone.trim(),
        vatRegistered: f.vatRegistered,
        vatRate: Number(f.vatRate || 0),
        invoicePrefix: f.invoicePrefix.trim().toUpperCase(),
        fiscalYearStart: f.fiscalYearStart.trim(),
        defaultDueDays: Number(f.defaultDueDays || 0),
        paymentInstructions: f.paymentInstructions.trim(),
        footerNote: f.footerNote.trim(),
      });
      showToast(res.data?.message || 'Billing profile saved', 'success');
      onSaved?.(res.data?.data);
    } catch (err) {
      showToast(errorMessage(err, 'Could not save the billing profile'), 'error');
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Billing profile" footer={<Button title="Save profile" icon={Save} full loading={busy} disabled={loading} onPress={save} />}>
      {loading ? <Loading /> : error ? <Notice>{error}</Notice> : (
        <>
          <T variant="small">Printed on every invoice as the seller. Issued invoices keep the details they were issued with.</T>
          <Field label="Organisation name" value={f.sellerName} onChangeText={set('sellerName')} maxLength={160} />
          <Field label="PAN / VAT number" value={f.sellerPan} onChangeText={set('sellerPan')} maxLength={20} autoCapitalize="characters" />
          <Field label="Address" value={f.sellerAddress} onChangeText={set('sellerAddress')} multiline maxLength={300} />
          <Field label="Email" value={f.sellerEmail} onChangeText={set('sellerEmail')} maxLength={160} keyboardType="email-address" autoCapitalize="none" />
          <Field label="Phone" value={f.sellerPhone} onChangeText={set('sellerPhone')} maxLength={40} keyboardType="phone-pad" />
          <ToggleRow
            title="VAT registered"
            hint="On: invoices are TAX INVOICES with VAT added on top. Off: plain invoices without VAT."
            value={f.vatRegistered}
            onValueChange={set('vatRegistered')}
          />
          {f.vatRegistered ? <Field label="VAT rate (%)" value={f.vatRate} onChangeText={(v) => set('vatRate')(decimalInput(v))} keyboardType="decimal-pad" /> : null}
          <T variant="caption">VAT treatment to be confirmed by your accountant.</T>
          <Row gap={10} style={{ alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Field label="Number prefix" value={f.invoicePrefix} onChangeText={(v) => set('invoicePrefix')(v.toUpperCase())} maxLength={10} autoCapitalize="characters" hint="e.g. HM-2083/84-0001" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Fiscal year starts" value={f.fiscalYearStart} onChangeText={set('fiscalYearStart')} maxLength={5} placeholder="MM-DD" hint="1 Shrawan ≈ 07-17" />
            </View>
          </Row>
          <Field label="Days until due" value={f.defaultDueDays} onChangeText={(v) => set('defaultDueDays')(digits(v).slice(0, 3))} keyboardType="number-pad" hint="Used when an invoice has no due date (0–180)." />
          <Field label="Payment instructions" value={f.paymentInstructions} onChangeText={set('paymentInstructions')} multiline maxLength={2000} hint="Bank name, account number, wallet IDs…" />
          <Field label="Footer note" value={f.footerNote} onChangeText={set('footerNote')} multiline maxLength={1000} />
        </>
      )}
    </Sheet>
  );
}
