// Formatting helpers shared by all screens (Nepal context: NPR, en-IN grouping).

export const formatNPR = (n) => `Rs. ${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

export const formatNumber = (n) => (Number(n) || 0).toLocaleString('en-IN');

export const formatDate = (d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  if (!d) return '';
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-US', opts);
};

export const formatDateTime = (d) =>
  formatDate(d, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

export const timeAgo = (d) => {
  if (!d) return '';
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
};

export const humanize = (s = '') => String(s).replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

// Strip HTML/markdown-ish content to a plain preview line.
export const plainText = (s = '', max = 160) => {
  const t = String(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

export const pct = (raised, goal) => (goal > 0 ? Math.min(100, (Number(raised) / Number(goal)) * 100) : 0);
