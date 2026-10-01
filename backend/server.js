const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const rateLimiter = require('./middleware/rateLimiter');

dotenv.config();

const app = express();

// Connect Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(rateLimiter({ windowMs: 15 * 60 * 1000, max: 10000 }));

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
    platform: 'हातेमालो (HAATEMALO)',
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

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  HAATEMALO Server running on port ${PORT}`);
  console.log(`  Health check: http://localhost:${PORT}/api/health`);
  console.log(`====================================================`);
});
