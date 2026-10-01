# 🇳🇵 हातेमालो (HAATEMALO) - Full-Stack Community Help & Mutual Collaboration Platform

Tagline: **"मद्दत मागौँ। सहयोग गरौँ। सँगै परिवर्तन ल्याऔँ।"**

HAATEMALO is a full-stack, non-profit community platform engineered to connect citizens, volunteers, NGOs, schools, and administrators across Nepal for civic mutual aid, emergency assistance, tree plantation campaigns, education tutoring, official assemblies, and voluntary fundraising with 100% financial transparency.

---

## 🚀 Complete User Journey

```
REGISTER ACCOUNT
      ↓
CREATE USER/ORG PROFILE
      ↓
SUBMIT HELP REQUEST / ACTIVITY
      ↓
ADMIN MODERATION & APPROVAL (PENDING → APPROVED)
      ↓
PUBLICLY PUBLISHED IN EXPLORE & SEARCH
      ↓
MEMBERS MARK INTEREST ❤️ & JOIN VOLUNTEER DRIVES 🤝
      ↓
THREADED DISCUSSIONS, COMMENTS & REPLIES 💬
      ↓
CREATOR CAMPAIGN UPDATES & AUTOMATED IN-APP NOTIFICATIONS 🔔
      ↓
VOLUNTARY DONATIONS & ITEMIZATION FINANCIAL RECEIPT LEDGERS 💚
      ↓
ACTIVITY COMPLETION & AUTOMATED ACHIEVEMENT BADGES UNLOCKED 🏆
```

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React.js v19 & Vite
- **Routing**: React Router DOM v7
- **Styling**: Tailwind CSS & Vanilla CSS Glassmorphism
- **Icons**: Lucide React
- **HTTP Client**: Axios with JWT interceptors
- **State & Alerts**: React Context API & Custom Toast Notifications

### Backend
- **Runtime**: Node.js & Express.js
- **Database**: MongoDB & Mongoose ORM (with automatic in-memory `MongoMemoryServer` fallback)
- **Security**: JWT Authentication, bcrypt password hashing, In-Memory Rate Limiting, Account Suspension Enforcement
- **Architecture**: REST API Architecture with clean separation between Frontend and Backend

---

## 📦 Project Directory Structure

```
d:\Hatemalo\
├── backend/
│   ├── config/          # Database connection & MongoMemoryServer fallback
│   ├── controllers/     # Auth, Post, Admin, Event, Blog, Donation, Search, Badge, Report
│   ├── middleware/      # JWT Protect, AdminOnly, RateLimiter
│   ├── models/          # User, Post, Category, Event, Blog, Donation, Expense, Report, Notification
│   ├── routes/          # RESTful Express route definitions
│   ├── seed.js          # Database seeder script
│   └── server.js        # Express server entry point
└── frontend/
    ├── public/          # Public static assets
    ├── src/
    │   ├── components/  # Reusable UI components & modals
    │   ├── context/     # Auth & Toast context providers
    │   ├── layouts/     # Navbar & Footer
    │   ├── pages/       # Home, Explore, PostDetails, Events, Blogs, Search, Admin, Dashboard
    │   ├── services/    # Axios API client
    │   ├── App.jsx      # Router configuration
    │   └── main.jsx     # React entry point
    └── vite.config.js   # Vite build & proxy config
```

---

## ⚙️ Installation & Running Guide

### 1. Backend Setup

```bash
cd backend
npm install
node server.js
```

> **Note**: The backend automatically attempts to connect to your local MongoDB server at `mongodb://127.0.0.1:27017/haatemalo`. If a local MongoDB instance is not detected, it seamlessly initializes an **Embedded In-Memory MongoMemoryServer**, guaranteeing 100% zero-dependency execution out of the box!

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server will run at: `http://localhost:5173` or `http://localhost:5174`.

---

## 🔑 Demo Access Credentials

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@haatemalo.org` | `admin123` | Moderate posts/blogs, create official events, broadcast announcements, verify member levels, resolve reports |
| **User (Ram)** | `ram@haatemalo.org` | `user123` | Create posts, write blogs, join events, mark interest, donate |
| **User (Sita)** | `sita@haatemalo.org` | `user123` | Create posts, write blogs, join events, mark interest, donate |

---

## 📡 REST API Reference Summary

- **Auth**: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- **Posts**: `GET /api/posts`, `POST /api/posts`, `GET /api/posts/:id`, `POST /api/posts/:id/join`, `PUT /api/posts/:id/status`
- **Events**: `GET /api/events`, `POST /api/events`, `POST /api/events/:id/join`, `POST /api/events/:id/interest`
- **Blogs**: `GET /api/blogs`, `POST /api/blogs`, `POST /api/blogs/:id/react`, `PUT /api/blogs/:id/status`
- **Donations**: `POST /api/donations`, `GET /api/donations/campaigns`, `GET /api/donations/campaigns/:id/transparency`
- **Search**: `GET /api/search?query=kathmandu&entityType=ALL`
- **Badges**: `GET /api/badges/user/:userId`
- **Reports**: `POST /api/reports`, `GET /api/reports`, `PUT /api/reports/:id/resolve`
- **Admin**: `GET /api/admin/stats`, `GET /api/admin/pending-posts`, `PUT /api/admin/users/:id/verify`
