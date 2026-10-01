const rateLimitMap = new Map();

const rateLimiter = (options = { windowMs: 15 * 60 * 1000, max: 10000 }) => {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    
    // Bypass rate limiting for localhost / dev environment / admin routes
    if (ip === '127.0.0.1' || ip === '::1' || ip.includes('127.0.0.1') || req.path.includes('/admin') || req.path.includes('/super-admin')) {
      return next();
    }

    const now = Date.now();

    if (!rateLimitMap.has(ip)) {
      rateLimitMap.set(ip, { count: 1, resetTime: now + options.windowMs });
      return next();
    }

    const record = rateLimitMap.get(ip);
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + options.windowMs;
      return next();
    }

    record.count += 1;
    if (record.count > options.max) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests from this IP. Please try again later.',
      });
    }

    next();
  };
};

module.exports = rateLimiter;
