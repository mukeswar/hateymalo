import React, { useEffect, useMemo, useState } from 'react';
import { Image as RNImage, Platform, Pressable, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import * as Clipboard from 'expo-clipboard';
import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, Download, Palette, Plus, Save, X } from 'lucide-react-native';
import API, { errorMessage } from '../../lib/api';
import { BRAND_ITEMS, renderBrandKitSvg } from '../../lib/brandKitSvg';
import { formatDate, formatDateTime, humanize } from '../../lib/format';
import { colors, fonts, radius, space } from '../../theme';
import { Button, Chip, EmptyState, ErrorState, Field, Loading, Row, T } from '../ui';
import { PLACEMENTS, SLOT_SIZES, Box, Notice, SmallIconButton, useSponsorApi } from './AdminSponsorKit';

// Campaign brand kit: label, accent colour, which agreed sponsors appear on
// which field items (vests, banner, backdrop, ID card, signage), their order
// and size, plus live artwork previews from the shared generator.
// GET/PUT /sponsorship/opportunities/:id/brand-kit (brand staff, organisers).

const SWATCHES = [colors.brand, colors.pine, colors.sky, colors.marigold, colors.ink, colors.brandDark];
const HEX = /^#[0-9A-Fa-f]{6}$/;

// The bundled Hateymalo mark (expo-asset is not a direct dependency, so resolve
// the module with React Native's resolver; falls back to the generator's text mark).
const resolveBrandLogo = () => {
  try {
    // eslint-disable-next-line global-require
    const mod = require('../../../assets/logo-mark.png');
    if (typeof mod === 'string') return mod;
    if (mod?.uri) return mod.uri;
    if (typeof mod?.default === 'string') return mod.default;
    const src = RNImage.resolveAssetSource?.(mod);
    return src?.uri || '';
  } catch {
    return '';
  }
};

const absolute = (href) => {
  if (!href) return '';
  if (Platform.OS === 'web' && href.startsWith('/') && typeof window !== 'undefined') return `${window.location.origin}${href}`;
  return href;
};

const toLocal = (kit) => ({
  campaignLabel: kit.campaignLabel || '',
  accentColor: kit.accentColor || colors.brand,
  notes: kit.notes || '',
  slots: (kit.slots || []).map((s) => ({ ...s, placements: s.placements || [] })),
  unplaced: kit.unplaced || [],
});

const defaultSize = (tier) => (SLOT_SIZES.includes(tier?.logoSize) ? tier.logoSize : 'M');

