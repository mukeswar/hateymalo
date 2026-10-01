import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './layouts/Navbar';
import Footer from './layouts/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';

import Home from './pages/Home';
import ExplorePosts from './pages/ExplorePosts';
import PostDetails from './pages/PostDetails';
import CreatePost from './pages/CreatePost';
import Categories from './pages/Categories';
import Members from './pages/Members';
import Login from './pages/Login';
import Register from './pages/Register';
import UserProfile from './pages/UserProfile';
import UserDashboard from './pages/UserDashboard';
import About from './pages/About';

// Phase 3 & 4 Pages
import Events from './pages/Events';
import EventDetails from './pages/EventDetails';
import Blogs from './pages/Blogs';
import BlogDetails from './pages/BlogDetails';
import CreateBlog from './pages/CreateBlog';
import Donate from './pages/Donate';
import GlobalSearch from './pages/GlobalSearch';
import Organizations from './pages/Organizations';

// Master Admin Dashboards
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import AdminDashboard from './pages/AdminDashboard';
import NotFound from './pages/NotFound';

function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-slate-900 selection:bg-[#C8382C] selection:text-white">
      {!isAdminRoute && <Navbar />}
      
      <main key={location.pathname} className={isAdminRoute ? 'h-screen w-screen overflow-hidden' : 'flex-grow animate-in fade-in slide-in-from-bottom-2 duration-300 transform-gpu'}>
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
      </main>

      {!isAdminRoute && <Footer />}
    </div>
  );
}

export default App;
