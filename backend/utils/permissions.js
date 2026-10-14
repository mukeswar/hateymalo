// Staff access control. A staff member's effective permissions are:
//   SUPER_ADMIN → everything (and super-admin-only areas: settings, staff, audit log, roles)
//   ADMIN / MODERATOR with an explicit `permissions` list → exactly that list
//   ADMIN / MODERATOR with an empty list → their role's default preset
// Finance access (donor names, transaction IDs, ledgers) is never in a default preset;
// the Super Admin grants it explicitly.

const PERMISSIONS = [
  { key: 'canApprovePosts', label: 'Approve & feature content', hint: 'Approve, reject and feature help requests and stories.' },
  { key: 'canDeletePosts', label: 'Delete content & comments', hint: 'Remove posts, stories and comments.' },
  { key: 'canManageReports', label: 'Handle reports', hint: 'Review reports and warn, remove, suspend or ban.' },
  { key: 'canManageUsers', label: 'Manage members', hint: 'See member emails, verify accounts and suspend members.' },
  { key: 'canDeleteUsers', label: 'Delete member accounts', hint: 'Permanently delete member accounts.' },
  { key: 'canManageEvents', label: 'Manage events', hint: 'Create, feature, cancel and delete events.' },
  { key: 'canSendNotifications', label: 'Send announcements', hint: 'Publish site-wide announcements.' },
  { key: 'canManageCategories', label: 'Manage causes', hint: 'Create, activate and delete categories.' },
  { key: 'canManageOrganizations', label: 'Manage organisations', hint: 'Register organisation accounts.' },
  { key: 'canViewDonations', label: 'View donations', hint: 'See donor names, amounts, transaction IDs and the expense ledger.' },
  { key: 'canManageDonations', label: 'Manage finances', hint: 'Launch or delete campaigns and add or delete expenses.' },
];

const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

const ROLE_PRESETS = {
  MODERATOR: ['canApprovePosts', 'canDeletePosts', 'canManageReports'],
  ADMIN: [
    'canApprovePosts',
    'canDeletePosts',
    'canManageReports',
    'canManageUsers',
    'canManageEvents',
    'canSendNotifications',
    'canManageCategories',
    'canManageOrganizations',
  ],
};

const effectivePermissions = (user) => {
  if (!user) return [];
  if (user.role === 'SUPER_ADMIN') return [...PERMISSION_KEYS];
  if (!['ADMIN', 'MODERATOR'].includes(user.role)) return [];
  const explicit = (user.permissions || []).filter((p) => PERMISSION_KEYS.includes(p));
  const perms = explicit.length > 0 ? explicit : ROLE_PRESETS[user.role] || [];
  // Managing finances implies being able to see them
  return perms.includes('canManageDonations') && !perms.includes('canViewDonations') ? [...perms, 'canViewDonations'] : perms;
};

const hasPermission = (user, key) => effectivePermissions(user).includes(key);

// Keeps only known permission keys (used when a Super Admin saves a staff member's access)
const sanitizePermissions = (list) => (Array.isArray(list) ? [...new Set(list.filter((p) => PERMISSION_KEYS.includes(p)))] : []);

module.exports = { PERMISSIONS, PERMISSION_KEYS, ROLE_PRESETS, effectivePermissions, hasPermission, sanitizePermissions };