const Preview = ({ svg, aspect, label }) => {
  const [w, setW] = useState(0);
  const xml = useMemo(() => svg.replace(/ width="[\d.]+mm" height="[\d.]+mm"/, ''), [svg]);
  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={{ width: '100%', backgroundColor: colors.paperDeep, borderRadius: radius.md, padding: 8, alignItems: 'center' }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${label} artwork preview`}
    >
      {w > 0 ? (() => {
        const maxH = 420;
        let pw = w - 16;
        let ph = pw * aspect;
        if (ph > maxH) { ph = maxH; pw = ph / aspect; }
        return <SvgXml xml={xml} width={pw} height={ph} />;
      })() : <View style={{ height: 160 }} />}
    </View>
  );
};

export default function AdminBrandKitEditor({ opportunityId, canEdit = true, showToast }) {
  const { data, setData, loading, error, reload } = useSponsorApi(opportunityId ? `/sponsorship/opportunities/${opportunityId}/brand-kit` : null, { fallback: 'Could not load the brand kit.' });
  const [kit, setKit] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState('');
  const [item, setItem] = useState('VEST_FRONT');
  const [personName, setPersonName] = useState('');
  const brandLogoHref = useMemo(resolveBrandLogo, []);

  useEffect(() => {
    if (data) { setKit(toLocal(data)); setDirty(false); }
  }, [data]);

  const change = (fn) => { setKit((k) => fn(k)); setDirty(true); };
  const set = (k) => (v) => change((x) => ({ ...x, [k]: v }));
  const updSlot = (i, patch) => change((x) => ({ ...x, slots: x.slots.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
  const place = (u) => change((x) => ({
    ...x,
    unplaced: x.unplaced.filter((d) => String(d.deal) !== String(u.deal)),
    slots: [...x.slots, { deal: u.deal, sponsorName: u.sponsorName, logoUrl: u.logoUrl, logoUsageApproved: u.logoUsageApproved, tier: u.tier, size: defaultSize(u.tier), placements: [...PLACEMENTS], order: x.slots.length }],
  }));
  const unplace = (i) => change((x) => {
    const s = x.slots[i];
    return { ...x, slots: x.slots.filter((_, j) => j !== i), unplaced: [...x.unplaced, { deal: s.deal, sponsorName: s.sponsorName, logoUrl: s.logoUrl, logoUsageApproved: s.logoUsageApproved, tier: s.tier }] };
  });
  const move = (i, d) => change((x) => {
    const slots = x.slots.slice();
    const [s] = slots.splice(i, 1);
    slots.splice(i + d, 0, s);
    return { ...x, slots };
  });
  const togglePlacement = (i, p) => {
    const cur = kit.slots[i].placements;
    updSlot(i, { placements: cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p] });
  };

  const save = async (approve) => {
    if (!HEX.test(kit.accentColor)) return showToast('Accent colour must look like #B5232C', 'error');
    setSaving(approve ? 'approve' : 'save');
    try {
      const res = await API.put(`/sponsorship/opportunities/${opportunityId}/brand-kit`, {
        campaignLabel: kit.campaignLabel.trim(),
        accentColor: kit.accentColor,
        notes: kit.notes.trim(),
        slots: kit.slots.map((s, i) => ({ deal: s.deal, order: i, size: s.size, placements: s.placements })),
        ...(approve ? { approve: true } : {}),
      });
      if (res.data?.success) {
        setData(res.data.data);
        showToast(res.data.message || 'Brand kit saved', 'success');
      }
    } catch (err) {
      showToast(errorMessage(err, 'Could not save the brand kit'), 'error');
    } finally {
      setSaving('');
    }
  };

  const svgFor = (forExport) => renderBrandKitSvg({
    item,
    campaignLabel: kit.campaignLabel,
    accentColor: HEX.test(kit.accentColor) ? kit.accentColor : undefined,
    brandLogoHref: forExport ? absolute(brandLogoHref) : brandLogoHref,
    title: data?.opportunity?.title,
    dateText: formatDate(data?.opportunity?.startDate),
    location: data?.opportunity?.location,
    sponsors: kit.slots
      .map((s, i) => ({ ...s, order: i }))
      .filter((s) => s.placements.includes(item))
      .map((s) => ({ name: s.sponsorName, logoHref: s.logoUrl || undefined, size: s.size, order: s.order, logoUsageApproved: s.logoUsageApproved })),
    personName: personName.trim() || undefined,
    personRole: personName.trim() ? 'Volunteer' : undefined,
  });

  const shareArtwork = async () => {
    const svg = svgFor(true);
    const name = `${(kit.campaignLabel || data?.opportunity?.title || 'hateymalo').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${item.toLowerCase()}.svg`;
    try {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const link = document.createElement('a');
        link.setAttribute('href', `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
        link.setAttribute('download', name);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(`${name} downloaded`, 'success');
      } else {
        await Clipboard.setStringAsync(svg);
        showToast('SVG copied. For print-ready files use the website brand kit download.', 'info');
      }
    } catch {
      showToast('Could not export the artwork', 'error');
    }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={() => reload()} />;
  if (!kit) return null;

  const spec = BRAND_ITEMS[item];
  const notApproved = kit.slots.filter((s) => !s.logoUsageApproved);
  const noLogo = kit.slots.filter((s) => s.logoUsageApproved && !s.logoUrl);
  const onThisItem = kit.slots.filter((s) => s.placements.includes(item));

  return (
    <View style={{ gap: space.lg }}>
      <Box tone={data?.approvedAt && !dirty ? 'pine' : 'warn'}>
        <Row gap={8}>
          {data?.approvedAt && !dirty ? <CheckCircle2 size={18} color={colors.pine} /> : <AlertTriangle size={18} color={colors.marigoldText} />}
          <T variant="small" style={{ flex: 1, color: data?.approvedAt && !dirty ? colors.pine : colors.marigoldText }}>
            {dirty
              ? 'Unsaved changes. Saving clears the previous approval.'
              : data?.approvedAt
                ? `Approved ${formatDateTime(data.approvedAt)} — ready for print.`
                : 'Not approved yet. Any change clears approval; approve the final layout before printing.'}
          </T>
        </Row>
      </Box>

      <Field label="Campaign label" value={kit.campaignLabel} onChangeText={set('campaignLabel')} maxLength={60} editable={canEdit} placeholder={data?.opportunity?.title || 'e.g. Clean Bagmati 2026'} hint="Printed on vests, banners and ID cards." />

      <View style={{ gap: 8 }}>
        <T variant="semibold" style={{ fontSize: 14.5 }}>Accent colour</T>
        <Row gap={10}>
          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: HEX.test(kit.accentColor) ? kit.accentColor : colors.sand, borderWidth: 1, borderColor: colors.sand }} accessibilityLabel={`Current accent colour ${kit.accentColor}`} />
          <Field
            style={{ flex: 1 }}
            value={kit.accentColor}
            onChangeText={(v) => set('accentColor')(v.startsWith('#') ? v.slice(0, 7) : `#${v}`.slice(0, 7))}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={canEdit}
            accessibilityLabel="Accent colour hex code"
            error={HEX.test(kit.accentColor) ? undefined : 'Use #RRGGBB, e.g. #B5232C'}
          />
        </Row>
        <Row gap={10} wrap>
          {SWATCHES.map((c) => (
            <Pressable
              key={c}
              onPress={canEdit ? () => set('accentColor')(c) : undefined}
              accessibilityRole="button"
              accessibilityLabel={`Use accent colour ${c}`}
              accessibilityState={{ selected: kit.accentColor.toUpperCase() === c.toUpperCase(), disabled: !canEdit }}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c, borderWidth: kit.accentColor.toUpperCase() === c.toUpperCase() ? 3 : 1, borderColor: kit.accentColor.toUpperCase() === c.toUpperCase() ? colors.ink : colors.sand }}
            />
          ))}
        </Row>
      </View>

      <Field label="Notes for printers / volunteers" value={kit.notes} onChangeText={set('notes')} multiline maxLength={1000} editable={canEdit} />

      <View style={{ gap: 8 }}>
        <T variant="h3">Sponsors on the artwork</T>
        {!kit.slots.length && !kit.unplaced.length ? (
          <EmptyState icon={Palette} title="No agreed sponsors yet" message="Sponsors appear here once their deal is agreed." />
        ) : null}
        {notApproved.length ? (
          <Notice>
            {`Logo use not approved by: ${notApproved.map((s) => s.sponsorName).join(', ')}. They are left off all artwork until the sponsor approves logo use in their portal.`}
          </Notice>
        ) : null}
        {noLogo.length ? <Notice tone="paper">{`No logo uploaded yet for ${noLogo.map((s) => s.sponsorName).join(', ')} — their name is printed instead.`}</Notice> : null}
        {kit.slots.map((s, i) => (
          <Box key={String(s.deal)}>
            <Row gap={8} style={{ alignItems: 'flex-start' }}>
              <View style={{ flex: 1, gap: 2 }}>
                <T variant="semibold">{`${i + 1}. ${s.sponsorName}`}</T>
                <T variant="small">{s.tier ? `${s.tier.name} · ` : ''}{s.logoUsageApproved ? (s.logoUrl ? 'Logo approved' : 'Approved, no logo') : 'Logo not approved — excluded'}</T>
              </View>
              {canEdit ? (
                <Row gap={6}>
                  <SmallIconButton icon={ArrowUp} label={`Move ${s.sponsorName} up`} disabled={i === 0} onPress={() => move(i, -1)} />
                  <SmallIconButton icon={ArrowDown} label={`Move ${s.sponsorName} down`} disabled={i === kit.slots.length - 1} onPress={() => move(i, 1)} />
                  <SmallIconButton icon={X} label={`Remove ${s.sponsorName} from artwork`} tone="danger" onPress={() => unplace(i)} />
                </Row>
              ) : null}
            </Row>
            <T variant="caption" style={{ color: colors.muted }}>Logo size</T>
            <Row wrap gap={6}>
              {SLOT_SIZES.map((z) => <Chip key={z} label={z} active={s.size === z} onPress={canEdit ? () => updSlot(i, { size: z }) : undefined} />)}
            </Row>
            <T variant="caption" style={{ color: colors.muted }}>Appears on</T>
            <Row wrap gap={6}>
              {PLACEMENTS.map((p) => (
                <Chip key={p} label={humanize(p)} active={s.placements.includes(p)} onPress={canEdit ? () => togglePlacement(i, p) : undefined} />
              ))}
            </Row>
          </Box>
        ))}
        {kit.unplaced.length ? (
          <Box tone="paper">
            <T variant="semibold">Agreed sponsors not placed yet</T>
            {kit.unplaced.map((u) => (
              <Row key={String(u.deal)} gap={8}>
                <View style={{ flex: 1 }}>
                  <T variant="medium">{u.sponsorName}</T>
                  <T variant="caption" style={{ color: colors.muted }}>{u.tier?.name ? `${u.tier.name} · ` : ''}{u.logoUsageApproved ? 'Logo approved' : 'Logo not approved'}</T>
                </View>
                {canEdit ? <Button title="Place" icon={Plus} size="sm" variant="ghost" onPress={() => place(u)} /> : null}
              </Row>
            ))}
          </Box>
        ) : null}
      </View>

      {canEdit ? (
        <Row gap={8}>
          <Button title="Save" icon={Save} variant="ghost" onPress={() => save(false)} loading={saving === 'save'} disabled={!!saving} style={{ flex: 1 }} />
          <Button title="Save & approve" icon={CheckCircle2} variant="pine" onPress={() => save(true)} loading={saving === 'approve'} disabled={!!saving} style={{ flex: 1 }} />
        </Row>
      ) : null}

      <View style={{ gap: 10 }}>
        <T variant="h3">Artwork preview</T>
        <Row wrap gap={6}>
          {Object.entries(BRAND_ITEMS).map(([key, it]) => <Chip key={key} label={it.label} active={item === key} onPress={() => setItem(key)} />)}
        </Row>
        {item === 'ID_CARD' ? (
          <Field label="Name on the card (preview only)" value={personName} onChangeText={setPersonName} maxLength={60} />
        ) : null}
        <Preview svg={svgFor(false)} aspect={spec.h / spec.w} label={spec.label} />
        <T variant="caption" style={{ color: colors.muted }}>
          {`${spec.label} · ${spec.w} × ${spec.h} mm · ${onThisItem.length} sponsor${onThisItem.length === 1 ? '' : 's'} placed${dirty ? ' · showing unsaved changes' : ''}`}
        </T>
        <Button title={Platform.OS === 'web' ? 'Download SVG' : 'Share artwork (copy SVG)'} icon={Download} variant="soft" size="sm" onPress={shareArtwork} />
        <T variant="caption" style={{ color: colors.muted, fontFamily: fonts.body }}>
          Print-ready downloads for every item are on the website brand kit.
        </T>
      </View>
    </View>
  );
}
