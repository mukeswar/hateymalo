// Campaign field-branding artwork (vests, banners, backdrops, ID cards,
// signage) as plain SVG strings. Pure JS with no imports so the website and
// the mobile app share it byte-for-byte (copy at mobile/src/lib/brandKitSvg.js).
//
// Sizes are real print dimensions in millimetres (1 SVG unit = 1 mm), so a
// downloaded file prints at the right size. Only logos whose owners approved
// their use should be passed in; any sponsor with logoUsageApproved === false
// is skipped here as a second safeguard.

export const BRAND_ITEMS = {
  VEST_FRONT: { label: 'Vest — front', w: 500, h: 650 },
  VEST_BACK: { label: 'Vest — back', w: 500, h: 650 },
  BANNER: { label: 'Venue banner (3 × 1 m)', w: 3000, h: 1000 },
  BACKDROP: { label: 'Stage backdrop (2.4 × 1.8 m)', w: 2400, h: 1800 },
  ID_CARD: { label: 'Volunteer ID card (CR80)', w: 54, h: 85.6 },
  SIGNAGE: { label: 'Direction sign (A2)', w: 420, h: 594 },
};

const SIZE_WEIGHT = { XL: 1, L: 0.78, M: 0.6, S: 0.45 };

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const validColor = (c) => (/^#[0-9A-Fa-f]{6}$/.test(c || '') ? c : '#B5232C');

// SVG text does not wrap or shrink, so size it to fit: an average Latin glyph
// in these fonts is ~0.56 of the font size wide (bold ~0.6).
const fit = (text, maxWidth, maxSize, ratio = 0.6) =>
  Math.max(0.1, Math.min(maxSize, maxWidth / (Math.max(1, String(text || '').length) * ratio)));

// Lays sponsor logos out in rows: bigger tiers first, each row centred.
// Returns [{ x, y, w, h, sponsor }] inside the box (bx, by, bw, bh).
const layoutLogos = (sponsors, bx, by, bw, bh, baseH) => {
  const list = sponsors
    .filter((s) => s && s.logoUsageApproved !== false && (s.logoHref || s.name))
    .slice()
    .sort((a, b) => (SIZE_WEIGHT[b.size] || 0.6) - (SIZE_WEIGHT[a.size] || 0.6) || (a.order || 0) - (b.order || 0));
  if (!list.length) return [];
  const gap = baseH * 0.25;
  const rows = [];
  let row = [];
  let rowW = 0;
  for (const s of list) {
    const h = baseH * (SIZE_WEIGHT[s.size] || 0.6);
    const w = h * 2; // logos sit in 2:1 tiles, scaled to fit inside
    if (row.length && rowW + gap + w > bw) {
      rows.push(row);
      row = [];
      rowW = 0;
    }
    row.push({ s, w, h });
    rowW += (row.length > 1 ? gap : 0) + w;
  }
  if (row.length) rows.push(row);
  const totalH = rows.reduce((sum, r) => sum + Math.max(...r.map((t) => t.h)), 0) + gap * (rows.length - 1);
  // Shrink everything if the rows overflow the box (width or height)
  const widest = Math.max(...rows.map((r) => r.reduce((sum, t) => sum + t.w, 0) + gap * (r.length - 1)));
  const k = Math.min(1, bh / totalH, bw / widest);
  const out = [];
  let y = by + (bh - totalH * k) / 2;
  for (const r of rows) {
    const rh = Math.max(...r.map((t) => t.h)) * k;
    const rw = r.reduce((sum, t) => sum + t.w * k, 0) + gap * k * (r.length - 1);
    let x = bx + (bw - rw) / 2;
    for (const t of r) {
      out.push({ x, y: y + (rh - t.h * k) / 2, w: t.w * k, h: t.h * k, sponsor: t.s });
      x += t.w * k + gap * k;
    }
    y += rh + gap * k;
  }
  return out;
};

const logoTile = ({ x, y, w, h, sponsor }, fontSize) => {
  const pad = Math.min(w, h) * 0.08;
  const fs = fit(sponsor.name, w - 2 * pad, Math.min(fontSize, h * 0.4));
  const img = sponsor.logoHref
    ? `<image href="${esc(sponsor.logoHref)}" x="${x + pad}" y="${y + pad}" width="${w - 2 * pad}" height="${h - 2 * pad}" preserveAspectRatio="xMidYMid meet"/>`
    : `<text x="${x + w / 2}" y="${y + h / 2 + fs * 0.35}" text-anchor="middle" font-family="Mukta, Arial, sans-serif" font-weight="700" font-size="${fs}" fill="#1F1B16">${esc(sponsor.name)}</text>`;
  return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(w, h) * 0.1}" fill="#FFFFFF"/>${img}</g>`;
};

