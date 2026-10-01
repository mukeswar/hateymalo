// Centralized role helpers so SUPER_ADMIN and MODERATOR are never accidentally
// excluded by an exact `role === 'ADMIN'` check.

const STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'];

// Anyone on the moderation/admin team (can approve, reject, hide, delete content).
const isStaff = (user) => !!user && STAFF_ROLES.includes(user.role);

// Highest privilege only.
const isSuperAdmin = (user) => !!user && user.role === 'SUPER_ADMIN';

module.exports = { STAFF_ROLES, isStaff, isSuperAdmin };
