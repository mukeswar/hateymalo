const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const rateLimiter = require('./middleware/rateLimiter');

// Always read backend/.env, whichever folder the server is started from
// (on Vercel there is no .env file; variables come from the project settings)
dotenv.config({ path: require('path').join(__dirname, '.env') });

const app = express();

// Behind Vercel's proxy, use X-Forwarded-For so req.ip (rate limiter, audit log) is the real client
app.set('trust proxy', 1);

// Connect Database
connectDB().catch(() => {});

// Middleware
app.use(cors());

// Wait for the DB on each request so serverless cold starts don't run queries before connecting
app.use(async (req, res, next) => {
  if (req.path === '/api/health') return next();
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(503).json({ success: false, message: 'Database unavailable. Please try again shortly.' });
  }
});
app.use(express.json());
app.use(rateLimiter({ windowMs: 15 * 60 * 1000, max: 10000 }));
app.use(require('./middleware/auditTrail'));

// Mount Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/posts', require('./routes/postRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/interactions', require('./routes/interactionRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/blogs', require('./routes/blogRoutes'));
app.use('/api/donations', require('./routes/donationRoutes'));
app.use('/api/announcements', require('./routes/announcementRoutes'));
app.use('/api/search', require('./routes/searchRoutes'));
app.use('/api/badges', require('./routes/badgeRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
const { getPlatformSettings } = require('./controllers/superAdminController');
const { getPublicStats } = require('./controllers/statsController');

app.use('/api/super-admin', require('./routes/superAdminRoutes'));
app.get('/api/settings', getPlatformSettings);
app.get('/api/stats', getPublicStats);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    platform: 'हातेमालो (HATEYMALO)',
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`  HATEYMALO Server running on port ${PORT}`);
    console.log(`  Health check: http://localhost:${PORT}/api/health`);
    console.log(`====================================================`);
  });
}

module.exports = app;
