const crypto = require('crypto');
const { JWT_SECRET } = require('../middleware/auth');

// Signed ad tokens. Each served ad gets one; impression/click/video events
// must carry it, so counts cannot be inflated by posting made-up ids. The
// payload is tiny and readable (it identifies an ad, never a person):
//   c campaign · k creative · p placement · s surface · i impression id · t issued (s) · f 1 = filtered (staff/bot)
const SECRET = process.env.AD_TOKEN_SECRET || `${JWT_SECRET}:ads`;
const MAX_AGE_S = 24 * 60 * 60;

const b64 = (buf) => Buffer.from(buf).toString('base64url');
const sign = (body) => crypto.createHmac('sha256', SECRET).update(body).digest('base64url').slice(0, 32);

const issueAdToken = ({ campaign, creative, placement, surface, filtered }) => {
  const body = b64(
    JSON.stringify({ c: String(campaign), k: String(creative), p: placement, s: surface, i: crypto.randomBytes(9).toString('base64url'), t: Math.floor(Date.now() / 1000), f: filtered ? 1 : 0 })
  );
  return `${body}.${sign(body)}`;
};

// → { payload, expired } or null when malformed / forged
const readAdToken = (token) => {
  if (typeof token !== 'string' || token.length > 600) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = sign(body);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload?.c || !payload?.k || !payload?.i) return null;
    return { payload, expired: Math.floor(Date.now() / 1000) - Number(payload.t || 0) > MAX_AGE_S };
  } catch {
    return null;
  }
};

module.exports = { issueAdToken, readAdToken };
