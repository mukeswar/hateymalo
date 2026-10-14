const { createAuditLog } = require('../utils/auditLogger');
const { isStaff } = require('../utils/roles');

// Records every successful change made by a staff member (ADMIN, MODERATOR,
// SUPER_ADMIN) in the audit log, so the Super Admin "Activity logs" tab shows
// moderation work done anywhere in the API — not only the few super-admin
// endpoints that log explicitly (those are skipped here to avoid duplicates).

const RULES = [
  // [method, path regex, targetType, describe(req, match)]
  ['PUT', /^\/api\/posts\/([a-f0-9]{24})\/status$/, 'POST', (r) => `Set post status to ${r.body?.status || 'updated'}`],
  ['PUT', /^\/api\/posts\/([a-f0-9]{24})\/feature$/, 'POST', (r) => (r.body?.isFeatured === false ? 'Removed post from featured' : 'Featured a post')],
  ['DELETE', /^\/api\/posts\/([a-f0-9]{24})$/, 'POST', () => 'Deleted a post'],
  ['PUT', /^\/api\/blogs\/([a-f0-9]{24})\/status$/, 'BLOG', (r) => `Set story status to ${r.body?.status || 'updated'}`],
  ['PUT', /^\/api\/blogs\/([a-f0-9]{24})\/feature$/, 'BLOG', () => 'Toggled featured story'],
  ['DELETE', /^\/api\/blogs\/([a-f0-9]{24})$/, 'BLOG', () => 'Deleted a story'],
  ['POST', /^\/api\/events$/, 'EVENT', (r) => `Created event "${r.body?.title || ''}"`],
  ['PUT', /^\/api\/events\/([a-f0-9]{24})\/feature$/, 'EVENT', (r) => (r.body?.isFeatured === false ? 'Unfeatured an event' : 'Featured an event')],
  ['PUT', /^\/api\/events\/([a-f0-9]{24})$/, 'EVENT', (r) => (r.body?.status === 'CANCELLED' ? 'Cancelled an event' : 'Updated an event')],
  ['DELETE', /^\/api\/events\/([a-f0-9]{24})$/, 'EVENT', () => 'Deleted an event'],
  ['PUT', /^\/api\/reports\/([a-f0-9]{24})\/resolve$/, 'REPORT', (r) => `Resolved a report: ${r.body?.action || 'action taken'}`],
  ['DELETE', /^\/api\/admin\/comments\/([a-f0-9]{24})$/, 'COMMENT', () => 'Deleted a comment'],
  ['PUT', /^\/api\/admin\/users\/([a-f0-9]{24})\/verify$/, 'USER', (r) => `Set member level ${r.body?.memberLevel || ''}${r.body?.isVerified ? ' (verified)' : ' (unverified)'}`],
  ['PUT', /^\/api\/admin\/users\/([a-f0-9]{24})\/suspend$/, 'USER', (r) => (r.body?.isSuspended ? 'Suspended a member' : 'Lifted a member suspension')],
  ['DELETE', /^\/api\/admin\/users\/([a-f0-9]{24})$/, 'USER', () => 'Deleted a member account'],
  ['POST', /^\/api\/admin\/organizations$/, 'ORGANIZATION', (r) => `Registered organisation "${r.body?.name || ''}"`],
  ['POST', /^\/api\/categories$/, 'CATEGORY', (r) => `Created category "${r.body?.name || ''}"`],
  ['PUT', /^\/api\/categories\/([a-f0-9]{24})$/, 'CATEGORY', (r) => (r.body?.isActive === false ? 'Deactivated a category' : r.body?.isActive === true ? 'Activated a category' : 'Updated a category')],
  ['DELETE', /^\/api\/categories\/([a-f0-9]{24})$/, 'CATEGORY', () => 'Deleted a category'],
  ['POST', /^\/api\/donations\/campaigns$/, 'DONATION', (r) => `Launched campaign "${r.body?.title || ''}"`],
  ['DELETE', /^\/api\/admin\/campaigns\/([a-f0-9]{24})$/, 'DONATION', () => 'Deleted a campaign'],
  ['POST', /^\/api\/donations\/campaigns\/([a-f0-9]{24})\/expenses$/, 'DONATION', (r) => `Logged expense "${r.body?.title || ''}" (Rs. ${r.body?.amount || 0})`],
  ['DELETE', /^\/api\/admin\/expenses\/([a-f0-9]{24})$/, 'DONATION', () => 'Deleted an expense record'],
  ['POST', /^\/api\/announcements$/, 'ANNOUNCEMENT', (r) => `Published announcement "${r.body?.title || ''}"`],
];

const auditTrail = (req, res, next) => {
  if (req.method === 'GET' || req.method === 'OPTIONS') return next();

  const path = req.originalUrl.split('?')[0];
  const rule = RULES.find(([method, re]) => method === req.method && re.test(path));
  if (!rule) return next();

  res.on('finish', () => {
    if (res.statusCode < 200 || res.statusCode >= 300) return;
    if (!req.user || !isStaff(req.user)) return;
    const [, re, targetType, describe] = rule;
    const match = path.match(re);
    createAuditLog({
      adminUser: req.user,
      action: describe(req, match),
      targetType,
      targetId: match?.[1] || null,
      details: `${req.method} ${path}`,
      req,
    });
  });

  next();
};

module.exports = auditTrail;
