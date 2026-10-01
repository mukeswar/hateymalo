import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import VerificationBadge from '../components/VerificationBadge';
import NotificationDropdown from '../components/NotificationDropdown';
import {
  HeartHandshake,
  PlusCircle,
  LayoutDashboard,
  ShieldAlert,
  User,
  LogOut,
  Menu,
  X,
  Compass,
  Grid,
  Users,
  Info,
  Calendar,
  BookOpen,
  Heart,
  Search,
  Building2,
  ChevronDown,
  LogIn,
  UserPlus,
  Facebook,
  Youtube,
  Instagram,
  Twitter,
} from 'lucide-react';

const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate('/');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?query=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/search');
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-xl border-b border-slate-200/80 shadow-xs transition-all duration-300">
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          
          {/* BRAND LOGO LOCKUP (LEFT ALIGNED) */}
          <div className="flex-1 flex items-center justify-start shrink-0">
            <Link to="/" className="flex items-center group py-1">
              <img
                src="/logo.png"
                alt="हातेमालो (HAATEMALO)"
                className="h-12 sm:h-14 w-auto object-contain transition-transform group-hover:scale-[1.02]"
              />
            </Link>
          </div>

          {/* DESKTOP SEGMENTED PILL NAV BAR (DEAD-CENTERED IN VIEWPORT) */}
          <div className="hidden xl:flex items-center justify-center shrink-0">
            <nav className="flex items-center p-1 rounded-2xl bg-slate-100/90 border border-slate-200/70 text-sm font-medium gap-1 shadow-2xs">
              <Link
                to="/explore"
                className={`px-3.5 py-1.5 rounded-xl transition-all duration-200 ease-out whitespace-nowrap text-sm font-medium hover:scale-[1.02] active:scale-95 ${
                  isActive('/explore')
                    ? 'bg-white text-[#C8382C] shadow-xs font-semibold border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                }`}
              >
                Explore
              </Link>

              <Link
                to="/categories"
                className={`px-3.5 py-1.5 rounded-xl transition-all duration-200 ease-out whitespace-nowrap text-sm font-medium hover:scale-[1.02] active:scale-95 ${
                  isActive('/categories')
                    ? 'bg-white text-[#C8382C] shadow-xs font-semibold border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                }`}
              >
                Activities
              </Link>

              <Link
                to="/events"
                className={`px-3.5 py-1.5 rounded-xl transition-all duration-200 ease-out whitespace-nowrap text-sm font-medium hover:scale-[1.02] active:scale-95 ${
                  isActive('/events')
                    ? 'bg-white text-[#C8382C] shadow-xs font-semibold border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                }`}
              >
                Events
              </Link>

              <Link
                to="/blogs"
                className={`px-3.5 py-1.5 rounded-xl transition-all duration-200 ease-out whitespace-nowrap text-sm font-medium hover:scale-[1.02] active:scale-95 ${
                  isActive('/blogs')
                    ? 'bg-white text-[#C8382C] shadow-xs font-semibold border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                }`}
              >
                Stories
              </Link>

              <Link
                to="/members"
                className={`px-3.5 py-1.5 rounded-xl transition-all duration-200 ease-out whitespace-nowrap text-sm font-medium hover:scale-[1.02] active:scale-95 ${
                  isActive('/members')
                    ? 'bg-white text-[#C8382C] shadow-xs font-semibold border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                }`}
              >
                Members
              </Link>

              <Link
                to="/organizations"
                className={`px-3.5 py-1.5 rounded-xl transition-all duration-200 ease-out whitespace-nowrap text-sm font-medium hover:scale-[1.02] active:scale-95 ${
                  isActive('/organizations')
                    ? 'bg-white text-[#C8382C] shadow-xs font-semibold border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                }`}
              >
                Organizations
              </Link>

              <Link
                to="/donate"
                className={`px-3.5 py-1.5 rounded-xl transition-all duration-200 ease-out whitespace-nowrap text-sm font-semibold hover:scale-[1.02] active:scale-95 ${
                  isActive('/donate')
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-700 bg-emerald-50/90 hover:bg-emerald-100'
                }`}
              >
                Donate
              </Link>
            </nav>
          </div>

          {/* RIGHT SEARCH & ACTION HUB (RIGHT ALIGNED, SINGLE-LINE ELEGANT) */}
          <div className="flex-1 flex items-center justify-end gap-2.5 shrink-0 whitespace-nowrap">
            
            {/* Inline Desktop Search Bar */}
            <form onSubmit={handleSearch} className="hidden lg:flex items-center relative shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-28 xl:w-36 focus:w-48 bg-slate-100/90 focus:bg-white border border-slate-200/80 focus:border-[#C8382C] focus:ring-2 focus:ring-[#C8382C]/15 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-800 font-medium placeholder-slate-400 outline-none transition-all duration-300"
              />
            </form>

            {/* Social Media Links directly inside Navbar */}
            <div className="hidden 2xl:flex items-center gap-1 border-r border-slate-200/80 pr-2 mr-0.5 text-slate-500 shrink-0">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" title="Join us on Facebook" className="p-1.5 rounded-lg hover:text-[#1877F2] hover:bg-slate-100 transition-all">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" title="Subscribe on YouTube" className="p-1.5 rounded-lg hover:text-[#FF0000] hover:bg-slate-100 transition-all">
                <Youtube className="w-4 h-4" />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" title="Follow us on Instagram" className="p-1.5 rounded-lg hover:text-[#E4405F] hover:bg-slate-100 transition-all">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="https://x.com" target="_blank" rel="noopener noreferrer" title="Follow us on X (Twitter)" className="p-1.5 rounded-lg hover:text-black hover:bg-slate-100 transition-all">
                <Twitter className="w-4 h-4" />
              </a>
            </div>

            {isAuthenticated ? (
              <div className="flex items-center gap-2.5 shrink-0">
                <NotificationDropdown />

                <Link
                  to="/create-post"
                  className="px-4 py-2 rounded-xl text-sm font-black terracotta-btn text-white shadow-md shadow-[#C8382C]/20 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shrink-0 whitespace-nowrap"
                >
                  <PlusCircle className="w-4.5 h-4.5" />
                  <span className="hidden sm:inline whitespace-nowrap">Create Drive</span>
                </Link>

                <div className="relative shrink-0">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2.5 p-1.5 pl-2 pr-3 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 transition-all shadow-2xs shrink-0"
                  >
                    <div className="relative">
                      <img
                        src={user?.profilePicture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                        alt={user?.name}
                        className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200"
                      />
                      {isAdmin && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#C8382C] text-white rounded-full flex items-center justify-center text-[10px] font-bold border border-white" title="Admin">
                          🛡️
                        </span>
                      )}
                    </div>
                    <div className="hidden sm:flex flex-col text-left">
                      <span className="text-sm font-black text-slate-900 leading-tight whitespace-nowrap">
                        {user?.name?.split(' ')[0]}
                      </span>
                      <span className="text-[10px] font-black text-[#C8382C] uppercase tracking-wider whitespace-nowrap">
                        {isAdmin ? 'ADMIN' : user?.memberLevel || 'MEMBER'}
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400 ml-0.5" />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 rounded-3xl bg-white border border-slate-200/90 shadow-2xl p-2.5 z-50 animate-in fade-in duration-150">
                      <div className="px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/80 rounded-2xl mb-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-sm font-black text-slate-900 truncate">{user?.name}</p>
                          <VerificationBadge level={user?.memberLevel} isVerified={user?.isVerified} />
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5 font-medium">{user?.email}</p>
                      </div>

                      <div className="py-1 space-y-1">
                        {isAdmin && (
                          <>
                            <Link
                              to="/admin"
                              onClick={() => setDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-black text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all"
                            >
                              <ShieldAlert className="w-4.5 h-4.5 text-rose-700" /> Super Admin Portal
                            </Link>
                            <Link
                              to="/admin-dashboard"
                              onClick={() => setDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-black text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-xl transition-all"
                            >
                              <ShieldAlert className="w-4.5 h-4.5 text-amber-700" /> Moderation Queue
                            </Link>
                          </>
                        )}
                        <Link
                          to="/dashboard"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                        >
                          <LayoutDashboard className="w-4.5 h-4.5 text-teal-600" /> User Dashboard
                        </Link>
                        <Link
                          to={`/profile/${user?._id}`}
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                        >
                          <User className="w-4.5 h-4.5 text-sky-600" /> View Profile
                        </Link>
                      </div>

                      <div className="pt-1.5 border-t border-slate-100 mt-1">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-black text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        >
                          <LogOut className="w-4.5 h-4.5" /> Log Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
                <Link
                  to="/login"
                  className="px-3.5 py-2 rounded-xl text-sm font-bold text-slate-700 hover:text-[#C8382C] hover:bg-slate-100 transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap"
                >
                  <LogIn className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="whitespace-nowrap">Log In</span>
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-xl text-sm font-black terracotta-btn shadow-md text-white flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 shrink-0 whitespace-nowrap"
                >
                  <UserPlus className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap">Join HAATEMALO</span>
                </Link>
              </div>
            )}

            {/* MOBILE MENU TRIGGER */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden w-10 h-10 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* MOBILE MENU */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-white/98 backdrop-blur-xl border-b border-slate-200 px-4 py-6 space-y-4 animate-in fade-in duration-150 absolute top-full left-0 w-full shadow-2xl z-50">
          
          <form onSubmit={handleSearch} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search help drives..."
              className="w-full bg-slate-100 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none font-medium"
            />
          </form>

          <div className="grid grid-cols-2 gap-2 text-sm font-bold">
            <Link to="/explore" onClick={() => setMobileMenuOpen(false)} className="p-3.5 rounded-xl bg-slate-100 text-slate-800 flex items-center gap-2.5"><Compass className="w-5 h-5 text-[#C8382C]" /> Explore</Link>
            <Link to="/categories" onClick={() => setMobileMenuOpen(false)} className="p-3.5 rounded-xl bg-slate-100 text-slate-800 flex items-center gap-2.5"><Grid className="w-5 h-5 text-teal-600" /> Activities</Link>
            <Link to="/events" onClick={() => setMobileMenuOpen(false)} className="p-3.5 rounded-xl bg-slate-100 text-slate-800 flex items-center gap-2.5"><Calendar className="w-5 h-5 text-amber-600" /> Events</Link>
            <Link to="/blogs" onClick={() => setMobileMenuOpen(false)} className="p-3.5 rounded-xl bg-slate-100 text-slate-800 flex items-center gap-2.5"><BookOpen className="w-5 h-5 text-purple-600" /> Stories</Link>
            <Link to="/members" onClick={() => setMobileMenuOpen(false)} className="p-3.5 rounded-xl bg-slate-100 text-slate-800 flex items-center gap-2.5"><Users className="w-5 h-5 text-sky-600" /> Members</Link>
            <Link to="/organizations" onClick={() => setMobileMenuOpen(false)} className="p-3.5 rounded-xl bg-slate-100 text-slate-800 flex items-center gap-2.5"><Building2 className="w-5 h-5 text-indigo-600" /> Organizations</Link>
            <Link to="/donate" onClick={() => setMobileMenuOpen(false)} className="col-span-2 p-3.5 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center gap-2.5 font-black border border-emerald-200"><Heart className="w-5 h-5 fill-emerald-600 text-emerald-600" /> Donate & Support</Link>
          </div>

          {/* Mobile Social Links */}
          <div className="flex items-center justify-center gap-4 pt-3 border-t border-slate-100 text-slate-600">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Join Us:</span>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" title="Join us on Facebook" className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:text-[#1877F2] transition-colors"><Facebook className="w-4 h-4" /></a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" title="Subscribe on YouTube" className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:text-[#FF0000] transition-colors"><Youtube className="w-4 h-4" /></a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" title="Follow us on Instagram" className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:text-[#E4405F] transition-colors"><Instagram className="w-4 h-4" /></a>
            <a href="https://x.com" target="_blank" rel="noopener noreferrer" title="Follow us on X" className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:text-black transition-colors"><Twitter className="w-4 h-4" /></a>
          </div>

          {!isAuthenticated ? (
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="w-1/2 py-3.5 rounded-xl font-bold bg-slate-100 text-center text-sm text-slate-800 flex items-center justify-center gap-2"><LogIn className="w-4 h-4 text-slate-500" /> Log In</Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="w-1/2 py-3.5 rounded-xl font-bold terracotta-btn text-center text-sm text-white flex items-center justify-center gap-2"><UserPlus className="w-4 h-4" /> Join HAATEMALO</Link>
            </div>
          ) : (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              {isAdmin && <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="block p-3.5 rounded-xl bg-rose-50 text-sm font-bold text-[#C8382C] text-center">🛡️ Super Admin Portal</Link>}
              <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="block p-3.5 rounded-xl bg-slate-100 text-sm font-bold text-teal-700 text-center">User Dashboard</Link>
              <button onClick={handleLogout} className="w-full text-center p-3.5 rounded-xl bg-rose-50 text-sm font-bold text-rose-700">Log Out</button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
