import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import VerificationBadge from '../components/VerificationBadge';
import NotificationDropdown from '../components/NotificationDropdown';
import Avatar from '../components/ui/Avatar';
import {
  Plus,
  LayoutDashboard,
  ShieldCheck,
  ShieldAlert,
  User,
  LogOut,
  Menu,
  X,
  Search,
  ChevronDown,
  Heart,
  Compass,
  LayoutGrid,
  CalendarDays,
  BookOpen,
  Building2,
  Users,
} from 'lucide-react';

export const BrandLockup = ({ compact = false }) => (
  <span className="flex items-center gap-2.5">
    <img src="/logo-mark.png" alt="" className="w-10 h-10 sm:w-11 sm:h-11 object-contain" width="44" height="44" />
    <span className="flex flex-col leading-none">
      <span className="font-display text-[1.45rem] sm:text-[1.6rem] font-bold text-ink tracking-tight leading-none">
        हाते<span className="text-brand">मालो</span>
      </span>
      {!compact && (
        <span className="text-[10px] font-semibold tracking-[0.28em] text-muted uppercase mt-1">Hateymalo</span>
      )}
    </span>
  </span>
);

const NAV_LINKS = [
  { to: '/explore', label: 'Help Requests', icon: Compass },
  { to: '/categories', label: 'Causes', icon: LayoutGrid },
  { to: '/events', label: 'Events', icon: CalendarDays },
  { to: '/blogs', label: 'Stories', icon: BookOpen },
  { to: '/organizations', label: 'Organizations', icon: Building2 },
  { to: '/members', label: 'Members', icon: Users },
];

