import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './layouts/Navbar';
import Footer from './layouts/Footer';
import QuoteBand from './components/QuoteBand';
import ProtectedRoute from './components/ProtectedRoute';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';

import Home from './pages/Home';
const ExplorePosts = lazy(() => import('./pages/ExplorePosts'));
const PostDetails = lazy(() => import('./pages/PostDetails'));
const CreatePost = lazy(() => import('./pages/CreatePost'));
const Categories = lazy(() => import('./pages/Categories'));
const Members = lazy(() => import('./pages/Members'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const UserDashboard = lazy(() => import('./pages/UserDashboard'));
const About = lazy(() => import('./pages/About'));

// Phase 3 & 4 Pages
const Events = lazy(() => import('./pages/Events'));
const EventDetails = lazy(() => import('./pages/EventDetails'));
const Blogs = lazy(() => import('./pages/Blogs'));
const BlogDetails = lazy(() => import('./pages/BlogDetails'));
const CreateBlog = lazy(() => import('./pages/CreateBlog'));
const Donate = lazy(() => import('./pages/Donate'));
const GlobalSearch = lazy(() => import('./pages/GlobalSearch'));
const Organizations = lazy(() => import('./pages/Organizations'));

// Campaign sponsorship (funding + visibility for organised campaigns)
const SponsorLanding = lazy(() => import('./pages/sponsorship/SponsorLanding'));
const OpportunityProposal = lazy(() => import('./pages/sponsorship/OpportunityProposal'));
const SponsorPortal = lazy(() => import('./pages/sponsorship/SponsorPortal'));
const SponsorDeal = lazy(() => import('./pages/sponsorship/SponsorDeal'));
const SponsorAccount = lazy(() => import('./pages/sponsorship/SponsorAccount'));
const OrganizerWorkspace = lazy(() => import('./pages/sponsorship/OrganizerWorkspace'));

// Advertising (sponsor accounts run ad campaigns; contract docs/ADS.md)
const AdCampaigns = lazy(() => import('./pages/sponsorship/AdCampaigns'));
const AdCampaign = lazy(() => import('./pages/sponsorship/AdCampaign'));
const AdCampaignEditor = lazy(() => import('./pages/sponsorship/AdCampaignEditor'));
// Invoices (docs/REVENUE.md)
const SponsorInvoices = lazy(() => import('./pages/sponsorship/SponsorInvoices'));
const SponsorInvoice = lazy(() => import('./pages/sponsorship/SponsorInvoice'));
const InvoicePrint = lazy(() => import('./pages/revenue/InvoicePrint'));

// Master Admin Dashboards
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Home ships in the main bundle; every other page (and the chart-heavy admin
// dashboards) loads on demand so first visits stay fast.
const PageFallback = () => (
  <div className="container-page py-16 space-y-4" aria-busy="true" aria-label="Loading page">
    <div className="h-10 w-2/3 max-w-md rounded-xl bg-paper-deep animate-pulse" />
    <div className="h-5 w-full max-w-xl rounded-lg bg-paper-deep animate-pulse" />
    <div className="h-64 rounded-[var(--radius-card)] bg-paper-deep animate-pulse" />
  </div>
);

function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isPrintRoute = /^\/invoices\/[^/]+\/print$/.test(location.pathname);

  // Start each new page at the top (hash links like #main keep their own target)
  useEffect(() => {
    if (!location.hash) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      {/* Site chrome is never printed (invoice print view) */}
      {!isAdminRoute && <div className="contents print:hidden"><Navbar /></div>}

      <main id="main" tabIndex={-1} key={location.pathname} className={isAdminRoute ? 'h-screen w-screen overflow-hidden' : 'flex-grow animate-in slide-in-from-bottom-2 outline-none'}>
        <Suspense fallback={<PageFallback />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<ExplorePosts />} />
          <Route path="/post/:id" element={<PostDetails />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/members" element={<Members />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile/:id" element={<UserProfile />} />
          
          {/* Phase 3 & 4 Public Routes */}
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<EventDetails />} />
          <Route path="/blogs" element={<Blogs />} />
          <Route path="/blogs/:id" element={<BlogDetails />} />
          <Route path="/donate" element={<Donate />} />
          <Route path="/search" element={<GlobalSearch />} />
          <Route path="/organizations" element={<Organizations />} />

          {/* Sponsorship */}
          <Route path="/sponsor" element={<SponsorLanding />} />
          <Route path="/sponsor/opportunities/:id" element={<OpportunityProposal />} />
          <Route path="/sponsor/portal" element={<ProtectedRoute><SponsorPortal /></ProtectedRoute>} />
          <Route path="/sponsor/portal/deals/:id" element={<ProtectedRoute><SponsorDeal /></ProtectedRoute>} />
          <Route path="/sponsor/portal/accounts/:id" element={<ProtectedRoute><SponsorAccount /></ProtectedRoute>} />
          <Route path="/organize/:id" element={<ProtectedRoute><OrganizerWorkspace /></ProtectedRoute>} />

          {/* Advertising (notifications link to /sponsor/ads/:id) */}
          <Route path="/sponsor/ads" element={<ProtectedRoute><AdCampaigns /></ProtectedRoute>} />
          <Route path="/sponsor/ads/new" element={<ProtectedRoute><AdCampaignEditor /></ProtectedRoute>} />
          <Route path="/sponsor/ads/:id" element={<ProtectedRoute><AdCampaign /></ProtectedRoute>} />
          <Route path="/sponsor/ads/:id/edit" element={<ProtectedRoute><AdCampaignEditor /></ProtectedRoute>} />

          {/* Invoices: sponsor list/detail; print view for finance staff and the billed sponsor */}
          <Route path="/sponsor/invoices" element={<ProtectedRoute><SponsorInvoices /></ProtectedRoute>} />
          <Route path="/sponsor/invoices/:id" element={<ProtectedRoute><SponsorInvoice /></ProtectedRoute>} />
          <Route path="/invoices/:id/print" element={<ProtectedRoute><InvoicePrint /></ProtectedRoute>} />

          {/* User Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <UserDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-post"
            element={
              <ProtectedRoute>
                <CreatePost />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-blog"
            element={
              <ProtectedRoute>
                <CreateBlog />
              </ProtectedRoute>
            }
          />

          {/* Super Admin Protected SaaS Command Center (No public navbar/footer) */}
          <Route
            path="/admin"
            element={
              <ProtectedAdminRoute>
                <SuperAdminDashboard />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin-dashboard"
            element={
              <ProtectedAdminRoute>
                <AdminDashboard />
              </ProtectedAdminRoute>
            }
          />

          {/* 404 Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </main>

      {!isAdminRoute && !['/login', '/register'].includes(location.pathname) && !isPrintRoute && <QuoteBand key={`quote-${location.pathname}`} />}
      {!isAdminRoute && <div className="contents print:hidden"><Footer /></div>}
    </div>
  );
}

export default App;
