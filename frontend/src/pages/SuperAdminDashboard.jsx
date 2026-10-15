import React, { useState, useEffect, useId, Suspense, lazy } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Avatar from '../components/ui/Avatar';
import StaffTemplates from './admin/sponsorship/StaffTemplates';
import SponsorshipOverviewCard from './admin/sponsorship/SponsorshipOverviewCard';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  LayoutDashboard,
  Clock,
  FileText,
  BookOpen,
  Calendar,
  AlertTriangle,
  MessageSquare,
  Users,
  Building2,
  DollarSign,
  Receipt,
  Megaphone,
  ShieldAlert,
  Settings,
  Lock,
  Search,
  UserPlus,
  FolderKanban,
  Menu,
  X,
  CheckCircle2,
  Inbox,
  Plus,
  Trash2,
  RefreshCw,
  Download,
  ExternalLink,
  Star,
  MapPin,
  LogOut,
  BadgeCheck,
  Ban,
  ImageOff,
  QrCode,
  ShieldCheck,
  Globe,
  Handshake,
  Landmark,
  MonitorPlay,
  LayoutTemplate,
} from 'lucide-react';

/* --------------------------------------------------------------------------
   Presentational helpers (markup only — no data logic lives here)
   -------------------------------------------------------------------------- */

// Sponsorship sections load on demand (they are large and staff-only)
const OpportunitiesTab = lazy(() => import('./admin/sponsorship/OpportunitiesTab'));
const DealsTab = lazy(() => import('./admin/sponsorship/DealsTab'));
const SponsorsTab = lazy(() => import('./admin/sponsorship/SponsorsTab'));
// Advertising sections (contract: docs/ADS.md)
const AdsTab = lazy(() => import('./admin/ads/AdsTab'));
const AdPlacementsTab = lazy(() => import('./admin/ads/AdPlacementsTab'));
const SectionLoading = () => (
  <div className="flex items-center justify-center gap-3 py-16" role="status" aria-live="polite">
    <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-sand border-t-brand" aria-hidden="true" />
    <span className="text-sm text-muted">Loading…</span>
  </div>
);

const CHART_COLORS = ['#B5232C', '#1E5A47', '#E9A23B', '#2F5D8A', '#6B6157', '#8E1A22'];

const TH = 'px-4 py-3 font-semibold whitespace-nowrap';
const TD = 'px-4 py-3 align-middle whitespace-nowrap';
// Long free text (titles, locations, comments) wraps to at most two lines instead of being cut off
const TD_TEXT = 'px-4 py-3 align-middle whitespace-normal min-w-[12rem] max-w-[22rem]';
const ROW = 'hover:bg-paper transition-colors';

const BTN_APPROVE = 'btn btn-sm btn-pine min-h-10';
const BTN_DANGER = 'btn btn-sm min-h-10 bg-brand-tint text-brand hover:bg-brand hover:text-white';
const BTN_GHOST = 'btn btn-sm btn-ghost min-h-10';

const statusTone = (status = '') => {
  const s = String(status).toUpperCase();
  if (['APPROVED', 'ACTIVE', 'COMPLETED', 'VERIFIED', 'PUBLISHED', 'SUCCESS'].includes(s)) return 'bg-pine-tint text-pine';
  if (['PENDING', 'UPCOMING', 'DRAFT', 'PAUSED'].includes(s)) return 'bg-marigold-tint text-marigold-text';
  if (['REJECTED', 'CANCELLED', 'SUSPENDED', 'BANNED', 'FAILED', 'CLOSED'].includes(s)) return 'bg-brand-tint text-brand';
  return 'bg-sky-tint text-sky-ink';
};

const StatusChip = ({ status, children }) => (
  <span className={`chip ${statusTone(status)}`}>{children || status}</span>
);

const Panel = ({ title, count, description, actions, children }) => (
  <section className="card overflow-hidden animate-rise">
    <div className="flex flex-col gap-3 border-b border-sand p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-xl font-bold text-ink">
          {title}
          {count !== undefined && <span className="ml-2 align-middle text-sm font-semibold text-muted">({count})</span>}
        </h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
    {children}
  </section>
);

