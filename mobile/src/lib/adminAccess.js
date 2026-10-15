// Admin sections — same ids, labels and permission gates as the website's
// SuperAdminDashboard (TAB_ACCESS / NAV_GROUPS). Each id is a screen at
// src/app/admin/<id>.jsx. `need`: null = any staff, 'super' = SUPER_ADMIN only,
// otherwise a permission key checked with useAuth().can().
export const ADMIN_GROUPS = [
  {
    label: 'Content & moderation',
    items: [
      { id: 'approval', label: 'Approval center', icon: 'Clock', need: 'canApprovePosts' },
      { id: 'posts', label: 'Posts', icon: 'FileText', need: 'canApprovePosts' },
      { id: 'blogs', label: 'Blogs & stories', icon: 'BookOpen', need: 'canApprovePosts' },
      { id: 'events', label: 'Events', icon: 'Calendar', need: 'canManageEvents' },
      { id: 'reports', label: 'Reports', icon: 'AlertTriangle', need: 'canManageReports' },
      { id: 'comments', label: 'Comments', icon: 'MessageSquare', need: 'canDeletePosts' },
      { id: 'announcements', label: 'Announcements', icon: 'Megaphone', need: 'canSendNotifications' },
    ],
  },
  {
    label: 'Community',
    items: [
      { id: 'members', label: 'Members', icon: 'Users', need: 'canManageUsers' },
      { id: 'orgs', label: 'Organizations', icon: 'Building2', need: 'canManageUsers' },
      { id: 'volunteers', label: 'Volunteers', icon: 'UserPlus', need: 'canManageUsers' },
      { id: 'categories', label: 'Categories', icon: 'FolderKanban', need: 'canManageCategories' },
    ],
  },
  {
    label: 'Finance & donations',
    items: [
      { id: 'donations', label: 'Donations', icon: 'HandCoins', need: 'canViewDonations' },
      { id: 'campaigns', label: 'Campaigns', icon: 'Target', need: 'canViewDonations' },
      { id: 'expenses', label: 'Expenses', icon: 'Receipt', need: 'canViewDonations' },
    ],
  },
  {
    label: 'Sponsorship',
    items: [
      { id: 'sponsorship', label: 'Opportunities & tiers', icon: 'Handshake', need: 'canManageSponsorships' },
      { id: 'sponsorDeals', label: 'Sponsor deals', icon: 'BriefcaseBusiness', need: ['canManageSponsorships', 'canManageSponsorFinance', 'canManageBrandKits'] },
      { id: 'sponsors', label: 'Sponsor accounts', icon: 'Building', need: ['canManageSponsorships', 'canManageSponsorFinance'] },
    ],
  },
  {
    label: 'Advertising',
    items: [
      { id: 'ads', label: 'Ad campaigns', icon: 'Megaphone', need: ['canManageAds', 'canReviewAds', 'canManageSponsorFinance'] },
      { id: 'adPlacements', label: 'Placements & rate cards', icon: 'LayoutTemplate', need: 'canReviewAds' },
    ],
  },
  {
    label: 'Revenue',
    items: [
      { id: 'revenue', label: 'Revenue', icon: 'TrendingUp', need: ['canManageRevenue', 'canManageSponsorFinance', 'canManageSponsorships', 'canManageAds', 'canReviewAds'] },
      { id: 'invoices', label: 'Invoices', icon: 'ReceiptText', need: 'canManageRevenue' },
      { id: 'ledger', label: 'Revenue ledger', icon: 'BookOpenText', need: 'canManageRevenue' },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'admins', label: 'Admins & roles', icon: 'ShieldAlert', need: 'super' },
      { id: 'settings', label: 'Settings', icon: 'Settings', need: 'super' },
      { id: 'logs', label: 'Activity logs', icon: 'Lock', need: 'super' },
    ],
  },
];

export const canAccessSection = (need, { isAdmin, isSuperAdmin, can }) => {
  if (!isAdmin) return false;
  if (need === null || need === undefined) return true;
  if (need === 'super') return isSuperAdmin;
  if (Array.isArray(need)) return need.some((p) => can(p)); // any one of these permissions
  return can(need);
};

export const findSection = (id) => ADMIN_GROUPS.flatMap((g) => g.items).find((i) => i.id === id);