const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { settings } = useSettings();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const donationsOn = settings?.allowPublicDonations !== false;

  // Close menus on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  // Close the account menu on outside click / Escape
  useEffect(() => {
    const onDown = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
        setMobileMenuOpen(false);
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  // Lock page scroll behind the mobile menu
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    navigate('/');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    navigate(q ? `/search?query=${encodeURIComponent(q)}` : '/search');
    setSearchOpen(false);
    setMobileMenuOpen(false);
  };

  const linkClass = ({ isActive }) =>
    `relative px-3 py-2 text-[0.95rem] font-medium transition-colors whitespace-nowrap after:absolute after:left-3 after:right-3 after:-bottom-0.5 after:h-[2px] after:rounded-full after:bg-brand after:origin-left after:transition-transform after:duration-300 ${
      isActive ? 'text-ink after:scale-x-100' : 'text-muted hover:text-ink after:scale-x-0 hover:after:scale-x-100'
    }`;

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-[background-color,box-shadow,border-color] duration-300 border-b ${
        scrolled || mobileMenuOpen
          ? 'bg-paper/90 backdrop-blur-xl border-sand shadow-[0_6px_24px_-16px_rgb(31_27_22/0.35)]'
          : 'bg-paper/70 backdrop-blur-md border-transparent'
      }`}
    >
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 btn btn-primary btn-sm z-[60]">
        Skip to content
      </a>
      <div className="container-page">
        <div className="flex items-center justify-between h-16 sm:h-[72px] gap-4">
          <Link to="/" className="shrink-0 rounded-xl" aria-label="Hateymalo home">
            <BrandLockup />
          </Link>

          {/* Desktop navigation */}
          <nav aria-label="Main" className="hidden xl:flex items-center gap-0.5">
            {NAV_LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} className={linkClass}>
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Search */}
            <div className="relative hidden sm:block">
              {searchOpen ? (
                <form onSubmit={handleSearch} className="flex items-center animate-in">
                  <Search className="w-4 h-4 text-muted absolute left-3.5 pointer-events-none" aria-hidden="true" />
                  <input
                    ref={searchInputRef}
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onBlur={() => !searchQuery && setSearchOpen(false)}
                    placeholder="Search people, causes, events…"
                    aria-label="Search Hateymalo"
                    className="field !rounded-full !py-2 pl-10 w-56 lg:w-72"
                  />
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-ink-soft hover:bg-paper-deep transition-colors"
                  aria-label="Open search"
                >
                  <Search className="w-[18px] h-[18px]" />
                </button>
              )}
            </div>

            {donationsOn && (
              <Link
                to="/donate"
                className="hidden lg:inline-flex btn btn-sm !px-3.5 text-pine bg-pine-tint hover:bg-[#d5e7de] border border-pine/15"
              >
                <Heart className="w-4 h-4 fill-pine/80" aria-hidden="true" /> Donate
              </Link>
            )}

            {isAuthenticated ? (
              <>
                <NotificationDropdown />

                <Link to="/create-post" className="hidden md:inline-flex btn btn-primary btn-sm">
                  <Plus className="w-4 h-4" aria-hidden="true" /> Ask or offer help
                </Link>

                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setDropdownOpen((o) => !o)}
                    aria-haspopup="menu"
                    aria-expanded={dropdownOpen}
                    className="flex items-center gap-2 rounded-full p-1 pr-2 sm:pr-3 border border-sand bg-white hover:border-ink/30 transition-colors"
                  >
                    <Avatar name={user?.name} src={user?.profilePicture} size="sm" />
                    <span className="hidden sm:block text-sm font-semibold text-ink max-w-[7rem] truncate">
                      {user?.name?.split(' ')[0]}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-muted transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                  </button>

                  {dropdownOpen && (
                    <div role="menu" className="absolute right-0 mt-2 w-72 card !rounded-2xl p-2 z-50 animate-in zoom-in-95 origin-top-right">
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-paper">
                        <Avatar name={user?.name} src={user?.profilePicture} size="md" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink truncate">{user?.name}</p>
                          <p className="text-xs text-muted truncate">{user?.email}</p>
                          <div className="mt-1">
                            <VerificationBadge level={isAdmin ? user?.role : user?.memberLevel} isVerified={user?.isVerified} />
                          </div>
                        </div>
                      </div>

                      <div className="py-1.5 space-y-0.5">
                        {isAdmin && (
                          <>
                            <Link role="menuitem" to="/admin" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-brand hover:bg-brand-tint rounded-xl">
                              <ShieldAlert className="w-4 h-4" /> Admin command center
                            </Link>
                            <Link role="menuitem" to="/admin-dashboard" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-marigold-text hover:bg-marigold-tint rounded-xl">
                              <ShieldCheck className="w-4 h-4" /> Moderation queue
                            </Link>
                          </>
                        )}
                        <Link role="menuitem" to="/dashboard" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-paper rounded-xl">
                          <LayoutDashboard className="w-4 h-4 text-pine" /> My dashboard
                        </Link>
                        <Link role="menuitem" to={`/profile/${user?._id}`} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-paper rounded-xl">
                          <User className="w-4 h-4 text-sky-ink" /> My profile
                        </Link>
                        <Link role="menuitem" to="/create-post" className="md:hidden flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-paper rounded-xl">
                          <Plus className="w-4 h-4 text-brand" /> Ask or offer help
                        </Link>
                      </div>

                      <div className="pt-1.5 border-t border-sand">
                        <button
                          role="menuitem"
                          type="button"
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-muted hover:text-brand hover:bg-brand-tint rounded-xl"
                        >
                          <LogOut className="w-4 h-4" /> Log out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="hidden sm:inline-flex btn btn-sm text-ink-soft hover:bg-paper-deep">
                  Log in
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm">
                  Join us
                </Link>
              </>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="xl:hidden w-10 h-10 rounded-full flex items-center justify-center text-ink hover:bg-paper-deep"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile / tablet menu */}
      {mobileMenuOpen && (
        <div
          id="mobile-menu"
          className="xl:hidden absolute top-full inset-x-0 h-[calc(100dvh-4rem)] sm:h-[calc(100dvh-72px)] overflow-y-auto bg-paper border-t border-sand animate-in"
        >
          <div className="container-page py-6 space-y-6">
            <form onSubmit={handleSearch} className="relative">
              <Search className="w-4 h-4 text-muted absolute left-4 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search people, causes, events…"
                aria-label="Search Hateymalo"
                className="field !rounded-full pl-11"
              />
            </form>

            <nav aria-label="Mobile" className="grid grid-cols-2 gap-2.5">
              {NAV_LINKS.map(({ to, label, icon: Icon }, i) => (
                <NavLink
                  key={to}
                  to={to}
                  style={{ animationDelay: `${i * 30}ms` }}
                  className={({ isActive }) =>
                    `animate-in animate-rise card !rounded-2xl p-4 flex flex-col gap-2 ${isActive ? '!border-brand' : ''}`
                  }
                >
                  <Icon className="w-5 h-5 text-brand" aria-hidden="true" />
                  <span className="font-semibold text-ink">{label}</span>
                </NavLink>
              ))}
              {donationsOn && (
                <Link to="/donate" className="col-span-2 btn btn-pine btn-lg">
                  <Heart className="w-5 h-5" aria-hidden="true" /> Support a cause
                </Link>
              )}
            </nav>

            {!isAuthenticated ? (
              <div className="grid grid-cols-2 gap-2.5 pt-4 border-t border-sand">
                <Link to="/login" className="btn btn-ghost">Log in</Link>
                <Link to="/register" className="btn btn-primary">Join Hateymalo</Link>
              </div>
            ) : (
              <div className="space-y-2 pt-4 border-t border-sand">
                <Link to="/create-post" className="btn btn-primary w-full"><Plus className="w-4 h-4" /> Ask or offer help</Link>
                {isAdmin && <Link to="/admin" className="btn btn-ghost w-full">Admin command center</Link>}
                <Link to="/dashboard" className="btn btn-ghost w-full">My dashboard</Link>
                <button type="button" onClick={handleLogout} className="btn w-full text-muted hover:text-brand">Log out</button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