const DataTable = ({ head, children, minWidth = 'min-w-[720px]' }) => (
  <div className="overflow-x-auto">
    <table className={`w-full ${minWidth} text-left text-sm`}>
      <thead className="bg-paper/70 text-xs uppercase tracking-wider text-muted">
        <tr>
          {head.map((h, i) => (
            <th key={i} className={`${TH} ${h.right ? 'text-right' : ''}`}>{h.label || h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-sand">{children}</tbody>
    </table>
  </div>
);

const EmptyRow = ({ colSpan, children }) => (
  <tr>
    <td colSpan={colSpan} className="px-4 py-12 text-center">
      <Inbox className="mx-auto mb-2 h-7 w-7 text-muted/60" aria-hidden="true" />
      <p className="text-sm font-medium text-muted">{children}</p>
    </td>
  </tr>
);

const EmptyBlock = ({ icon: Icon = Inbox, children, action }) => (
  <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
    <Icon className="mb-2 h-7 w-7 text-muted/60" aria-hidden="true" />
    <p className="text-sm font-medium text-muted">{children}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

const SearchField = ({ value, onChange, placeholder, id }) => (
  <div className="relative w-full max-w-sm">
    <label htmlFor={id} className="sr-only">{placeholder}</label>
    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
    <input id={id} type="text" value={value} onChange={onChange} placeholder={placeholder} className="field !pl-10" />
  </div>
);

const FeatureButton = ({ featured, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={!!featured}
    className={`btn btn-sm min-h-10 ${featured ? 'bg-marigold text-ink hover:brightness-95' : 'bg-marigold-tint text-marigold-text hover:bg-[#F8E3BC]'}`}
  >
    <Star className={`h-3.5 w-3.5 ${featured ? 'fill-current' : ''}`} aria-hidden="true" />
    {featured ? 'Featured' : 'Feature'}
  </button>
);

// Permission tick-list used when adding staff or editing their access.
// Finance permissions are grouped separately because they expose donor data.
const AccessChecklist = ({ catalog, value, onChange, idPrefix }) => {
  if (!catalog) return <p className="text-sm text-muted">Loading permissions…</p>;
  const finance = ['canViewDonations', 'canManageDonations', 'canManageSponsorFinance'];
  const sponsorship = ['canManageSponsorships', 'canManageBrandKits'];
  const advertising = ['canManageAds', 'canReviewAds'];
  const toggle = (key, on) => onChange(on ? [...new Set([...value, key])] : value.filter((k) => k !== key));
  const group = (title, items, warn) => (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">{title}</legend>
      {warn && <p className="rounded-xl bg-marigold-tint px-3 py-2 text-xs text-marigold-text">{warn}</p>}
      {items.map((p) => (
        <label key={p.key} htmlFor={`${idPrefix}-${p.key}`} className="flex cursor-pointer items-start gap-3 rounded-xl border border-sand p-3 hover:bg-paper">
          <input
            id={`${idPrefix}-${p.key}`}
            type="checkbox"
            checked={value.includes(p.key)}
            onChange={(e) => toggle(p.key, e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[#B5232C]"
          />
          <span>
            <span className="block text-sm font-semibold text-ink">{p.label}</span>
            <span className="block text-xs text-muted">{p.hint}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
  return (
    <div className="space-y-4">
      {group('Moderation & community', catalog.permissions.filter((p) => !finance.includes(p.key) && !sponsorship.includes(p.key) && !advertising.includes(p.key)))}
      {group('Sponsorship', catalog.permissions.filter((p) => sponsorship.includes(p.key)))}
      {group('Advertising', catalog.permissions.filter((p) => advertising.includes(p.key)))}
      {group('Finance (confidential)', catalog.permissions.filter((p) => finance.includes(p.key)), 'Only grant to people you trust with donor and sponsor names, amounts and transaction IDs.')}
      <p className="text-xs text-muted">Settings, staff management, roles and the activity log always stay with the Super Admin.</p>
    </div>
  );
};

const Modal = ({ title, icon: Icon, onClose, size = 'max-w-md', children }) => {
  const titleId = useId();
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm animate-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`card !rounded-3xl w-full ${size} max-h-[90vh] overflow-y-auto p-5 sm:p-6 animate-pop`}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <h2 id={titleId} className="flex items-center gap-2 text-xl font-bold text-ink">
            {Icon && <Icon className="h-5 w-5 text-brand" aria-hidden="true" />}
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="-mr-1 -mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-paper hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const KpiTile = ({ label, value, hint, hintClass = 'text-muted', icon: Icon, tone, className = '' }) => (
  <div className={`card p-4 sm:p-5 ${className}`}>
    <div className="flex items-start justify-between gap-2">
      <span className="text-sm font-medium text-muted">{label}</span>
      <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
    </div>
    <p className="mt-2 font-display text-2xl font-bold leading-none text-ink sm:text-3xl tabular-nums">{value}</p>
    <p className={`mt-1.5 text-xs font-semibold ${hintClass}`}>{hint}</p>
  </div>
);

const SuperAdminDashboard = () => {
  const { user, logout, can, isSuperAdmin } = useAuth();

  // Which permission each section needs ('super' = Super Admin only). The server enforces the same rules.
  const TAB_ACCESS = {
    dashboard: null,
    approval: 'canApprovePosts',
    posts: 'canApprovePosts',
    blogs: 'canApprovePosts',
    events: 'canManageEvents',
    reports: 'canManageReports',
    comments: 'canDeletePosts',
    members: 'canManageUsers',
    orgs: 'canManageUsers',
    volunteers: 'canManageUsers',
    categories: 'canManageCategories',
    donations: 'canViewDonations',
    campaigns: 'canViewDonations',
    expenses: 'canViewDonations',
    // Sponsorship: a list means "any of these"
    sponsorship: 'canManageSponsorships',
    sponsorDeals: ['canManageSponsorships', 'canManageSponsorFinance', 'canManageBrandKits'],
    sponsors: ['canManageSponsorships', 'canManageSponsorFinance'],
    // Advertising: reviewers edit placements; managers and finance may read them
    ads: ['canManageAds', 'canReviewAds', 'canManageSponsorFinance'],
    adPlacements: ['canReviewAds', 'canManageAds', 'canManageSponsorFinance'],
    admins: 'super',
    settings: 'super',
    logs: 'super',
  };
  const canTab = (tab) => {
    if (!(tab in TAB_ACCESS)) return false;
    const need = TAB_ACCESS[tab];
    if (!need) return true;
    if (Array.isArray(need)) return need.some((p) => can(p));
    return need === 'super' ? isSuperAdmin : can(need);
  };
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Deep links such as /admin?tab=sponsorDeals&deal=<id> (used by notifications)
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const t = searchParams.get('tab');
    return t && canTab(t) ? t : 'dashboard';
  });
  // Sponsorship tabs load their own data; this asks them to reload (top-bar refresh)
  const [sponsorRefresh, setSponsorRefresh] = useState(0);
  // { deal?, opportunity?, sponsor?, nonce } — opens / filters the deals pipeline
  const [dealFocus, setDealFocus] = useState(null);
  // { campaign, nonce } — opens an ad campaign in the Advertising tab
  const [adFocus, setAdFocus] = useState(null);
  // Mobile navigation drawer (the sidebar is always visible from lg up)
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Search & Filter state per module
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Real Database Dynamic States
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeActivities: 0,
    upcomingEvents: 0,
    pendingApprovals: 0,
    totalDonations: 'Rs. 0',
    totalDonationsAmount: 0,
    pendingReports: 0,
    totalBlogs: 0,
    totalOrgs: 0,
  });

  // Data Collections
  const [pendingApprovalsList, setPendingApprovalsList] = useState([]);
  const [recentActivitiesList, setRecentActivitiesList] = useState([]);
  const [recentDonationsList, setRecentDonationsList] = useState([]);
  const [activityOverviewData, setActivityOverviewData] = useState([]);
  const [categoryDonutData, setCategoryDonutData] = useState([]);

  const [postsList, setPostsList] = useState([]);
  const [blogsList, setBlogsList] = useState([]);
  const [eventsList, setEventsList] = useState([]);
  const [reportsList, setReportsList] = useState([]);
  const [commentsList, setCommentsList] = useState([]);
  const [membersList, setMembersList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [donationsList, setDonationsList] = useState([]);
  const [campaignsList, setCampaignsList] = useState([]);
  const [expensesList, setExpensesList] = useState([]);
  const [auditLogsList, setAuditLogsList] = useState([]);
  const [settingsData, setSettingsData] = useState({});

  // Modals
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');

  const [showEventModal, setShowEventModal] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '', description: '', location: 'Kathmandu, Nepal', date: '', startTime: '09:00 AM', endTime: '05:00 PM', maxParticipants: 50, category: 'Community Activity'
  });

  const [showStaffModal, setShowStaffModal] = useState(false);
  // Staff access management (Super Admin): permission catalogue + the account being edited
  const [accessCatalog, setAccessCatalog] = useState(null);
  const [editingAccess, setEditingAccess] = useState(null); // { _id, name, role, permissions }
  const [staffForm, setStaffForm] = useState({
    // Empty permissions → the server applies the role's default access
    name: '', email: '', password: '', role: 'MODERATOR', permissions: []
  });

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', iconName: 'FolderKanban', color: '#94201B' });

  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaignForm, setCampaignForm] = useState({ title: '', description: '', goalAmount: 50000 });

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ campaignId: '', title: '', amount: '', notes: '', spentDate: '' });

  const [showOrgModal, setShowOrgModal] = useState(false);
  const [orgForm, setOrgForm] = useState({
    name: '',
    email: '',
    password: 'orgPassword123',
    location: 'Kathmandu, Nepal',
    phone: '',
    regNumber: '',
    orgType: 'NGO',
    description: '',
  });

  const [rejectingItem, setRejectingItem] = useState(null); // { id, type }
  const [rejectionReason, setRejectionReason] = useState('');

  const [suspendingUser, setSuspendingUser] = useState(null);
  const [suspensionReasonInput, setSuspensionReasonInput] = useState('');

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    if (!orgForm.name || !orgForm.email) {
      showToast('Name and email are required', 'error');
      return;
    }
    try {
      const res = await API.post('/admin/organizations', orgForm);
      if (res.data.success) {
        showToast(res.data.message, 'success');
        setShowOrgModal(false);
        setOrgForm({
          name: '',
          email: '',
          password: 'orgPassword123',
          location: 'Kathmandu, Nepal',
          phone: '',
          regNumber: '',
          orgType: 'NGO',
          description: '',
        });
        fetchTabData('orgs');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to register organization', 'error');
    }
  };

  // 1. Fetch Overview & Live Metrics
  const fetchDashboardData = async () => {
    try {
      // Each source loads independently, and only when this staff member may see it,
      // so one refused request never breaks the whole overview.
      const skip = Promise.resolve(null);
      const safe = (p) => p.catch(() => null);
      const [analyticsRes, pendingRes, postsRes, donationsRes, reportsRes] = await Promise.all([
        safe(API.get('/super-admin/analytics?timeRange=30_DAYS')),
        can('canApprovePosts') ? safe(API.get('/super-admin/approval-center?contentType=POSTS')) : skip,
        safe(API.get('/posts?status=ALL')),
        can('canViewDonations') ? safe(API.get('/donations/campaigns')) : skip,
        can('canManageReports') ? safe(API.get('/reports')) : skip,
      ]);

      if (analyticsRes?.data.success) {
        const s = analyticsRes.data.data.summary;
        const c = analyticsRes.data.data.charts;

        setStats((prev) => ({
          ...prev,
          totalMembers: s.totalUsers || 0,
          activeActivities: s.activeActivities || 0,
          upcomingEvents: s.upcomingEvents || 0,
          pendingApprovals: s.pendingPosts || 0,
          totalDonationsAmount: s.totalDonationsAmount || 0,
          totalDonations: `Rs. ${(s.totalDonationsAmount || 0).toLocaleString()}`,
          totalBlogs: s.publishedBlogs || 0,
        }));

        if (c.userGrowth && c.userGrowth.length > 0) {
          setActivityOverviewData(c.userGrowth.map((u) => ({ date: u.date, val: u.count })));
        } else {
          setActivityOverviewData([{ date: 'Today', val: s.totalUsers || 0 }]);
        }

        if (c.postsByCategory && c.postsByCategory.length > 0) {
          const colors = CHART_COLORS;
          setCategoryDonutData(
            c.postsByCategory.map((item, idx) => ({
              name: item.category,
              value: item.count,
              color: colors[idx % colors.length],
            }))
          );
        }
      }

      if (pendingRes?.data.success) setPendingApprovalsList(pendingRes.data.data);
      if (postsRes?.data.success) setRecentActivitiesList(postsRes.data.data.slice(0, 5));
      if (donationsRes?.data.success) setRecentDonationsList(donationsRes.data.data.slice(0, 5));
      if (reportsRes?.data.success) {
        setReportsList(reportsRes.data.data);
        setStats((prev) => ({ ...prev, pendingReports: reportsRes.data.count || 0 }));
      }
    } catch (error) {
      console.error('Failed to fetch dynamic admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch tab-specific dynamic backend data
  const fetchTabData = async (tab) => {
    if (!canTab(tab)) return;
    try {
      if (tab === 'posts') {
        const res = await API.get('/posts?status=ALL');
        if (res.data.success) setPostsList(res.data.data);
      } else if (tab === 'blogs') {
        const res = await API.get('/blogs?status=ALL');
        if (res.data.success) setBlogsList(res.data.data);
      } else if (tab === 'events') {
        const res = await API.get('/events');
        if (res.data.success) setEventsList(res.data.data);
      } else if (tab === 'reports') {
        const res = await API.get('/reports');
        if (res.data.success) setReportsList(res.data.data);
      } else if (tab === 'comments') {
        const res = await API.get('/admin/comments');
        if (res.data.success) setCommentsList(res.data.data);
      } else if (tab === 'members' || tab === 'orgs' || tab === 'volunteers' || tab === 'admins') {
        if (tab === 'admins') loadAccessCatalog();
        const res = await API.get('/admin/users');
        if (res.data.success) {
          setMembersList(res.data.data);
          const orgCount = res.data.data.filter((u) => u.memberLevel === 'ORGANIZATION').length;
          setStats((prev) => ({ ...prev, totalOrgs: orgCount }));
        }
      } else if (tab === 'categories') {
        const res = await API.get('/categories');
        if (res.data.success) setCategoriesList(res.data.data);
      } else if (tab === 'donations') {
        const res = await API.get('/admin/donations');
        if (res.data.success) setDonationsList(res.data.data);
      } else if (tab === 'campaigns') {
        const res = await API.get('/donations/campaigns');
        if (res.data.success) setCampaignsList(res.data.data);
      } else if (tab === 'expenses') {
        const res = await API.get('/admin/expenses');
        if (res.data.success) setExpensesList(res.data.data);
      } else if (tab === 'logs') {
        const res = await API.get('/super-admin/audit-logs');
        if (res.data.success) setAuditLogsList(res.data.data);
      } else if (tab === 'settings') {
        const res = await API.get('/super-admin/settings');
        if (res.data.success) setSettingsData(res.data.data);
      } else if (tab === 'approval') {
        const res = await API.get('/super-admin/approval-center?contentType=POSTS');
        if (res.data.success) setPendingApprovalsList(res.data.data);
      }
    } catch (error) {
      console.error(`Failed to fetch tab data for ${tab}:`, error);
    }
  };

  // Polling Real-time Synchronization Every 8 Seconds
  useEffect(() => {
    fetchDashboardData();
    fetchTabData(activeTab);

    const interval = setInterval(() => {
      fetchDashboardData();
      // The settings form is not re-polled: it would overwrite unsaved edits every 8 seconds
      if (activeTab !== 'settings') fetchTabData(activeTab);
    }, 8000);

    return () => clearInterval(interval);
  }, [activeTab]);

  // Tab change handler
  // Never show a section this staff member has no access to
  useEffect(() => {
    if (!canTab(activeTab)) setActiveTab('dashboard');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user]);

  const handleTabChange = (tab) => {
    if (!canTab(tab)) return;
    setActiveTab(tab);
    setSearchQuery('');
    setFilterCategory('All');
    setFilterStatus('All');
    fetchTabData(tab);
  };

  // Apply ?tab= / ?deal= whenever they appear (also when a notification is opened while already here)
  useEffect(() => {
    const tab = searchParams.get('tab');
    const deal = searchParams.get('deal');
    const campaign = searchParams.get('campaign');
    if (!tab && !deal && !campaign) return;
    if (tab && canTab(tab)) handleTabChange(tab);
    if (deal && canTab('sponsorDeals')) {
      if (tab !== 'sponsorDeals') handleTabChange('sponsorDeals');
      setDealFocus({ deal, nonce: Date.now() });
    }
    // /admin?tab=ads&campaign=<id> (ad review notifications)
    if (campaign && canTab('ads')) {
      if (tab !== 'ads') handleTabChange('ads');
      setAdFocus({ campaign, nonce: Date.now() });
    }
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const openDealsFor = (focus) => {
    setDealFocus({ ...focus, nonce: Date.now() });
    handleTabChange('sponsorDeals');
  };

  // --- ACTIONS ---
  const handleApprovePost = async (postId) => {
    try {
      const res = await API.put(`/posts/${postId}/status`, { status: 'APPROVED' });
      if (res.data.success) {
        showToast('Post approved and published live!', 'success');
        setPostsList((prev) => prev.map((p) => (p._id === postId ? { ...p, status: 'APPROVED' } : p)));
        setPendingApprovalsList((prev) => prev.filter((p) => p._id !== postId));
        fetchDashboardData();
      }
    } catch (error) {
      showToast('Approve post failed', 'error');
    }
  };

  const handleRejectPost = async (postId, reason) => {
    try {
      const res = await API.put(`/posts/${postId}/status`, { status: 'REJECTED', rejectionReason: reason });
      if (res.data.success) {
        showToast('Post rejected with user feedback', 'info');
        setPostsList((prev) => prev.map((p) => (p._id === postId ? { ...p, status: 'REJECTED', rejectionReason: reason } : p)));
        setPendingApprovalsList((prev) => prev.filter((p) => p._id !== postId));
        setRejectingItem(null);
        setRejectionReason('');
        fetchDashboardData();
      }
    } catch (error) {
      showToast('Reject post failed', 'error');
    }
  };

  const handleFeaturePost = async (postId, makeFeatured) => {
    try {
      const res = await API.put(`/posts/${postId}/feature`, { isFeatured: makeFeatured });
      if (res.data.success) {
        showToast(makeFeatured ? 'Post featured on homepage' : 'Post removed from featured', 'success');
        setPostsList((prev) => prev.map((p) => (p._id === postId ? { ...p, isFeatured: res.data.data.isFeatured } : p)));
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Feature action failed', 'error');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to permanently delete this post?')) return;
    try {
      const res = await API.delete(`/posts/${postId}`);
      if (res.data.success) {
        showToast('Post deleted permanently', 'success');
        setPostsList((prev) => prev.filter((p) => p._id !== postId));
        fetchDashboardData();
      }
    } catch (error) {
      showToast('Delete post failed', 'error');
    }
  };

  const handleApproveBlog = async (blogId) => {
    try {
      const res = await API.put(`/blogs/${blogId}/status`, { status: 'APPROVED' });
      if (res.data.success) {
        showToast('Blog story published live!', 'success');
        setBlogsList((prev) => prev.map((b) => (b._id === blogId ? { ...b, status: 'APPROVED' } : b)));
        fetchDashboardData();
      }
    } catch (error) {
      showToast('Approve blog failed', 'error');
    }
  };

  const handleRejectBlog = async (blogId, reason) => {
    try {
      const res = await API.put(`/blogs/${blogId}/status`, { status: 'REJECTED', rejectionReason: reason });
      if (res.data.success) {
        showToast('Blog rejected', 'info');
        setBlogsList((prev) => prev.map((b) => (b._id === blogId ? { ...b, status: 'REJECTED' } : b)));
        setRejectingItem(null);
        setRejectionReason('');
      }
    } catch (error) {
      showToast('Reject blog failed', 'error');
    }
  };

  const handleFeatureBlog = async (blog) => {
    const next = !blog.isFeatured;
    try {
      const res = await API.put(`/blogs/${blog._id}/feature`);
      if (res.data.success) {
        showToast(next ? 'Blog featured' : 'Blog removed from featured', 'success');
        setBlogsList((prev) => prev.map((b) => (b._id === blog._id ? { ...b, isFeatured: next } : b)));
      }
    } catch (error) {
      showToast('Feature blog failed', 'error');
    }
  };

  const handleDeleteBlog = async (blogId) => {
    if (!window.confirm('Delete this blog story permanently?')) return;
    try {
      const res = await API.delete(`/blogs/${blogId}`);
      if (res.data.success) {
        showToast('Blog deleted', 'success');
        setBlogsList((prev) => prev.filter((b) => b._id !== blogId));
      }
    } catch (error) {
      showToast('Delete blog failed', 'error');
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/events', eventForm);
      if (res.data.success) {
        showToast('Official event created!', 'success');
        setShowEventModal(false);
        setEventForm({ title: '', description: '', location: 'Kathmandu, Nepal', date: '', startTime: '09:00 AM', endTime: '05:00 PM', maxParticipants: 50, category: 'Community Activity' });
        fetchTabData('events');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Event creation failed', 'error');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Cancel & delete this official event?')) return;
    try {
      const res = await API.delete(`/events/${eventId}`);
      if (res.data.success) {
        showToast('Event deleted', 'success');
        setEventsList((prev) => prev.filter((e) => e._id !== eventId));
      }
    } catch (error) {
      showToast('Delete event failed', 'error');
    }
  };

  const handleFeatureEvent = async (ev) => {
    const next = !ev.isFeatured;
    try {
      const res = await API.put(`/events/${ev._id}/feature`, { isFeatured: next });
      if (res.data.success) {
        showToast(next ? 'Event featured on homepage' : 'Event removed from featured', 'success');
        setEventsList((prev) => prev.map((e) => (e._id === ev._id ? { ...e, isFeatured: next } : e)));
      }
    } catch (error) {
      showToast('Feature event failed', 'error');
    }
  };

  const handleCancelEvent = async (eventId) => {
    if (!window.confirm('Cancel this event? Participants will be notified and it will show as CANCELLED.')) return;
    try {
      const res = await API.put(`/events/${eventId}`, { status: 'CANCELLED' });
      if (res.data.success) {
        showToast('Event cancelled — participants notified', 'info');
        setEventsList((prev) => prev.map((e) => (e._id === eventId ? { ...e, status: 'CANCELLED' } : e)));
      }
    } catch (error) {
      showToast('Cancel event failed', 'error');
    }
  };

  const handleResolveReport = async (reportId, action, reasonNote = '') => {
    try {
      const res = await API.put(`/reports/${reportId}/resolve`, { action, reasonNote });
      if (res.data.success) {
        showToast(res.data.message, 'success');
        setReportsList((prev) => prev.filter((r) => r._id !== reportId));
        fetchDashboardData();
      }
    } catch (error) {
      showToast('Resolve report failed', 'error');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete comment permanently?')) return;
    try {
      const res = await API.delete(`/admin/comments/${commentId}`);
      if (res.data.success) {
        showToast('Comment deleted', 'success');
        setCommentsList((prev) => prev.filter((c) => c._id !== commentId));
      }
    } catch (error) {
      showToast('Delete comment failed', 'error');
    }
  };

  const handleVerifyUser = async (userId, memberLevel, isVerified) => {
    try {
      const res = await API.put(`/admin/users/${userId}/verify`, { memberLevel, isVerified });
      if (res.data.success) {
        showToast(`User level updated to ${memberLevel} (Verified: ${isVerified})`, 'success');
        setMembersList((prev) => prev.map((u) => (u._id === userId ? { ...u, memberLevel, isVerified } : u)));
      }
    } catch (error) {
      showToast('User verification failed', 'error');
    }
  };

  const handleSuspendUser = async (userId, isSuspended, reason) => {
    try {
      const res = await API.put(`/admin/users/${userId}/suspend`, { isSuspended, suspensionReason: reason });
      if (res.data.success) {
        showToast(res.data.message, 'info');
        setMembersList((prev) => prev.map((u) => (u._id === userId ? { ...u, isSuspended, suspensionReason: reason } : u)));
        setSuspendingUser(null);
        setSuspensionReasonInput('');
      }
    } catch (error) {
      showToast('User suspension status change failed', 'error');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Delete user account and all their contributions permanently?')) return;
    try {
      const res = await API.delete(`/admin/users/${userId}`);
      if (res.data.success) {
        showToast('User account deleted', 'success');
        setMembersList((prev) => prev.filter((u) => u._id !== userId));
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Delete user failed', 'error');
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/categories', categoryForm);
      if (res.data.success) {
        showToast('Category created and available on public site!', 'success');
        setShowCategoryModal(false);
        setCategoryForm({ name: '', description: '', iconName: 'FolderKanban', color: '#94201B' });
        fetchTabData('categories');
      }
    } catch (error) {
      showToast('Category creation failed', 'error');
    }
  };

  const handleDeleteCategory = async (catId) => {
    if (!window.confirm('Delete category?')) return;
    try {
      const res = await API.delete(`/categories/${catId}`);
      if (res.data.success) {
        showToast('Category deleted', 'success');
        setCategoriesList((prev) => prev.filter((c) => c._id !== catId));
      }
    } catch (error) {
      showToast('Delete category failed', 'error');
    }
  };

  const handleToggleCategoryActive = async (cat) => {
    const next = cat.isActive === false; // currently inactive -> activate
    try {
      const res = await API.put(`/categories/${cat._id}`, { isActive: next });
      if (res.data.success) {
        showToast(next ? 'Category activated' : 'Category deactivated (hidden from new posts)', 'success');
        setCategoriesList((prev) => prev.map((c) => (c._id === cat._id ? { ...c, isActive: next } : c)));
      }
    } catch (error) {
      showToast('Toggle category failed', 'error');
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/donations/campaigns', campaignForm);
      if (res.data.success) {
        showToast('Donation campaign launched live!', 'success');
        setShowCampaignModal(false);
        setCampaignForm({ title: '', description: '', goalAmount: 50000 });
        fetchTabData('campaigns');
      }
    } catch (error) {
      showToast('Campaign launch failed', 'error');
    }
  };

  const handleDeleteCampaign = async (campId) => {
    if (!window.confirm('Delete this donation campaign?')) return;
    try {
      const res = await API.delete(`/admin/campaigns/${campId}`);
      if (res.data.success) {
        showToast('Campaign deleted', 'success');
        setCampaignsList((prev) => prev.filter((c) => c._id !== campId));
      }
    } catch (error) {
      showToast('Delete campaign failed', 'error');
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.campaignId || !expenseForm.title || !expenseForm.amount) return;
    try {
      const res = await API.post(`/donations/campaigns/${expenseForm.campaignId}/expenses`, expenseForm);
      if (res.data.success) {
        showToast('Expense record logged into transparency ledger!', 'success');
        setShowExpenseModal(false);
        setExpenseForm({ campaignId: '', title: '', amount: '', notes: '', spentDate: '' });
        fetchTabData('expenses');
      }
    } catch (error) {
      showToast('Expense log failed', 'error');
    }
  };

  const handleDeleteExpense = async (expId) => {
    if (!window.confirm('Delete expense record?')) return;
    try {
      const res = await API.delete(`/admin/expenses/${expId}`);
      if (res.data.success) {
        showToast('Expense record deleted', 'success');
        setExpensesList((prev) => prev.filter((e) => e._id !== expId));
      }
    } catch (error) {
      showToast('Delete expense failed', 'error');
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/super-admin/staff', staffForm);
      if (res.data.success) {
        showToast(res.data.message, 'success');
        setShowStaffModal(false);
        setStaffForm({ name: '', email: '', password: '', role: 'ADMIN', permissions: ['canApprovePosts', 'canManageUsers'] });
        fetchTabData('admins');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Staff creation failed', 'error');
    }
  };

  // ---- Staff access management ----
  const loadAccessCatalog = async () => {
    if (accessCatalog) return accessCatalog;
    try {
      const res = await API.get('/super-admin/access-catalog');
      if (res.data.success) {
        setAccessCatalog(res.data.data);
        return res.data.data;
      }
    } catch (error) {
      showToast('Could not load the permission list', 'error');
    }
    return null;
  };

  const presetFor = (role, catalog = accessCatalog) => catalog?.rolePresets?.[role] || [];

  // Opens the access editor for a staff member, or for a member being promoted to staff
  const openAccessEditor = async (person) => {
    const catalog = await loadAccessCatalog();
    const role = ['ADMIN', 'MODERATOR'].includes(person.role) ? person.role : 'MODERATOR';
    const current = person.permissions?.length ? person.permissions : presetFor(role, catalog);
    setEditingAccess({ _id: person._id, name: person.name, role, permissions: current, promoting: person.role === 'USER' });
  };

  const handleSaveAccess = async (e) => {
    e.preventDefault();
    if (!editingAccess) return;
    if (editingAccess.promoting && !window.confirm(`Give ${editingAccess.name} staff access as ${editingAccess.role}?`)) return;
    try {
      const res = await API.put(`/super-admin/staff/${editingAccess._id}/permissions`, {
        role: editingAccess.role,
        permissions: editingAccess.permissions,
      });
      if (res.data.success) {
        showToast(`Access updated for ${editingAccess.name}`, 'success');
        setEditingAccess(null);
        fetchTabData(activeTab);
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to update access', 'error');
    }
  };

  const permissionLabel = (key) => accessCatalog?.permissions?.find((p) => p.key === key)?.label || key;

  const handleDeleteStaff = async (staffId) => {
    if (!window.confirm('Remove staff/admin access?')) return;
    try {
      const res = await API.delete(`/super-admin/staff/${staffId}`);
      if (res.data.success) {
        showToast('Staff user deleted', 'success');
        setMembersList((prev) => prev.filter((m) => m._id !== staffId));
      }
    } catch (error) {
      showToast('Delete staff failed', 'error');
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await API.put('/super-admin/settings', settingsData);
      if (res.data.success) {
        showToast('Platform settings saved to database & applied to frontend!', 'success');
      }
    } catch (error) {
      showToast('Settings update failed', 'error');
    }
  };

  const handleBroadcastAnnouncement = async (e) => {
    e.preventDefault();
    if (!annTitle || !annContent) return;
    try {
      const res = await API.post('/announcements', { title: annTitle, content: annContent });
      if (res.data.success) {
        showToast('Announcement broadcast to all members!', 'success');
        setAnnTitle('');
        setAnnContent('');
        setShowAnnouncementModal(false);
      }
    } catch (error) {
      showToast('Broadcast failed', 'error');
    }
  };

  const exportCSV = (data, filename) => {
    if (!data || data.length === 0) {
      showToast('No data to export', 'info');
      return;
    }
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map((row) => Object.values(row).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ---- Derived view data (same filters as before, computed once per render) ----
  const filteredPosts = postsList.filter((p) => {
    const matchSearch = !searchQuery || p.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = filterStatus === 'All' || p.status === filterStatus;
    return matchSearch && matchStatus;
  });
  const filteredMembers = membersList.filter((u) => !searchQuery || u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredOrgs = membersList
    .filter((u) => u.memberLevel === 'ORGANIZATION')
    .filter((org) => !searchQuery || org.name?.toLowerCase().includes(searchQuery.toLowerCase()) || org.email?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredVolunteers = membersList
    .filter((u) => u.role === 'USER')
    .filter((vol) => filterCategory === 'All' || vol.memberLevel === filterCategory)
    .filter((vol) => !searchQuery || vol.name?.toLowerCase().includes(searchQuery.toLowerCase()) || vol.email?.toLowerCase().includes(searchQuery.toLowerCase()));
  const staffList = membersList.filter((u) => ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'].includes(u.role));

  const NAV_GROUPS = [
    {
      label: null,
      items: [{ id: 'dashboard', label: 'Overview', icon: LayoutDashboard }],
    },
    {
      label: 'Content & moderation',
      items: [
        { id: 'approval', label: 'Approval center', icon: Clock, badge: stats.pendingApprovals, badgeTone: 'bg-marigold-tint text-marigold-text' },
        { id: 'posts', label: 'Posts', icon: FileText },
        { id: 'blogs', label: 'Blogs & stories', icon: BookOpen },
        { id: 'events', label: 'Events', icon: Calendar },
        { id: 'reports', label: 'Reports', icon: AlertTriangle, badge: stats.pendingReports, badgeTone: 'bg-brand text-white' },
        { id: 'comments', label: 'Comments', icon: MessageSquare },
      ],
    },
    {
      label: 'Community',
      items: [
        { id: 'members', label: 'Members', icon: Users },
        { id: 'orgs', label: 'Organizations', icon: Building2 },
        { id: 'volunteers', label: 'Volunteers', icon: UserPlus },
        { id: 'categories', label: 'Categories', icon: FolderKanban },
      ],
    },
    {
      label: 'Finance & donations',
      items: [
        { id: 'donations', label: 'Donations', icon: DollarSign },
        { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
        { id: 'expenses', label: 'Expenses', icon: Receipt },
      ],
    },
    {
      label: 'Sponsorship',
      items: [
        { id: 'sponsorship', label: 'Opportunities & tiers', icon: Landmark },
        { id: 'sponsorDeals', label: 'Sponsor deals', icon: Handshake },
        { id: 'sponsors', label: 'Sponsor accounts', icon: Building2 },
      ],
    },
    {
      label: 'Advertising',
      items: [
        { id: 'ads', label: 'Ad campaigns', icon: MonitorPlay },
        { id: 'adPlacements', label: 'Placements & rates', icon: LayoutTemplate },
      ],
    },
    {
      label: 'System',
      items: [
        { id: 'admins', label: 'Admins & roles', icon: ShieldAlert },
        { id: 'settings', label: 'Settings', icon: Settings },
        { id: 'logs', label: 'Activity logs', icon: Lock },
      ],
    },
  ];

  const goToTab = (tab) => {
    handleTabChange(tab);
    setSidebarOpen(false);
  };

  const renderNav = () => (
    <nav aria-label="Admin sections" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((it) => canTab(it.id)) }))
        .filter((g) => g.items.length > 0)
        .map((group, gi) => (
        <div key={gi} className="space-y-0.5">
          {group.label && (
            <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">{group.label}</p>
          )}
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => goToTab(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`group relative flex min-h-10 w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
                  active ? 'bg-brand-tint font-semibold text-brand' : 'font-medium text-ink-soft hover:bg-paper hover:text-ink'
                }`}
              >
                {active && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-brand" aria-hidden="true" />}
                <span className="flex items-center gap-2.5">
                  <Icon className={`h-[18px] w-[18px] ${active ? 'text-brand' : 'text-muted group-hover:text-ink'}`} aria-hidden="true" />
                  {item.label}
                </span>
                {item.badge > 0 && (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${item.badgeTone}`}>{item.badge}</span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );

  const renderProfileFooter = () => (
    <div className="flex items-center justify-between gap-2 border-t border-sand p-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <Avatar name={user?.name || 'Super Admin'} src={user?.profilePicture} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight text-ink">{user?.name || 'Super Admin'}</p>
          <p className="truncate text-xs text-muted">{user?.role || 'SUPER_ADMIN'}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={logout}
        aria-label="Log out"
        title="Log out"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-brand-tint hover:text-brand"
      >
        <LogOut className="h-[18px] w-[18px]" />
      </button>
    </div>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-paper font-sans text-ink">

      {/* SIDEBAR — desktop */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sand bg-white lg:flex">
        <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-sand px-5">
          <img src="/logo-mark.png" alt="" className="h-9 w-9 object-contain" />
          <div className="leading-tight">
            <p className="font-display text-lg font-bold text-ink">Command center</p>
            <p className="deva text-xs text-muted">
              हातेमालो · {isSuperAdmin ? 'Super admin' : user?.role === 'ADMIN' ? 'Admin' : 'Moderator'}
            </p>
          </div>
        </div>
        {renderNav()}
        {renderProfileFooter()}
      </aside>

      {/* SIDEBAR — mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin navigation">
          <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm animate-in" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[min(18rem,85vw)] flex-col bg-white shadow-[var(--shadow-lift)] animate-rise">
            <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-sand px-4">
              <div className="flex items-center gap-2.5">
                <img src="/logo-mark.png" alt="" className="h-8 w-8 object-contain" />
                <p className="font-display text-lg font-bold text-ink">Command center</p>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close navigation"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-paper hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {renderNav()}
            {renderProfileFooter()}
          </aside>
        </div>
      )}

      {/* MAIN COLUMN */}
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">

        {/* TOP BAR */}
        <header className="shrink-0 border-b border-sand bg-white/90 backdrop-blur">
          <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 sm:flex-nowrap sm:gap-3 sm:px-6 lg:h-16 lg:px-8">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Open navigation"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-paper lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex min-w-0 items-center gap-2 lg:hidden">
              <img src="/logo-mark.png" alt="" className="h-8 w-8 shrink-0 object-contain" />
              <p className="truncate font-display text-base font-bold text-ink">Command center</p>
            </div>

            <div className="order-last w-full sm:order-none sm:w-auto sm:max-w-md sm:flex-1">
              <div className="relative">
                <label htmlFor="admin-global-search" className="sr-only">Search the current section</label>
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                <input
                  id="admin-global-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search this section…"
                  className="field !rounded-full !py-2 !pl-10 !pr-10"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-paper hover:text-ink"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => {
                  fetchTabData(activeTab);
                  setSponsorRefresh((k) => k + 1);
                }}
                aria-label="Refresh live data"
                title="Refresh live data"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-soft hover:bg-paper"
              >
                <RefreshCw className="h-[18px] w-[18px]" />
              </button>

              <Link to="/" className="btn btn-sm btn-ghost min-h-10" aria-label="View site">
                <Globe className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">View site</span>
              </Link>

              <div className="hidden items-center gap-2 border-l border-sand pl-3 md:flex">
                <Avatar name={user?.name || 'Super Admin'} src={user?.profilePicture} size="sm" />
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-ink">{user?.name || 'Super Admin'}</p>
                  <p className="text-xs text-muted">{user?.role || 'SUPER_ADMIN'}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* SCROLLABLE BODY */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">

          {/* ========================================================================= */}
          {/* TAB 1: OVERVIEW DASHBOARD */}
          {/* ========================================================================= */}
          {activeTab === 'dashboard' && (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="eyebrow deva">नमस्ते</p>
                  <h1 className="mt-1 text-3xl font-bold text-ink sm:text-4xl">Namaste, {user?.name?.split(' ')[0] || 'Admin'}</h1>
                  <p className="mt-1 text-muted">Here's what's happening on हातेमालो today.</p>
                </div>
                <div className="chip self-start border border-sand bg-white py-1.5 text-ink-soft sm:self-auto">
                  <Calendar className="h-4 w-4 text-muted" aria-hidden="true" />
                  {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>

              {/* KEY STATS */}
              {loading ? (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 lg:gap-4">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className={`h-[118px] animate-pulse rounded-[var(--radius-card)] bg-paper-deep ${i === 4 ? 'col-span-2 lg:col-span-1' : ''}`} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 lg:gap-4">
                  <KpiTile label="Total members" value={stats.totalMembers.toLocaleString()} hint="Registered users" icon={Users} tone="bg-brand-tint text-brand" />
                  <KpiTile label="Active activities" value={stats.activeActivities} hint="Approved & live" hintClass="text-pine" icon={FolderKanban} tone="bg-pine-tint text-pine" />
                  <KpiTile label="Upcoming events" value={stats.upcomingEvents} hint="Official events" icon={Calendar} tone="bg-sky-tint text-sky-ink" />
                  <KpiTile label="Pending approvals" value={stats.pendingApprovals} hint="Review queue" hintClass="text-marigold-text" icon={Clock} tone="bg-marigold-tint text-marigold-text" />
                  {can('canViewDonations') && (
                    <KpiTile label="Total donations" value={stats.totalDonations} hint="Voluntary funds" hintClass="text-pine" icon={DollarSign} tone="bg-pine-tint text-pine" className="col-span-2 lg:col-span-1" />
                  )}
                </div>
              )}

              {(can('canManageSponsorships') || can('canManageSponsorFinance')) && (
                <SponsorshipOverviewCard onOpen={handleTabChange} />
              )}

              {/* CHARTS ROW */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <div className="card flex flex-col p-5 lg:col-span-7">
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="text-lg font-bold text-ink">Member growth</h2>
                    <span className="text-xs font-medium text-muted">Last 30 days</span>
                  </div>
                  <div className="mt-3 h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={activityOverviewData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                        <defs>
                          <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#B5232C" stopOpacity={0.28} />
                            <stop offset="95%" stopColor="#B5232C" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DFD2" />
                        <XAxis dataKey="date" stroke="#6B6157" fontSize={11} tickLine={false} axisLine={{ stroke: '#E8DFD2' }} />
                        <YAxis stroke="#6B6157" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #E8DFD2', borderRadius: '12px', fontSize: '12px', color: '#1F1B16', boxShadow: '0 4px 16px -4px rgb(31 27 22 / 0.12)' }}
                          cursor={{ stroke: '#E8DFD2' }}
                        />
                        <Area type="monotone" dataKey="val" name="Members" stroke="#B5232C" strokeWidth={2} fillOpacity={1} fill="url(#actGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="card flex flex-col p-5 lg:col-span-5">
                  <h2 className="text-lg font-bold text-ink">Activities by category</h2>
                  {categoryDonutData.length > 0 ? (
                    <div className="mt-3 flex flex-1 flex-col items-center gap-4 sm:flex-row">
                      <div className="relative h-40 w-40 shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={categoryDonutData} innerRadius={44} outerRadius={70} paddingAngle={2} dataKey="value" stroke="#ffffff" strokeWidth={2}>
                              {categoryDonutData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #E8DFD2', borderRadius: '12px', fontSize: '12px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <ul className="max-h-44 w-full flex-1 space-y-1.5 overflow-y-auto text-sm">
                        {categoryDonutData.map((item, idx) => (
                          <li key={idx} className="flex items-center justify-between gap-2">
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
                              <span className="truncate text-ink-soft">{item.name}</span>
                            </span>
                            <span className="font-semibold tabular-nums text-ink">{item.value}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <EmptyBlock icon={FolderKanban}>No posts in any category yet.</EmptyBlock>
                  )}
                </div>
              </div>

              {/* RECENT ACTIVITIES & QUICK ACTIONS */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="card flex flex-col p-5">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg font-bold text-ink">Recent activities</h2>
                    <button type="button" onClick={() => handleTabChange('posts')} className="text-sm font-semibold text-brand hover:underline">
                      View all
                    </button>
                  </div>
                  {recentActivitiesList.length > 0 ? (
                    <ul className="mt-3 divide-y divide-sand">
                      {recentActivitiesList.map((act) => (
                        <li key={act._id} className="flex items-center justify-between gap-3 py-2.5">
                          <div className="flex min-w-0 items-center gap-3">
                            {act.images?.[0] ? (
                              <img src={act.images[0]} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" />
                            ) : (
                              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-paper-deep text-muted">
                                <ImageOff className="h-4 w-4" aria-hidden="true" />
                              </span>
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold leading-tight text-ink">{act.title}</p>
                              <p className="truncate text-xs text-muted">{act.category} · {act.location}</p>
                            </div>
                          </div>
                          <StatusChip status={act.status} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <EmptyBlock>No posts have been submitted yet.</EmptyBlock>
                  )}
                </div>

                <div className="card p-5">
                  <h2 className="text-lg font-bold text-ink">Quick actions</h2>
                  <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {[
                      { label: 'Create announcement', icon: Megaphone, tone: 'bg-brand-tint text-brand', onClick: () => setShowAnnouncementModal(true), allowed: can('canSendNotifications') },
                      { label: 'Create event', icon: Calendar, tone: 'bg-sky-tint text-sky-ink', onClick: () => setShowEventModal(true), allowed: can('canManageEvents') },
                      { label: 'Add new staff', icon: UserPlus, tone: 'bg-pine-tint text-pine', onClick: async () => { const catalog = await loadAccessCatalog(); setStaffForm((f) => ({ ...f, permissions: presetFor(f.role, catalog) })); setShowStaffModal(true); }, allowed: isSuperAdmin },
                      { label: 'Manage categories', icon: FolderKanban, tone: 'bg-marigold-tint text-marigold-text', onClick: () => setShowCategoryModal(true), allowed: can('canManageCategories') },
                      { label: 'Launch campaign', icon: DollarSign, tone: 'bg-pine-tint text-pine', onClick: () => setShowCampaignModal(true), allowed: can('canManageDonations') },
                      { label: 'Platform settings', icon: Settings, tone: 'bg-paper-deep text-ink-soft', onClick: () => handleTabChange('settings'), allowed: isSuperAdmin },
                      { label: 'Review queue', icon: Clock, tone: 'bg-marigold-tint text-marigold-text', onClick: () => handleTabChange('approval'), allowed: can('canApprovePosts') && !isSuperAdmin },
                      { label: 'Open reports', icon: AlertTriangle, tone: 'bg-brand-tint text-brand', onClick: () => handleTabChange('reports'), allowed: can('canManageReports') && !isSuperAdmin },
                    ].filter((qa) => qa.allowed).map((qa) => {
                      const QIcon = qa.icon;
                      return (
                        <button
                          key={qa.label}
                          type="button"
                          onClick={qa.onClick}
                          className="card-hover flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-2xl border border-sand bg-white p-3 text-center"
                        >
                          <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${qa.tone}`}>
                            <QIcon className="h-[18px] w-[18px]" aria-hidden="true" />
                          </span>
                          <span className="text-sm font-semibold leading-tight text-ink">{qa.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: APPROVAL CENTER */}
          {/* ========================================================================= */}
          {activeTab === 'approval' && (
            <Panel
              title="Approval center"
              description="Review pending submissions before they are published publicly."
              actions={<span className="chip bg-marigold-tint text-marigold-text">{pendingApprovalsList.length} pending review</span>}
            >
              <DataTable head={['Submission', 'Category', 'Creator / author', 'Submitted', { label: 'Actions', right: true }]}>
                {pendingApprovalsList.length > 0 ? (
                  pendingApprovalsList.map((item) => (
                    <tr key={item._id} className={ROW}>
                      <td className={TD_TEXT}>
                        <p className="font-semibold text-ink">{item.title}</p>
                        <p className="line-clamp-1 text-xs text-muted">{item.description}</p>
                      </td>
                      <td className={TD}><span className="chip bg-paper-deep text-ink-soft">{item.category}</span></td>
                      <td className={`${TD} text-ink-soft`}>{item.creator?.name || item.author?.name || 'Member'}</td>
                      <td className={`${TD} whitespace-nowrap text-muted`}>{new Date(item.createdAt).toLocaleDateString()}</td>
                      <td className={TD}>
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => handleApprovePost(item._id)} className={BTN_APPROVE}>
                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Approve
                          </button>
                          <button type="button" onClick={() => setRejectingItem({ id: item._id, type: 'POST' })} className={BTN_DANGER}>
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <EmptyRow colSpan={5}>The review queue is empty — every submission has been reviewed.</EmptyRow>
                )}
              </DataTable>
            </Panel>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: POSTS MODERATION */}
          {/* ========================================================================= */}
          {activeTab === 'posts' && (
            <Panel
              title="Community help posts"
              count={postsList.length}
              description="Manage approved, pending and rejected mutual-aid posts."
              actions={
                <>
                  <label htmlFor="posts-status-filter" className="sr-only">Filter by status</label>
                  <select id="posts-status-filter" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="field !w-auto !py-2">
                    <option value="All">All statuses</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="PENDING">PENDING</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                  <button type="button" onClick={() => exportCSV(postsList, 'hateymalo_posts')} className={BTN_GHOST}>
                    <Download className="h-4 w-4" aria-hidden="true" /> Export CSV
                  </button>
                </>
              }
            >
              <DataTable head={['Title', 'Category', 'Location', 'Creator', 'Status', { label: 'Actions', right: true }]} minWidth="min-w-[860px]">
                {filteredPosts.length > 0 ? (
                  filteredPosts.map((post) => (
                    <tr key={post._id} className={ROW}>
                      <td className={`${TD_TEXT} font-semibold text-ink`}><Link to={`/post/${post._id}`} target="_blank" rel="noopener noreferrer" title={post.title} className="line-clamp-2 hover:text-brand hover:underline">{post.title}</Link></td>
                      <td className={TD}><span className="chip bg-paper-deep text-ink-soft">{post.category}</span></td>
                      <td className={`${TD_TEXT} text-ink-soft`}><span className="line-clamp-2">{post.location}</span></td>
                      <td className={`${TD} text-ink-soft`}>{post.creator?.name || 'Member'}</td>
                      <td className={TD}><StatusChip status={post.status} /></td>
                      <td className={TD}>
                        <div className="flex justify-end gap-2">
                          {post.status !== 'APPROVED' && (
                            <button type="button" onClick={() => handleApprovePost(post._id)} className={BTN_APPROVE}>Approve</button>
                          )}
                          {post.status === 'PENDING' && (
                            <button type="button" onClick={() => setRejectingItem({ id: post._id, type: 'POST' })} className={BTN_GHOST}>Reject</button>
                          )}
                          {post.status === 'APPROVED' && (
                            <FeatureButton featured={post.isFeatured} onClick={() => handleFeaturePost(post._id, !post.isFeatured)} />
                          )}
                          {can('canDeletePosts') && (<button type="button" onClick={() => handleDeletePost(post._id)} className={BTN_DANGER}>
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
                          </button>)}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <EmptyRow colSpan={6}>{postsList.length > 0 ? 'No posts match this search or filter.' : 'No posts yet.'}</EmptyRow>
                )}
              </DataTable>
            </Panel>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: BLOGS MODERATION */}
          {/* ========================================================================= */}
          {activeTab === 'blogs' && (
            <Panel title="Stories & blog submissions" count={blogsList.length} description="Moderate community stories and editorial blogs.">
              <DataTable head={['Title', 'Author', 'Category', 'Status', { label: 'Actions', right: true }]} minWidth="min-w-[820px]">
                {blogsList.length > 0 ? (
                  blogsList.map((blog) => (
                    <tr key={blog._id} className={ROW}>
                      <td className={`${TD_TEXT} font-semibold text-ink`}><Link to={`/blogs/${blog._id}`} target="_blank" rel="noopener noreferrer" title={blog.title} className="line-clamp-2 hover:text-brand hover:underline">{blog.title}</Link></td>
                      <td className={`${TD} text-ink-soft`}>{blog.author?.name || 'Author'}</td>
                      <td className={`${TD} text-ink-soft`}>{blog.category}</td>
                      <td className={TD}><StatusChip status={blog.status} /></td>
                      <td className={TD}>
                        <div className="flex justify-end gap-2">
                          {blog.status !== 'APPROVED' && (
                            <button type="button" onClick={() => handleApproveBlog(blog._id)} className={BTN_APPROVE}>Approve</button>
                          )}
                          {blog.status === 'PENDING' && (
                            <button type="button" onClick={() => setRejectingItem({ id: blog._id, type: 'BLOG' })} className={BTN_GHOST}>Reject</button>
                          )}
                          {blog.status === 'APPROVED' && (
                            <FeatureButton featured={blog.isFeatured} onClick={() => handleFeatureBlog(blog)} />
                          )}
                          {can('canDeletePosts') && (<button type="button" onClick={() => handleDeleteBlog(blog._id)} className={BTN_DANGER}>
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
                          </button>)}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <EmptyRow colSpan={5}>No blog stories have been submitted yet.</EmptyRow>
                )}
              </DataTable>
            </Panel>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: OFFICIAL EVENTS */}
          {/* ========================================================================= */}
          {activeTab === 'events' && (
            <Panel
              title="Official events"
              count={eventsList.length}
              description="Manage official platform events and participant rosters."
              actions={
                <button type="button" onClick={() => setShowEventModal(true)} className="btn btn-sm btn-primary min-h-10">
                  <Plus className="h-4 w-4" aria-hidden="true" /> Create official event
                </button>
              }
            >
              {eventsList.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
                  {eventsList.map((ev) => (
                    <article key={ev._id} className="card card-hover flex flex-col gap-3 p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusChip status={ev.status} />
                          {ev.isFeatured && (
                            <span className="chip bg-marigold-tint text-marigold-text">
                              <Star className="h-3 w-3 fill-current" aria-hidden="true" /> Featured
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteEvent(ev._id)}
                          aria-label={`Delete event ${ev.title}`}
                          className="-mr-2 -mt-2 inline-flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-brand-tint hover:text-brand"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold leading-snug text-ink">{ev.title}</h3>
                        <p className="mt-1 line-clamp-2 text-sm text-muted">{ev.description}</p>
                      </div>
                      <ul className="space-y-1.5 border-t border-sand pt-3 text-sm text-ink-soft">
                        <li className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                          {new Date(ev.date).toLocaleDateString()}
                          <span className="text-muted">·</span>
                          <Clock className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                          {ev.startTime} – {ev.endTime}
                        </li>
                        <li className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                          <span className="truncate">{ev.location}</span>
                        </li>
                        <li className="flex items-center gap-2 font-semibold text-ink">
                          <Users className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                          {ev.joinedUsers?.length || 0} / {ev.maxParticipants} registered
                        </li>
                      </ul>
                      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                        <FeatureButton featured={ev.isFeatured} onClick={() => handleFeatureEvent(ev)} />
                        {ev.status !== 'CANCELLED' && (
                          <button type="button" onClick={() => handleCancelEvent(ev._id)} className={BTN_GHOST}>
                            <Ban className="h-3.5 w-3.5" aria-hidden="true" /> Cancel event
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyBlock
                  icon={Calendar}
                  action={
                    <button type="button" onClick={() => setShowEventModal(true)} className="btn btn-sm btn-primary min-h-10">
                      <Plus className="h-4 w-4" aria-hidden="true" /> Create the first event
                    </button>
                  }
                >
                  No official events yet.
                </EmptyBlock>
              )}
            </Panel>
          )}

          {/* ========================================================================= */}
          {/* TAB 6: REPORTS MODERATION */}
          {/* ========================================================================= */}
          {activeTab === 'reports' && (
            <Panel title="Safety & moderation reports" count={reportsList.length} description="Review reported items and enforce community safety rules.">
              <DataTable head={['Reported item', 'Reason', 'Reporter', 'Date', { label: 'Moderation action', right: true }]} minWidth="min-w-[1000px]">
                {reportsList.length > 0 ? (
                  reportsList.map((rep) => (
                    <tr key={rep._id} className={ROW}>
                      <td className={TD_TEXT}>
                        <span className="chip mb-1 bg-brand-tint text-brand">{rep.targetType}</span>
                        <p className="line-clamp-2 font-semibold text-ink">{rep.targetDoc?.title || rep.targetDoc?.content || rep.targetId}</p>
                      </td>
                      <td className={`${TD_TEXT} font-medium text-brand`}><span className="line-clamp-2">{rep.reason}</span></td>
                      <td className={`${TD} text-ink-soft`}>{rep.reporter?.name || 'Member'}</td>
                      <td className={`${TD} whitespace-nowrap text-muted`}>{new Date(rep.createdAt).toLocaleDateString()}</td>
                      <td className={TD}>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <button type="button" onClick={() => handleResolveReport(rep._id, 'DISMISS')} className={BTN_GHOST}>Dismiss</button>
                          <button type="button" onClick={() => handleResolveReport(rep._id, 'WARN_USER', 'Please review community guidelines')} className="btn btn-sm min-h-10 bg-marigold-tint text-marigold-text hover:bg-[#F8E3BC]">Warn</button>
                          <button type="button" onClick={() => handleResolveReport(rep._id, 'REMOVE_CONTENT')} className={BTN_DANGER}>Remove content</button>
                          <button type="button" onClick={() => handleResolveReport(rep._id, 'SUSPEND_USER', 'Repeated reported safety violations')} className="btn btn-sm min-h-10 bg-ink text-white hover:bg-ink-soft">Suspend</button>
                          <button type="button" onClick={() => { if (window.confirm('Permanently BAN this user? This blocks all access.')) handleResolveReport(rep._id, 'BAN_USER', 'Severe or repeated policy violations'); }} className="btn btn-sm btn-primary min-h-10">
                            <Ban className="h-3.5 w-3.5" aria-hidden="true" /> Ban
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <EmptyRow colSpan={5}>No safety reports are waiting for review.</EmptyRow>
                )}
              </DataTable>
            </Panel>
          )}

          {/* ========================================================================= */}
          {/* TAB 7: COMMENTS CONTROL */}
          {/* ========================================================================= */}
          {activeTab === 'comments' && (
            <Panel title="Comments moderation" count={commentsList.length} description="Monitor and remove abusive or spam comments.">
              <DataTable head={['Comment', 'Author', 'Post', { label: 'Actions', right: true }]}>
                {commentsList.length > 0 ? (
                  commentsList.map((com) => (
                    <tr key={com._id} className={ROW}>
                      <td className={`${TD_TEXT} text-ink`}><span className="line-clamp-2" title={com.content}>{com.content}</span></td>
                      <td className={`${TD} text-ink-soft`}>{com.author?.name || 'Member'}</td>
                      <td className={`${TD_TEXT} text-muted`}><span className="line-clamp-2">{com.post?.title || 'Post'}</span></td>
                      <td className={TD}>
                        <div className="flex justify-end">
                          <button type="button" onClick={() => handleDeleteComment(com._id)} className={BTN_DANGER}>
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <EmptyRow colSpan={4}>No comments to moderate.</EmptyRow>
                )}
              </DataTable>
            </Panel>
          )}

          {/* ========================================================================= */}
          {/* TAB 8: MEMBERS DIRECTORY */}
          {/* ========================================================================= */}
          {activeTab === 'members' && (
            <Panel
              title="Members directory"
              count={membersList.length}
              description="Accounts, roles, verification levels and suspension status."
              actions={
                <button type="button" onClick={() => exportCSV(membersList, 'hateymalo_members')} className={BTN_GHOST}>
                  <Download className="h-4 w-4" aria-hidden="true" /> Export CSV
                </button>
              }
            >
              <DataTable head={['Member', 'Role', 'Member level', 'Verification', 'Status', { label: 'Actions', right: true }]} minWidth="min-w-[900px]">
                {filteredMembers.length > 0 ? (
                  filteredMembers.map((m) => (
                    <tr key={m._id} className={ROW}>
                      <td className={TD}>
                        <div className="flex items-center gap-3">
                          <Avatar name={m.name} src={m.profilePicture} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-ink">{m.name}</p>
                            <p className="truncate text-xs text-muted">{m.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className={TD}><span className="chip bg-paper-deep text-ink-soft">{m.role}</span></td>
                      <td className={`${TD} text-ink-soft`}>{m.memberLevel}</td>
                      <td className={TD}>
                        <button
                          type="button"
                          onClick={() => handleVerifyUser(m._id, m.memberLevel, !m.isVerified)}
                          title={m.isVerified ? 'Click to remove verification' : 'Click to verify'}
                          className={`btn btn-sm min-h-10 ${m.isVerified ? 'bg-pine-tint text-pine hover:bg-[#D5E7DD]' : 'btn-ghost text-muted'}`}
                        >
                          {m.isVerified ? <><BadgeCheck className="h-4 w-4" aria-hidden="true" /> Verified</> : 'Unverified'}
                        </button>
                      </td>
                      <td className={TD}>
                        {m.isSuspended ? (
                          <span className="chip bg-brand-tint text-brand" title={m.suspensionReason}>
                            <Ban className="h-3 w-3" aria-hidden="true" /> Suspended
                          </span>
                        ) : (
                          <span className="chip bg-pine-tint text-pine">Active</span>
                        )}
                      </td>
                      <td className={TD}>
                        <div className="flex justify-end gap-2">
                          {isSuperAdmin && m.role === 'USER' && (
                            <button type="button" onClick={() => openAccessEditor(m)} className={BTN_GHOST} title="Give this member moderator or admin access">
                              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Make staff
                            </button>
                          )}
                          <button type="button" onClick={() => setSuspendingUser(m)} className="btn btn-sm min-h-10 bg-marigold-tint text-marigold-text hover:bg-[#F8E3BC]">
                            {m.isSuspended ? 'Unsuspend' : 'Suspend'}
                          </button>
                          {can('canDeleteUsers') && (<button type="button" onClick={() => handleDeleteUser(m._id)} className={BTN_DANGER}>
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
                          </button>)}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <EmptyRow colSpan={6}>{membersList.length > 0 ? 'No members match this search.' : 'No members found.'}</EmptyRow>
                )}
              </DataTable>
            </Panel>
          )}

          {/* ========================================================================= */}
          {/* TAB 9: ORGANIZATIONS */}
          {/* ========================================================================= */}
          {activeTab === 'orgs' && (
            <Panel
              title="NGOs & partner organizations"
              description="Register institutions, verify NGO credentials and review partner profiles."
              actions={
                <>
                  <button type="button" onClick={() => exportCSV(membersList.filter((u) => u.memberLevel === 'ORGANIZATION'), 'hateymalo_organizations')} className={BTN_GHOST}>
                    <Download className="h-4 w-4" aria-hidden="true" /> Export CSV
                  </button>
                  {can('canManageOrganizations') && (<button type="button" onClick={() => setShowOrgModal(true)} className="btn btn-sm btn-primary min-h-10">
                    <Plus className="h-4 w-4" aria-hidden="true" /> Add organization
                  </button>)}
                </>
              }
            >
              <div className="border-b border-sand px-5 py-4">
                <SearchField id="orgs-search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search organization name or email…" />
              </div>
              <DataTable head={['Organization', 'Reg no. / type', 'Location', 'Verification', { label: 'Actions', right: true }]} minWidth="min-w-[860px]">
                {filteredOrgs.length > 0 ? (
                  filteredOrgs.map((org) => (
                    <tr key={org._id} className={ROW}>
                      <td className={TD}>
                        <div className="flex items-center gap-3">
                          <Avatar name={org.name} src={org.profilePicture} size="sm" rounded="rounded-xl" />
                          <div className="min-w-0">
                            <Link to={`/profile/${org._id}`} target="_blank" className="flex items-center gap-1 font-semibold text-ink hover:text-brand hover:underline">
                              {org.name} <ExternalLink className="h-3 w-3 text-muted" aria-hidden="true" />
                            </Link>
                            <p className="truncate text-xs text-muted">{org.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className={TD}>
                        <span className="chip bg-paper-deep font-mono text-ink-soft">{org.orgDetails?.regNumber || 'REG-ACTIVE'}</span>
                        <p className="mt-0.5 text-xs text-muted">{org.orgDetails?.orgType || 'NGO'}</p>
                      </td>
                      <td className={`${TD} text-ink-soft`}>{org.location || 'Nepal'}</td>
                      <td className={TD}>
                        <button
                          type="button"
                          onClick={() => handleVerifyUser(org._id, 'ORGANIZATION', !org.isVerified)}
                          className={`btn btn-sm min-h-10 ${org.isVerified ? 'bg-pine-tint text-pine hover:bg-[#D5E7DD]' : 'bg-marigold-tint text-marigold-text hover:bg-[#F8E3BC]'}`}
                        >
                          {org.isVerified ? <><BadgeCheck className="h-4 w-4" aria-hidden="true" /> Verified NGO</> : <><ShieldCheck className="h-4 w-4" aria-hidden="true" /> Verify org</>}
                        </button>
                      </td>
                      <td className={TD}>
                        <div className="flex justify-end gap-2">
                          <Link to={`/profile/${org._id}`} target="_blank" className={BTN_GHOST}>View</Link>
                          {can('canDeleteUsers') && (<button type="button" onClick={() => handleDeleteUser(org._id)} className={BTN_DANGER}>
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
                          </button>)}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <EmptyRow colSpan={5}>{searchQuery ? 'No organizations match this search.' : 'No organizations registered yet.'}</EmptyRow>
                )}
              </DataTable>
            </Panel>
          )}

          {/* ========================================================================= */}
          {/* TAB 10: VOLUNTEERS */}
          {/* ========================================================================= */}
          {activeTab === 'volunteers' && (
            <Panel
              title="Volunteers & tiers"
              description="Manage volunteer levels and verify credentials."
              actions={
                <button type="button" onClick={() => exportCSV(membersList.filter((u) => u.role === 'USER'), 'hateymalo_volunteers')} className={BTN_GHOST}>
                  <Download className="h-4 w-4" aria-hidden="true" /> Export volunteers CSV
                </button>
              }
            >
              <div className="flex flex-col gap-3 border-b border-sand px-5 py-4 sm:flex-row sm:items-center">
                <SearchField id="volunteers-search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search volunteer name or email…" />
                <label htmlFor="volunteer-tier-filter" className="sr-only">Filter by volunteer tier</label>
                <select
                  id="volunteer-tier-filter"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="field sm:!w-auto"
                >
                  <option value="All">All volunteer tiers</option>
                  <option value="VOLUNTEER">Volunteer</option>
                  <option value="SENIOR_VOLUNTEER">Senior Volunteer</option>
                  <option value="COMMUNITY_LEAD">Community Lead</option>
                  <option value="MEMBER">General Member</option>
                </select>
              </div>
              <DataTable head={['Volunteer', 'Location', 'Tier level', 'Verification', { label: 'Actions', right: true }]} minWidth="min-w-[860px]">
                {filteredVolunteers.length > 0 ? (
                  filteredVolunteers.map((vol) => (
                    <tr key={vol._id} className={ROW}>
                      <td className={TD}>
                        <div className="flex items-center gap-3">
                          <Avatar name={vol.name} src={vol.profilePicture} size="sm" />
                          <div className="min-w-0">
                            <Link to={`/profile/${vol._id}`} target="_blank" className="flex items-center gap-1 font-semibold text-ink hover:text-brand hover:underline">
                              {vol.name} <ExternalLink className="h-3 w-3 text-muted" aria-hidden="true" />
                            </Link>
                            <p className="truncate text-xs text-muted">{vol.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className={`${TD} text-ink-soft`}>{vol.location || 'Nepal'}</td>
                      <td className={TD}>
                        <label htmlFor={`tier-${vol._id}`} className="sr-only">Tier level for {vol.name}</label>
                        <select
                          id={`tier-${vol._id}`}
                          value={vol.memberLevel || 'MEMBER'}
                          onChange={(e) => handleVerifyUser(vol._id, e.target.value, vol.isVerified)}
                          className="field !w-auto !py-2 !text-xs"
                        >
                          <option value="MEMBER">Member</option>
                          <option value="VOLUNTEER">Volunteer</option>
                          <option value="SENIOR_VOLUNTEER">Senior Volunteer</option>
                          <option value="COMMUNITY_LEAD">Community Lead</option>
                        </select>
                      </td>
                      <td className={TD}>
                        <button
                          type="button"
                          onClick={() => handleVerifyUser(vol._id, vol.memberLevel, !vol.isVerified)}
                          className={`btn btn-sm min-h-10 ${vol.isVerified ? 'bg-pine-tint text-pine hover:bg-[#D5E7DD]' : 'btn-ghost text-muted'}`}
                        >
                          {vol.isVerified ? <><BadgeCheck className="h-4 w-4" aria-hidden="true" /> Verified</> : 'Verify'}
                        </button>
                      </td>
                      <td className={TD}>
                        <div className="flex justify-end gap-2">
                          <Link to={`/profile/${vol._id}`} target="_blank" className={BTN_GHOST}>Profile</Link>
                          {can('canDeleteUsers') && (<button type="button" onClick={() => handleDeleteUser(vol._id)} className={BTN_DANGER}>
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
                          </button>)}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <EmptyRow colSpan={5}>No volunteers match this search or tier.</EmptyRow>
                )}
              </DataTable>
            </Panel>
          )}

          {/* ========================================================================= */}
          {/* TAB 11: DYNAMIC CATEGORIES */}
          {/* ========================================================================= */}
          {activeTab === 'categories' && (
            <Panel
              title="Activity categories"
              count={categoriesList.length}
              description="Categories added here appear on the public post and blog forms."
              actions={
                <button type="button" onClick={() => setShowCategoryModal(true)} className="btn btn-sm btn-primary min-h-10">
                  <Plus className="h-4 w-4" aria-hidden="true" /> Add category
                </button>
              }
            >
              {categoriesList.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
                  {categoriesList.map((cat) => (
                    <div key={cat._id} className={`flex items-center justify-between gap-3 rounded-2xl border border-sand p-4 ${cat.isActive === false ? 'bg-paper opacity-75' : 'bg-white'}`}>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-ink">{cat.name}</h3>
                          <span className={`chip ${cat.isActive === false ? 'bg-paper-deep text-muted' : 'bg-pine-tint text-pine'}`}>
                            {cat.isActive === false ? 'Inactive' : 'Active'}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-sm text-muted">{cat.description || 'Activity Category'}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleCategoryActive(cat)}
                          className={cat.isActive === false ? BTN_APPROVE : BTN_GHOST}
                        >
                          {cat.isActive === false ? 'Activate' : 'Deactivate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat._id)}
                          aria-label={`Delete category ${cat.name}`}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-brand-tint hover:text-brand"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyBlock icon={FolderKanban}>No categories yet.</EmptyBlock>
              )}
            </Panel>
          )}

          {/* ========================================================================= */}
          {/* TAB 12: DONATIONS LEDGER */}
          {/* ========================================================================= */}
          {activeTab === 'donations' && (
            <Panel
              title="Donations ledger"
              count={donationsList.length}
              description="Audit all incoming voluntary contributions."
              actions={
                <button type="button" onClick={() => exportCSV(donationsList, 'hateymalo_donations')} className={BTN_GHOST}>
                  <Download className="h-4 w-4" aria-hidden="true" /> Export ledger CSV
                </button>
              }
            >
              <DataTable head={['Transaction ID', 'Donor', 'Amount (NPR)', 'Payment method', 'Type', 'Date']} minWidth="min-w-[820px]">
                {donationsList.length > 0 ? (
                  donationsList.map((d) => (
                    <tr key={d._id} className={ROW}>
                      <td className={`${TD} font-mono text-xs text-ink-soft`}>{d.transactionId}</td>
                      <td className={`${TD} font-medium text-ink`}>{d.donor?.name || 'Anonymous Donor'}</td>
                      <td className={`${TD} whitespace-nowrap font-bold tabular-nums text-pine`}>Rs. {d.amount.toLocaleString()}</td>
                      <td className={TD}><span className="chip bg-sky-tint text-sky-ink">{d.paymentMethod}</span></td>
                      <td className={`${TD} text-ink-soft`}>{d.type}</td>
                      <td className={`${TD} whitespace-nowrap text-muted`}>{new Date(d.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))
                ) : (
                  <EmptyRow colSpan={6}>No donations recorded yet.</EmptyRow>
                )}
              </DataTable>
            </Panel>
          )}

          {/* ========================================================================= */}
          {/* TAB 13: CAMPAIGNS */}
          {/* ========================================================================= */}
          {activeTab === 'campaigns' && (
            <Panel
              title="Fundraising campaigns"
              count={campaignsList.length}
              description="Manage campaign targets, collected funds and status."
              actions={
                can('canManageDonations') && (<button type="button" onClick={() => setShowCampaignModal(true)} className="btn btn-sm btn-primary min-h-10">
                  <Plus className="h-4 w-4" aria-hidden="true" /> Launch campaign
                </button>)
              }
            >
              {campaignsList.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
                  {campaignsList.map((c) => {
                    const pct = c.goalAmount > 0 ? Math.min(100, Math.round(((c.raisedAmount || 0) / c.goalAmount) * 100)) : 0;
                    return (
                      <article key={c._id} className="card card-hover flex flex-col gap-3 p-5">
                        <div className="flex items-center justify-between gap-2">
                          <StatusChip status={c.status} />
                          {can('canManageDonations') && (<button
                            type="button"
                            onClick={() => handleDeleteCampaign(c._id)}
                            aria-label={`Delete campaign ${c.title}`}
                            className="-mr-2 -mt-1 inline-flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-brand-tint hover:text-brand"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>)}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold leading-snug text-ink">{c.title}</h3>
                          <p className="mt-1 line-clamp-2 text-sm text-muted">{c.description}</p>
                        </div>
                        <div className="mt-auto border-t border-sand pt-3">
                          <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`${pct}% of goal raised`}>
                            <div className="progress-fill" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="mt-2 text-sm text-ink-soft">
                            <span className="font-bold text-pine">Rs. {c.raisedAmount.toLocaleString()}</span> raised of Rs. {c.goalAmount.toLocaleString()}
                          </p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <EmptyBlock
                  icon={Megaphone}
                  action={
                    can('canManageDonations') && (<button type="button" onClick={() => setShowCampaignModal(true)} className="btn btn-sm btn-primary min-h-10">
                      <Plus className="h-4 w-4" aria-hidden="true" /> Launch a campaign
                    </button>)
                  }
                >
                  No fundraising campaigns yet.
                </EmptyBlock>
              )}
            </Panel>
          )}

          {/* ========================================================================= */}
          {/* TAB 14: EXPENSES & RECEIPTS */}
          {/* ========================================================================= */}
          {activeTab === 'expenses' && (
            <Panel
              title="Expenses transparency ledger"
              count={expensesList.length}
              description="Itemized expenditure records logged against fundraising campaigns."
              actions={
                can('canManageDonations') && (<button type="button" onClick={() => { setShowExpenseModal(true); fetchTabData('campaigns'); }} className="btn btn-sm btn-primary min-h-10">
                  <Plus className="h-4 w-4" aria-hidden="true" /> Log expense
                </button>)
              }
            >
              <DataTable head={['Expense', 'Campaign', 'Amount (NPR)', 'Spent on', { label: 'Action', right: true }]}>
                {expensesList.length > 0 ? (
                  expensesList.map((exp) => (
                    <tr key={exp._id} className={ROW}>
                      <td className={`${TD_TEXT} font-semibold text-ink`}><span className="line-clamp-2">{exp.title}</span></td>
                      <td className={`${TD_TEXT} text-ink-soft`}><span className="line-clamp-2">{exp.campaign?.title || 'General Campaign'}</span></td>
                      <td className={`${TD} whitespace-nowrap font-bold tabular-nums text-brand`}>Rs. {exp.amount.toLocaleString()}</td>
                      <td className={`${TD} whitespace-nowrap text-muted`}>{new Date(exp.spentDate).toLocaleDateString()}</td>
                      <td className={TD}>
                        <div className="flex justify-end">
                          {can('canManageDonations') && (<button type="button" onClick={() => handleDeleteExpense(exp._id)} className={BTN_DANGER}>
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
                          </button>)}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <EmptyRow colSpan={5}>No expenses logged yet.</EmptyRow>
                )}
              </DataTable>
            </Panel>
          )}

          {/* ========================================================================= */}
          {/* SPONSORSHIP (components live in pages/admin/sponsorship) */}
          {/* ========================================================================= */}
          <Suspense fallback={<SectionLoading />}>
          {activeTab === 'sponsorship' && (
            <OpportunitiesTab
              search={searchQuery}
              refreshKey={sponsorRefresh}
              onViewDeals={(opportunity) => openDealsFor({ opportunity })}
              onViewSponsors={() => handleTabChange('sponsors')}
            />
          )}
          {activeTab === 'sponsorDeals' && (
            <DealsTab focus={dealFocus} onFocusHandled={() => setDealFocus(null)} search={searchQuery} refreshKey={sponsorRefresh} />
          )}
          {activeTab === 'sponsors' && (
            <SponsorsTab
              search={searchQuery}
              refreshKey={sponsorRefresh}
              onViewDeals={canTab('sponsorDeals') ? (sponsor) => openDealsFor({ sponsor }) : undefined}
            />
          )}
          {/* ADVERTISING (components live in pages/admin/ads) */}
          {activeTab === 'ads' && (
            <AdsTab focus={adFocus} onFocusHandled={() => setAdFocus(null)} search={searchQuery} refreshKey={sponsorRefresh} />
          )}
          {activeTab === 'adPlacements' && <AdPlacementsTab refreshKey={sponsorRefresh} />}
          </Suspense>

          {/* ========================================================================= */}
          {/* TAB 15: ADMINS & RBAC */}
          {/* ========================================================================= */}
          {activeTab === 'admins' && (
            <Panel
              title="Admin staff & roles"
              description="Choose exactly what each admin or moderator can see and do. Finance access is never given by default."
              actions={
                <button
                  type="button"
                  onClick={async () => {
                    const catalog = await loadAccessCatalog();
                    setStaffForm((f) => ({ ...f, permissions: presetFor(f.role, catalog) }));
                    setShowStaffModal(true);
                  }}
                  className="btn btn-sm btn-primary min-h-10"
                >
                  <UserPlus className="h-4 w-4" aria-hidden="true" /> Add staff
                </button>
              }
            >
              <DataTable head={['Staff member', 'Role', 'Permissions', { label: 'Action', right: true }]}>
                {staffList.length > 0 ? (
                  staffList.map((admin) => (
                    <tr key={admin._id} className={ROW}>
                      <td className={TD}>
                        <div className="flex items-center gap-3">
                          <Avatar name={admin.name} src={admin.profilePicture} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-ink">{admin.name}</p>
                            <p className="truncate text-xs text-muted">{admin.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className={TD}><span className="chip bg-brand-tint text-brand">{admin.role.replace('_', ' ')}</span></td>
                      <td className={TD_TEXT}>
                        {admin.role === 'SUPER_ADMIN' ? (
                          <span className="chip bg-pine-tint text-pine">Full access</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {(admin.permissions?.length ? admin.permissions : presetFor(admin.role)).map((p) => (
                              <span
                                key={p}
                                className={`chip ${['canViewDonations', 'canManageDonations', 'canManageSponsorFinance'].includes(p) ? 'bg-marigold-tint text-marigold-text' : 'bg-paper-deep text-ink-soft'}`}
                              >
                                {permissionLabel(p)}
                              </span>
                            ))}
                            {!admin.permissions?.length && <span className="text-xs text-muted">(role default)</span>}
                          </div>
                        )}
                      </td>
                      <td className={TD}>
                        <div className="flex justify-end gap-2">
                          {admin.role !== 'SUPER_ADMIN' && (
                            <>
                              <button type="button" onClick={() => openAccessEditor(admin)} className={BTN_GHOST}>
                                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Edit access
                              </button>
                              <button type="button" onClick={() => handleDeleteStaff(admin._id)} className={BTN_DANGER}>Remove</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <EmptyRow colSpan={4}>No staff accounts found.</EmptyRow>
                )}
              </DataTable>
            </Panel>
          )}

          {/* ========================================================================= */}
          {/* TAB 16: PLATFORM SETTINGS */}
          {/* ========================================================================= */}
          {activeTab === 'settings' && (
            <div className="max-w-3xl">
              <Panel title="Platform settings" description="Public platform identity, donation details and moderation rules.">
                <form onSubmit={handleSaveSettings} className="space-y-8 p-5 sm:p-6">
                  <fieldset className="space-y-4">
                    <legend className="eyebrow mb-1">General</legend>
                    <div>
                      <label htmlFor="set-platformName" className="field-label">Platform name</label>
                      <input id="set-platformName" type="text" value={settingsData.platformName || 'हातेमालो (HATEYMALO)'} onChange={(e) => setSettingsData({ ...settingsData, platformName: e.target.value })} className="field" />
                    </div>
                    <div>
                      <label htmlFor="set-tagline" className="field-label">Tagline</label>
                      <input id="set-tagline" type="text" value={settingsData.tagline || 'मद्दत मागौँ। सहयोग गरौँ। सँगै परिवर्तन ल्याऔँ।'} onChange={(e) => setSettingsData({ ...settingsData, tagline: e.target.value })} className="field deva" />
                    </div>
                    <div>
                      <label htmlFor="set-contactEmail" className="field-label">Contact email</label>
                      <input id="set-contactEmail" type="email" value={settingsData.contactEmail || 'admin@hateymalo.com'} onChange={(e) => setSettingsData({ ...settingsData, contactEmail: e.target.value })} className="field" />
                    </div>
                  </fieldset>

                  <hr className="border-sand" />

                  <fieldset className="space-y-4">
                    <legend className="eyebrow mb-1">Homepage hero</legend>
                    <p className="-mt-2 text-sm text-muted">Shown at the top of the public homepage. Put each line of the headline on its own line.</p>
                    <div>
                      <label htmlFor="set-heroSmallLabel" className="field-label">Small label above the headline</label>
                      <input id="set-heroSmallLabel" type="text" value={settingsData.heroSmallLabel ?? ''} onChange={(e) => setSettingsData({ ...settingsData, heroSmallLabel: e.target.value })} className="field" />
                    </div>
                    <div>
                      <label htmlFor="set-heroHeadline" className="field-label">Headline</label>
                      <textarea id="set-heroHeadline" rows={3} value={settingsData.heroHeadline ?? ''} onChange={(e) => setSettingsData({ ...settingsData, heroHeadline: e.target.value })} className="field deva" />
                    </div>
                    <div>
                      <label htmlFor="set-heroDescription" className="field-label">Description</label>
                      <textarea id="set-heroDescription" rows={3} value={settingsData.heroDescription ?? ''} onChange={(e) => setSettingsData({ ...settingsData, heroDescription: e.target.value })} className="field" />
                    </div>
                    <div>
                      <label htmlFor="set-heroImage" className="field-label">Hero image URL</label>
                      <input id="set-heroImage" type="url" value={settingsData.heroImage ?? ''} onChange={(e) => setSettingsData({ ...settingsData, heroImage: e.target.value })} placeholder="https://…" className="field font-mono !text-xs" />
                      {settingsData.heroImage && (
                        <img src={settingsData.heroImage} alt="Hero image preview" className="mt-3 h-32 w-full max-w-sm rounded-2xl border border-sand object-cover" />
                      )}
                    </div>
                  </fieldset>

                  <hr className="border-sand" />

                  <fieldset className="space-y-4">
                    <legend className="eyebrow mb-1 flex items-center gap-1.5">
                      <QrCode className="h-3.5 w-3.5" aria-hidden="true" /> Donation payment & QR
                    </legend>
                    <div>
                      <label htmlFor="set-paymentQrCode" className="field-label">Static payment QR image URL</label>
                      <input
                        id="set-paymentQrCode"
                        type="url"
                        value={settingsData.paymentQrCode || ''}
                        onChange={(e) => setSettingsData({ ...settingsData, paymentQrCode: e.target.value })}
                        placeholder="https://… (link to your official eSewa / Khalti / Fonepay QR image)"
                        aria-describedby="set-paymentQrCode-hint"
                        className="field font-mono !text-xs"
                      />
                      <p id="set-paymentQrCode-hint" className="mt-1.5 text-sm text-muted">Paste any image URL or eSewa / Khalti / Fonepay QR image link.</p>
                    </div>
                    <div>
                      <label htmlFor="set-paymentInstructions" className="field-label">Payment instructions</label>
                      <input
                        id="set-paymentInstructions"
                        type="text"
                        value={settingsData.paymentInstructions || ''}
                        onChange={(e) => setSettingsData({ ...settingsData, paymentInstructions: e.target.value })}
                        placeholder="Scan with eSewa, Khalti, or Fonepay to make a direct voluntary contribution."
                        className="field"
                      />
                    </div>
                    <div>
                      <label htmlFor="set-paymentPhone" className="field-label">Official mobile / wallet number</label>
                      <input
                        id="set-paymentPhone"
                        type="text"
                        value={settingsData.paymentPhone || ''}
                        onChange={(e) => setSettingsData({ ...settingsData, paymentPhone: e.target.value })}
                        placeholder="Your official wallet or mobile number"
                        className="field"
                      />
                    </div>
                  </fieldset>

                  <hr className="border-sand" />

                  <fieldset className="space-y-3">
                    <legend className="eyebrow mb-1">Moderation policies</legend>
                    <label htmlFor="set-requirePostApproval" className="flex cursor-pointer items-start gap-3 rounded-2xl border border-sand p-4 hover:bg-paper">
                      <input
                        id="set-requirePostApproval"
                        type="checkbox"
                        checked={settingsData.requirePostApproval ?? true}
                        onChange={(e) => setSettingsData({ ...settingsData, requirePostApproval: e.target.checked })}
                        className="mt-1 h-5 w-5 shrink-0 accent-[#B5232C]"
                      />
                      <span>
                        <span className="block font-semibold text-ink">Require approval for posts</span>
                        <span className="block text-sm text-muted">New help posts stay private until an admin approves them.</span>
                      </span>
                    </label>
                    <label htmlFor="set-requireBlogApproval" className="flex cursor-pointer items-start gap-3 rounded-2xl border border-sand p-4 hover:bg-paper">
                      <input
                        id="set-requireBlogApproval"
                        type="checkbox"
                        checked={settingsData.requireBlogApproval ?? true}
                        onChange={(e) => setSettingsData({ ...settingsData, requireBlogApproval: e.target.checked })}
                        className="mt-1 h-5 w-5 shrink-0 accent-[#B5232C]"
                      />
                      <span>
                        <span className="block font-semibold text-ink">Require approval for blog stories</span>
                        <span className="block text-sm text-muted">Stories are reviewed before they are published.</span>
                      </span>
                    </label>
                  </fieldset>

                  <hr className="border-sand" />

                  <fieldset className="space-y-3">
                    <legend className="eyebrow mb-1">Platform features</legend>
                    {[
                      { key: 'allowPublicDonations', title: 'Accept public donations', hint: 'Shows the Donate page, campaign contributions and donate buttons across the site.' },
                      { key: 'allowPublicComments', title: 'Allow public comments', hint: 'Members can comment on help requests, events and stories.' },
                      { key: 'allowRegistrations', title: 'Allow new member registrations', hint: 'Turn off to pause new sign-ups (existing members can still log in).' },
                      { key: 'requireOrgVerification', title: 'Require verification for organisations', hint: 'Organisations get the verified badge only after the team checks their details.' },
                      { key: 'adsEnabled', title: 'Show sponsored ads', hint: 'Master switch for labelled sponsored ads on the website and in the app. Turn off to stop every ad slot at once (campaigns keep their status).' },
                    ].map(({ key, title, hint }) => (
                      <label key={key} htmlFor={`set-${key}`} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-sand p-4 hover:bg-paper">
                        <input
                          id={`set-${key}`}
                          type="checkbox"
                          checked={settingsData[key] ?? true}
                          onChange={(e) => setSettingsData({ ...settingsData, [key]: e.target.checked })}
                          className="mt-1 h-5 w-5 shrink-0 accent-[#B5232C]"
                        />
                        <span>
                          <span className="block font-semibold text-ink">{title}</span>
                          <span className="block text-sm text-muted">{hint}</span>
                        </span>
                      </label>
                    ))}
                  </fieldset>

                  <div className="border-t border-sand pt-6">
                    <button type="submit" className="btn btn-primary w-full sm:w-auto">
                      Save platform settings
                    </button>
                  </div>
                </form>
              </Panel>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 17: SYSTEM AUDIT LOGS */}
          {/* ========================================================================= */}
          {activeTab === 'logs' && (
            <Panel
              title="System audit logs"
              count={auditLogsList.length}
              description="Administrative changes, deletions and policy enforcement actions."
              actions={
                <button type="button" onClick={() => exportCSV(auditLogsList, 'hateymalo_audit_logs')} className={BTN_GHOST}>
                  <Download className="h-4 w-4" aria-hidden="true" /> Export logs CSV
                </button>
              }
            >
              <DataTable head={['Date & time', 'Performed by', 'Action', 'Target type', 'Details']} minWidth="min-w-[860px]">
                {auditLogsList.length > 0 ? (
                  auditLogsList.map((log) => (
                    <tr key={log._id} className={ROW}>
                      <td className={`${TD} whitespace-nowrap font-mono text-xs text-muted`}>{new Date(log.createdAt).toLocaleString()}</td>
                      <td className={`${TD} font-medium text-ink`}>{log.admin?.name || 'System Admin'}</td>
                      <td className={`${TD_TEXT} font-semibold text-brand`}>{log.action}</td>
                      <td className={TD}><span className="chip bg-paper-deep font-mono text-ink-soft">{log.targetType}</span></td>
                      <td className={TD_TEXT}><p className="line-clamp-2 text-xs text-ink-soft" title={log.details || ''}>{log.details || '-'}</p></td>
                    </tr>
                  ))
                ) : (
                  <EmptyRow colSpan={5}>No audit log entries yet.</EmptyRow>
                )}
              </DataTable>
            </Panel>
          )}

          </div>
        </main>

      </div>

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* ANNOUNCEMENT MODAL */}
      {showAnnouncementModal && (
        <Modal title="Create announcement" icon={Megaphone} onClose={() => setShowAnnouncementModal(false)}>
          <form onSubmit={handleBroadcastAnnouncement} className="space-y-4">
            <div>
              <label htmlFor="ann-title" className="field-label">Title</label>
              <input id="ann-title" type="text" required value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} placeholder="Announcement title…" className="field" />
            </div>
            <div>
              <label htmlFor="ann-content" className="field-label">Message</label>
              <textarea id="ann-content" rows={4} required value={annContent} onChange={(e) => setAnnContent(e.target.value)} placeholder="Message content…" className="field" />
              <p className="mt-1.5 text-sm text-muted">Sent to all members.</p>
            </div>
            <button type="submit" className="btn btn-primary w-full">Broadcast announcement</button>
          </form>
        </Modal>
      )}

      {/* EVENT MODAL */}
      {showEventModal && (
        <Modal title="Create official event" icon={Calendar} onClose={() => setShowEventModal(false)}>
          <form onSubmit={handleCreateEvent} className="space-y-4">
            <div>
              <label htmlFor="ev-title" className="field-label">Event title</label>
              <input id="ev-title" type="text" required value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} className="field" />
            </div>
            <div>
              <label htmlFor="ev-description" className="field-label">Description</label>
              <textarea id="ev-description" rows={3} required value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} className="field" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="ev-location" className="field-label">Location</label>
                <input id="ev-location" type="text" required value={eventForm.location} onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })} className="field" />
              </div>
              <div>
                <label htmlFor="ev-date" className="field-label">Date</label>
                <input id="ev-date" type="date" required value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} className="field" />
              </div>
            </div>
            <button type="submit" className="btn btn-primary w-full">Publish official event</button>
          </form>
        </Modal>
      )}

      {/* STAFF MODAL */}
      {showStaffModal && (
        <Modal title="Add staff account" icon={UserPlus} size="max-w-xl" onClose={() => setShowStaffModal(false)}>
          <form onSubmit={handleCreateStaff} className="space-y-4">
            <div>
              <label htmlFor="staff-name" className="field-label">Full name</label>
              <input id="staff-name" type="text" required value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} className="field" />
            </div>
            <div>
              <label htmlFor="staff-email" className="field-label">Email address</label>
              <input id="staff-email" type="email" required value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} className="field" />
            </div>
            <div>
              <label htmlFor="staff-password" className="field-label">Password</label>
              <input id="staff-password" type="password" required autoComplete="new-password" value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} className="field" />
            </div>
            <div>
              <label htmlFor="staff-role" className="field-label">Role</label>
              <select
                id="staff-role"
                value={staffForm.role}
                onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value, permissions: presetFor(e.target.value) })}
                className="field"
              >
                <option value="MODERATOR">Moderator — reviews content and reports</option>
                <option value="ADMIN">Admin — also manages members, events and causes</option>
              </select>
              <p className="mt-1.5 text-sm text-muted">Changing the role resets the ticks below to that role's defaults. Adjust them as needed.</p>
            </div>
            <StaffTemplates
              catalog={accessCatalog}
              value={staffForm.permissions || []}
              onApply={(permissions) => setStaffForm({ ...staffForm, permissions })}
            />
            <AccessChecklist
              catalog={accessCatalog}
              value={staffForm.permissions || []}
              onChange={(permissions) => setStaffForm({ ...staffForm, permissions })}
              idPrefix="new-staff"
            />
            <button type="submit" className="btn btn-primary w-full">Create staff account</button>
          </form>
        </Modal>
      )}

      {/* STAFF ACCESS EDITOR */}
      {editingAccess && (
        <Modal
          title={editingAccess.promoting ? `Make ${editingAccess.name} staff` : `Access for ${editingAccess.name}`}
          icon={ShieldCheck}
          size="max-w-xl"
          onClose={() => setEditingAccess(null)}
        >
          <form onSubmit={handleSaveAccess} className="space-y-4">
            <div>
              <label htmlFor="access-role" className="field-label">Role</label>
              <select
                id="access-role"
                value={editingAccess.role}
                onChange={(e) => setEditingAccess({ ...editingAccess, role: e.target.value, permissions: presetFor(e.target.value) })}
                className="field"
              >
                <option value="MODERATOR">Moderator — reviews content and reports</option>
                <option value="ADMIN">Admin — also manages members, events and causes</option>
              </select>
            </div>
            <StaffTemplates
              catalog={accessCatalog}
              value={editingAccess.permissions}
              onApply={(permissions) => setEditingAccess({ ...editingAccess, permissions })}
            />
            <AccessChecklist
              catalog={accessCatalog}
              value={editingAccess.permissions}
              onChange={(permissions) => setEditingAccess({ ...editingAccess, permissions })}
              idPrefix="edit-access"
            />
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setEditingAccess(null)} className="btn btn-ghost">Cancel</button>
              <button type="submit" className="btn btn-primary">{editingAccess.promoting ? 'Give staff access' : 'Save access'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* CATEGORY MODAL */}
      {showCategoryModal && (
        <Modal title="Add activity category" icon={FolderKanban} size="max-w-sm" onClose={() => setShowCategoryModal(false)}>
          <form onSubmit={handleCreateCategory} className="space-y-4">
            <div>
              <label htmlFor="cat-name" className="field-label">Category name</label>
              <input id="cat-name" type="text" required value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} placeholder="e.g. Disaster Relief" className="field" />
            </div>
            <div>
              <label htmlFor="cat-description" className="field-label">Description</label>
              <input id="cat-description" type="text" value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} placeholder="Brief description…" className="field" />
            </div>
            <button type="submit" className="btn btn-primary w-full">Add category</button>
          </form>
        </Modal>
      )}

      {/* CAMPAIGN MODAL */}
      {showCampaignModal && (
        <Modal title="Launch fundraising campaign" icon={Megaphone} onClose={() => setShowCampaignModal(false)}>
          <form onSubmit={handleCreateCampaign} className="space-y-4">
            <div>
              <label htmlFor="camp-title" className="field-label">Campaign title</label>
              <input id="camp-title" type="text" required value={campaignForm.title} onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })} className="field" />
            </div>
            <div>
              <label htmlFor="camp-description" className="field-label">Description</label>
              <textarea id="camp-description" rows={3} required value={campaignForm.description} onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })} className="field" />
            </div>
            <div>
              <label htmlFor="camp-goal" className="field-label">Target goal amount (NPR)</label>
              <input id="camp-goal" type="number" required value={campaignForm.goalAmount} onChange={(e) => setCampaignForm({ ...campaignForm, goalAmount: e.target.value })} className="field" />
            </div>
            <button type="submit" className="btn btn-primary w-full">Launch campaign</button>
          </form>
        </Modal>
      )}

      {/* EXPENSE MODAL */}
      {showExpenseModal && (
        <Modal title="Log expense record" icon={Receipt} onClose={() => setShowExpenseModal(false)}>
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div>
              <label htmlFor="exp-campaign" className="field-label">Campaign</label>
              <select id="exp-campaign" required value={expenseForm.campaignId} onChange={(e) => setExpenseForm({ ...expenseForm, campaignId: e.target.value })} className="field">
                <option value="">Select target campaign…</option>
                {campaignsList.map((c) => (
                  <option key={c._id} value={c._id}>{c.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="exp-title" className="field-label">Expense title / item</label>
              <input id="exp-title" type="text" required value={expenseForm.title} onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })} placeholder="e.g. 500 Saplings Purchase" className="field" />
            </div>
            <div>
              <label htmlFor="exp-amount" className="field-label">Amount spent (NPR)</label>
              <input id="exp-amount" type="number" required value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} className="field" />
            </div>
            <button type="submit" className="btn btn-primary w-full">Log expense</button>
          </form>
        </Modal>
      )}

      {/* REJECTION MODAL */}
      {rejectingItem && (
        <Modal title="Reason for rejection" size="max-w-sm" onClose={() => setRejectingItem(null)}>
          <label htmlFor="reject-reason" className="field-label">Feedback for the author</label>
          <textarea id="reject-reason" rows={4} value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Explain why this content was rejected so the user can fix it…" className="field" />
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setRejectingItem(null)} className="btn btn-ghost">Cancel</button>
            <button type="button" onClick={() => rejectingItem.type === 'POST' ? handleRejectPost(rejectingItem.id, rejectionReason) : handleRejectBlog(rejectingItem.id, rejectionReason)} className="btn btn-primary">
              Confirm rejection
            </button>
          </div>
        </Modal>
      )}

      {/* SUSPENSION MODAL */}
      {suspendingUser && (
        <Modal
          title={suspendingUser.isSuspended ? `Reactivate ${suspendingUser.name}?` : `Suspend ${suspendingUser.name}?`}
          size="max-w-sm"
          onClose={() => setSuspendingUser(null)}
        >
          {!suspendingUser.isSuspended && (
            <>
              <label htmlFor="suspend-reason" className="field-label">Reason for suspension</label>
              <textarea id="suspend-reason" rows={3} value={suspensionReasonInput} onChange={(e) => setSuspensionReasonInput(e.target.value)} placeholder="Reason for account suspension…" className="field" />
            </>
          )}
          {suspendingUser.isSuspended && (
            <p className="text-sm text-muted">This member will regain access to their account.</p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setSuspendingUser(null)} className="btn btn-ghost">Cancel</button>
            <button
              type="button"
              onClick={() => handleSuspendUser(suspendingUser._id, !suspendingUser.isSuspended, suspensionReasonInput)}
              className={suspendingUser.isSuspended ? 'btn btn-pine' : 'btn btn-primary'}
            >
              {suspendingUser.isSuspended ? 'Confirm reactivation' : 'Confirm suspension'}
            </button>
          </div>
        </Modal>
      )}

      {/* ORGANIZATION MODAL */}
      {showOrgModal && (
        <Modal title="Add NGO / partner organization" icon={Building2} size="max-w-lg" onClose={() => setShowOrgModal(false)}>
          <form onSubmit={handleCreateOrg} className="space-y-4">
            <div>
              <label htmlFor="org-name" className="field-label">Organization name *</label>
              <input
                id="org-name"
                type="text"
                required
                value={orgForm.name}
                onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                placeholder="Registered organization name"
                className="field"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="org-email" className="field-label">Contact email *</label>
                <input
                  id="org-email"
                  type="email"
                  required
                  value={orgForm.email}
                  onChange={(e) => setOrgForm({ ...orgForm, email: e.target.value })}
                  placeholder="contact@org.org.np"
                  className="field"
                />
              </div>
              <div>
                <label htmlFor="org-phone" className="field-label">Contact phone</label>
                <input
                  id="org-phone"
                  type="text"
                  value={orgForm.phone}
                  onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })}
                  placeholder="Your official wallet or mobile number"
                  className="field"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="org-reg" className="field-label">Reg / license no.</label>
                <input
                  id="org-reg"
                  type="text"
                  value={orgForm.regNumber}
                  onChange={(e) => setOrgForm({ ...orgForm, regNumber: e.target.value })}
                  placeholder="SWC-12345"
                  className="field"
                />
              </div>
              <div>
                <label htmlFor="org-type" className="field-label">Org type</label>
                <select
                  id="org-type"
                  value={orgForm.orgType}
                  onChange={(e) => setOrgForm({ ...orgForm, orgType: e.target.value })}
                  className="field"
                >
                  <option value="NGO">NGO / Non-Profit</option>
                  <option value="INGO">INGO</option>
                  <option value="Civil Society">Civil Society Group</option>
                  <option value="Youth Club">Youth Volunteer Club</option>
                  <option value="Environmental">Environmental Group</option>
                  <option value="Disaster Response">Disaster Response</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="org-location" className="field-label">Location</label>
              <input
                id="org-location"
                type="text"
                value={orgForm.location}
                onChange={(e) => setOrgForm({ ...orgForm, location: e.target.value })}
                placeholder="e.g. Kathmandu, Nepal"
                className="field"
              />
            </div>

            <div>
              <label htmlFor="org-description" className="field-label">Mission / description</label>
              <textarea
                id="org-description"
                rows={3}
                value={orgForm.description}
                onChange={(e) => setOrgForm({ ...orgForm, description: e.target.value })}
                placeholder="Brief mission statement…"
                className="field"
              />
            </div>

            <button type="submit" className="btn btn-primary w-full">
              <Building2 className="h-4 w-4" aria-hidden="true" /> Register & verify organization
            </button>
          </form>
        </Modal>
      )}

    </div>
  );
};

export default SuperAdminDashboard;