const header = (w, h) =>
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">`;

/**
 * @param {object} o
 * @param {keyof BRAND_ITEMS} o.item
 * @param {string} o.campaignLabel   e.g. "Clean Bagmati 2026"
 * @param {string} o.accentColor     #RRGGBB
 * @param {string} o.brandLogoHref   Hateymalo logo (URL or data: URI)
 * @param {string} [o.title]         campaign title
 * @param {string} [o.dateText]      e.g. "20–21 Nov 2026"
 * @param {string} [o.location]
 * @param {Array<{name:string, logoHref?:string, size?:'XL'|'L'|'M'|'S', order?:number, logoUsageApproved?:boolean}>} o.sponsors
 * @param {string} [o.personName]    ID card holder
 * @param {string} [o.personRole]    ID card role line, e.g. "Volunteer"
 * @returns {string} SVG markup
 */
export const renderBrandKitSvg = (o) => {
  const spec = BRAND_ITEMS[o.item] || BRAND_ITEMS.VEST_FRONT;
  const { w, h } = spec;
  const accent = validColor(o.accentColor);
  const rawLabel = o.campaignLabel || o.title || 'Hateymalo';
  const label = esc(rawLabel);
  const sponsors = o.sponsors || [];
  const brand = (x, y, size) =>
    o.brandLogoHref
      ? `<image href="${esc(o.brandLogoHref)}" x="${x}" y="${y}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/>`
      : `<text x="${x + size / 2}" y="${y + size * 0.6}" text-anchor="middle" font-family="Eczar, Georgia, serif" font-weight="700" font-size="${size * 0.3}" fill="${accent}">Hateymalo</text>`;

  if (o.item === 'VEST_FRONT') {
    // Vest silhouette: Hateymalo on the left chest, sponsors on the right chest
    const body = `<path d="M90 40 L190 40 Q250 120 310 40 L410 40 L470 160 L430 210 L430 630 L70 630 L70 210 L30 160 Z" fill="${accent}"/>`;
    const trim = `<path d="M70 470 L430 470 L430 500 L70 500 Z" fill="#F4ECDF" opacity="0.9"/>`;
    const tiles = layoutLogos(sponsors, 260, 230, 150, 210, 70).map((t) => logoTile(t, 14)).join('');
    return `${header(w, h)}${body}${trim}<rect x="95" y="230" width="140" height="140" rx="16" fill="#FFFFFF"/>${brand(105, 240, 120)}${tiles}<text x="250" y="560" text-anchor="middle" font-family="Mukta, Arial, sans-serif" font-weight="700" font-size="${fit(rawLabel, 330, 34)}" fill="#FFFFFF">${label}</text></svg>`;
  }

  if (o.item === 'VEST_BACK') {
    const body = `<path d="M90 40 L190 40 Q250 70 310 40 L410 40 L470 160 L430 210 L430 630 L70 630 L70 210 L30 160 Z" fill="${accent}"/>`;
    const tiles = layoutLogos(sponsors, 95, 400, 310, 190, 80).map((t) => logoTile(t, 16)).join('');
    return `${header(w, h)}${body}<rect x="150" y="110" width="200" height="200" rx="24" fill="#FFFFFF"/>${brand(165, 125, 170)}<text x="250" y="365" text-anchor="middle" font-family="Mukta, Arial, sans-serif" font-weight="800" font-size="${fit(rawLabel, 320, 40)}" fill="#FFFFFF">${label}</text>${tiles}</svg>`;
  }

  if (o.item === 'ID_CARD') {
    const tiles = layoutLogos(sponsors, 4, 66, 46, 15, 9).map((t) => logoTile(t, 2.2)).join('');
    return `${header(w, h)}<rect width="${w}" height="${h}" rx="3" fill="#FBF7F0"/><rect width="${w}" height="20" fill="${accent}"/>${brand(3, 2.5, 15)}<text x="20" y="10" font-family="Mukta, Arial, sans-serif" font-weight="700" font-size="${fit(rawLabel, 31, 4)}" fill="#FFFFFF">${label}</text><text x="20" y="15.5" font-family="Mukta, Arial, sans-serif" font-size="2.8" fill="#FFFFFF">${esc(o.dateText || '')}</text><rect x="17" y="25" width="20" height="24" rx="2" fill="#E8DFD2"/><text x="27" y="56" text-anchor="middle" font-family="Mukta, Arial, sans-serif" font-weight="700" font-size="3.6" fill="#1F1B16">${esc(o.personName || 'Volunteer name')}</text><text x="27" y="61" text-anchor="middle" font-family="Mukta, Arial, sans-serif" font-size="2.8" fill="${accent}">${esc(o.personRole || 'Volunteer')}</text>${tiles}</svg>`;
  }

  // Wide items: banner, backdrop, signage
  const pad = Math.min(w, h) * 0.06;
  const brandSize = Math.min(w, h) * (o.item === 'SIGNAGE' ? 0.22 : o.item === 'BACKDROP' ? 0.2 : 0.3);
  const titleSize = Math.min(w, h) * (o.item === 'BANNER' ? 0.11 : 0.07);
  const subSize = titleSize * 0.45;
  const top = `<rect width="${w}" height="${h}" fill="#FBF7F0"/><rect width="${w}" height="${h * 0.08}" fill="${accent}"/><rect y="${h - h * 0.04}" width="${w}" height="${h * 0.04}" fill="${accent}"/>`;
  if (o.item === 'SIGNAGE') {
    const tiles = layoutLogos(sponsors, pad, h * 0.62, w - 2 * pad, h * 0.28, w * 0.14).map((t) => logoTile(t, w * 0.03)).join('');
    return `${header(w, h)}${top}${brand(w / 2 - brandSize / 2, h * 0.12, brandSize)}<text x="${w / 2}" y="${h * 0.45}" text-anchor="middle" font-family="Mukta, Arial, sans-serif" font-weight="800" font-size="${fit(rawLabel, w - 2 * pad, w * 0.08)}" fill="#1F1B16">${label}</text><text x="${w / 2}" y="${h * 0.53}" text-anchor="middle" font-family="Mukta, Arial, sans-serif" font-size="${w * 0.045}" fill="${accent}">${esc(o.location || '')} →</text>${tiles}</svg>`;
  }
  const leftW = brandSize + pad * 2;
  const textX = leftW + pad * 0.5;
  const logosX = w * (o.item === 'BACKDROP' ? 0.64 : 0.58);
  const titleFit = fit(rawLabel, logosX - textX - pad, titleSize);
  const subText = [o.dateText, o.location].filter(Boolean).join(' · ');
  const subFit = fit(subText, logosX - textX - pad, Math.min(subSize, titleFit * 0.5), 0.5);
  const tiles = layoutLogos(sponsors, logosX, h * 0.14, w - logosX - pad, h * 0.74, h * 0.28).map((t) => logoTile(t, h * 0.05)).join('');
  return `${header(w, h)}${top}${brand(pad, h / 2 - brandSize / 2, brandSize)}<text x="${textX}" y="${h * 0.45}" font-family="Eczar, Georgia, serif" font-weight="700" font-size="${titleFit}" fill="#1F1B16">${label}</text><text x="${textX}" y="${h * 0.45 + titleFit * 0.5 + subFit * 1.4}" font-family="Mukta, Arial, sans-serif" font-size="${subFit}" fill="#6B6157">${esc(subText)}</text>${sponsors.length ? `<text x="${logosX + (w - logosX - pad) / 2}" y="${h * 0.12}" text-anchor="middle" font-family="Mukta, Arial, sans-serif" font-weight="700" font-size="${subSize * 0.8}" fill="${accent}">With thanks to</text>` : ''}${tiles}</svg>`;
};

export default renderBrandKitSvg;
