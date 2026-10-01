import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../services/api';
import PostCard from '../components/PostCard';
import { useSettings } from '../context/SettingsContext';
import {
  Search,
  HeartHandshake,
  Users,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Calendar,
  BookOpen,
  Megaphone,
  Heart,
  TreePine,
  MapPin,
  Clock,
  UserCheck,
  Quote,
  Check,
  HelpCircle,
  ChevronDown,
  Award,
  Building2,
  Zap,
  GraduationCap,
  TrendingUp,
} from 'lucide-react';

const Home = () => {
  const [latestPosts, setLatestPosts] = useState([]);
  const [featuredPosts, setFeaturedPosts] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [latestBlogs, setLatestBlogs] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeFaq, setActiveFaq] = useState(0);

  const { settings } = useSettings();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [postsRes, featuredRes, eventsRes, blogsRes, annRes, statsRes] = await Promise.all([
          API.get('/posts?sort=newest'),
          API.get('/posts?featured=true'),
          API.get('/events?status=UPCOMING'),
          API.get('/blogs'),
          API.get('/announcements'),
          API.get('/stats'),
        ]);

        if (postsRes.data.success) setLatestPosts(postsRes.data.data.slice(0, 5));
        if (featuredRes.data.success) setFeaturedPosts(featuredRes.data.data.slice(0, 5));
        if (eventsRes.data.success) setUpcomingEvents(eventsRes.data.data.slice(0, 3));
        if (blogsRes.data.success) setLatestBlogs(blogsRes.data.data.slice(0, 3));
        if (annRes.data.success) setAnnouncements(annRes.data.data);
        if (statsRes.data.success) setStats(statsRes.data.data);
      } catch (error) {
        console.error('Home data fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const fmt = (n) => (n === null || n === undefined ? '—' : n.toLocaleString());

  // Show admin-featured posts if any exist; otherwise fall back to newest.
  const featured = featuredPosts.length > 0 ? featuredPosts : latestPosts;

  const CATEGORIES = [
    {
      title: 'Education & Learning',
      desc: 'Free assignment tutoring, book drives, and youth mentorship.',
      img: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80',
      tag: 'Education',
    },
    {
      title: 'Community Cleaning',
      desc: 'Bagmati river cleaning, plastic awareness, and neighborhood sanitation.',
      img: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80',
      tag: 'Cleaning',
    },
    {
      title: 'Environment & Forestry',
      desc: 'Tree plantation, landslide prevention, and green civic drives.',
      img: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
      tag: 'Plantation',
    },
    {
      title: 'Social & Disaster Help',
      desc: 'Monsoon flood relief, food distribution, and emergency warm clothes.',
      img: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80',
      tag: 'Disaster Relief',
    },
    {
      title: 'Projects & Collaboration',
      desc: 'Joint community initiatives, local repairs, and volunteer networks.',
      img: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=800&q=80',
      tag: 'Community Activity',
    },
    {
      title: 'Events & Campaigns',
      desc: 'Official assemblies, blood donation camps, and civic rallies.',
      img: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
      tag: 'Blood Donation',
    },
  ];

  return (
    <div className="space-y-24 pb-20 overflow-hidden bg-[#FAFAFA] text-slate-900">
      
      {/* ADMIN ANNOUNCEMENT BANNER */}
      {announcements.length > 0 && (
        <div className="bg-amber-100 border-b border-amber-300 px-4 py-3 text-center">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 text-xs sm:text-sm text-amber-900">
            <Megaphone className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="font-bold text-amber-950">ANNOUNCEMENT:</span>
            <span className="truncate">{announcements[0].title} — {announcements[0].content}</span>
          </div>
        </div>
      )}

      {/* 1. HERO SECTION (MASTER TWO-COLUMN EDITORIAL COMPOSITION) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* LEFT SIDE CONTENT */}
          <div className="lg:col-span-7 space-y-6 text-left">
            
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full terracotta-badge text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              {settings?.heroSmallLabel || 'Together, We Can Make a Difference'}
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-tight">
                {settings?.heroHeadline ? (
                  settings.heroHeadline.split('\n').map((line, i, arr) => (
                    <React.Fragment key={i}>
                      {i === arr.length - 1 ? (
                        <span className="text-gradient-terracotta">{line}</span>
                      ) : (
                        <>{line}<br /></>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <>
                    मद्दत मागौँ।<br />
                    सहयोग गरौँ।<br />
                    <span className="text-gradient-terracotta">सँगै परिवर्तन ल्याऔँ।</span>
                  </>
                )}
              </h1>

              <p className="text-base sm:text-xl text-slate-600 max-w-xl font-normal leading-relaxed">
                {settings?.heroDescription || 'हातेमालो is a community platform where people can ask for help, offer their skills, join meaningful activities, and create positive change together.'}
              </p>
            </div>

            {/* BUTTONS */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/explore"
                className="px-7 py-4 rounded-2xl text-sm font-bold terracotta-btn flex items-center gap-2 shadow-xl"
              >
                Explore Community <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/create-post"
                className="px-7 py-4 rounded-2xl text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200 transition-all"
              >
                Create a Post
              </Link>
            </div>

            {/* SOCIAL PROOF */}
            <div className="pt-6 border-t border-slate-200 flex items-center gap-4 text-xs text-slate-600">
              <div className="flex -space-x-2">
                <img className="w-8 h-8 rounded-full border-2 border-white" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" alt="User" />
                <img className="w-8 h-8 rounded-full border-2 border-white" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80" alt="User" />
                <img className="w-8 h-8 rounded-full border-2 border-white" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80" alt="User" />
              </div>
              <p className="font-medium text-slate-600">
                Join <strong className="text-slate-900 font-bold">{stats?.totalMembers ? `${fmt(stats.totalMembers)}+` : 'our'}</strong> people helping people and building stronger communities.
              </p>
            </div>

          </div>

          {/* RIGHT SIDE HERO IMAGE COMPOSITION */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl overflow-hidden border border-slate-200 shadow-2xl bg-white group">
              <img
                src={settings?.heroImage || 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1000&q=80'}
                alt="Community Volunteers Nepal"
                className="w-full h-[480px] object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />

              {/* Overlay Badge 1 */}
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-200 shadow-xl flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-900">Together for Change</span>
              </div>

              {/* Overlay Badge 2 */}
              <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 space-y-1 shadow-lg">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-600" /> {fmt(stats?.peopleConnected)} Volunteers Joined
                  </span>
                  <span className="text-[10px] font-bold uppercase text-amber-700">Community Drives</span>
                </div>
                <p className="text-[11px] text-slate-600 line-clamp-1">Bagmati river bank restoration & plastic collection drive</p>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 2. SECTION 1 — COMMUNITY IMPACT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-12 border-y border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-8 text-center bg-white rounded-3xl border shadow-sm">
          <div className="space-y-1">
            <p className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">{fmt(stats?.totalMembers)}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Community Members</p>
          </div>
          <div className="space-y-1">
            <p className="text-4xl sm:text-5xl font-black text-[#C8382C] tracking-tight">{fmt(stats?.peopleConnected)}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">People Connected</p>
          </div>
          <div className="space-y-1">
            <p className="text-4xl sm:text-5xl font-black text-amber-600 tracking-tight">{fmt(stats?.totalActivities)}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Activities Created</p>
          </div>
          <div className="space-y-1">
            <p className="text-4xl sm:text-5xl font-black text-emerald-600 tracking-tight">{fmt(stats?.communitiesReached)}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Communities Reached</p>
          </div>
        </div>
      </section>

      {/* 3. SECTION 2 — HOW HAATEMALO WORKS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-[#C8382C]">Simple & Meaningful</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">How HAATEMALO Works</h2>
          <p className="text-sm text-slate-600">Connecting people who need help with volunteers who want to make a difference.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="bg-white p-8 rounded-3xl space-y-4 border border-slate-200 shadow-sm relative">
            <span className="text-4xl font-black text-[#C8382C]/30">Step 01</span>
            <h3 className="text-xl font-bold text-slate-900 uppercase tracking-wide">POST YOUR NEED OR IDEA</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Tell the community what help, project, or volunteer activity you need assistance with.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl space-y-4 border border-slate-200 shadow-sm relative">
            <span className="text-4xl font-black text-amber-600/30">Step 02</span>
            <h3 className="text-xl font-bold text-slate-900 uppercase tracking-wide">PEOPLE JOIN</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Members who are interested can offer their skills, support, time, or voluntary donations.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl space-y-4 border border-slate-200 shadow-sm relative">
            <span className="text-4xl font-black text-emerald-600/30">Step 03</span>
            <h3 className="text-xl font-bold text-slate-900 uppercase tracking-wide">CREATE IMPACT</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Work together, share updates, and create meaningful results that transform neighborhoods.
            </p>
          </div>

        </div>
      </section>

      {/* NEW SECTION A — WHY CHOOSE HAATEMALO (TRUST & FEATURE PILLARS) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-teal-700">Built On Trust & Community</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Why People Love HAATEMALO</h2>
          <p className="text-sm text-slate-600">The premier platform empowering citizen-led collaboration across Nepal.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3 hover:border-rose-300 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#C8382C] flex items-center justify-center border border-rose-200">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">100% Moderated & Safe</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every request is reviewed by verified administrators to prevent commercial spam and ensure genuine help.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3 hover:border-teal-300 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">Direct Citizen Support</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Connect directly with volunteers and neighbors in your town without middlemen or agency commissions.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3 hover:border-amber-300 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">Volunteer Recognition</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Earn civic badges like Golden Volunteer and Eco Guardian as you contribute time, skills, and support.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3 hover:border-sky-300 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-200">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">Real-Time Alerts</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Get instant notifications when someone joins your drive, leaves a comment, or posts a local emergency.
            </p>
          </div>
        </div>
      </section>

      {/* 4. SECTION 3 — EXPLORE WHAT YOU CAN DO */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Categories</span>
            <h2 className="text-3xl font-extrabold text-slate-900 mt-1">Explore What You Can Do</h2>
          </div>
          <Link to="/categories" className="text-xs font-bold text-[#C8382C] hover:underline flex items-center gap-1">
            View All Categories <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CATEGORIES.map((cat, i) => (
            <Link
              key={i}
              to={`/explore?category=${encodeURIComponent(cat.tag)}`}
              className="group relative rounded-3xl overflow-hidden h-72 border border-slate-200 hover:border-[#C8382C]/50 transition-all duration-500 shadow-md flex flex-col justify-end p-6"
            >
              <img
                src={cat.img}
                alt={cat.title}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

              <div className="relative z-10 space-y-2 text-white">
                <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-white/90 text-slate-900">
                  {cat.tag}
                </span>
                <h3 className="text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
                  {cat.title}
                </h3>
                <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
                  {cat.desc}
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-300 pt-1">
                  Explore Category <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 5. SECTION 4 — FEATURED COMMUNITY STORIES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-amber-700">Featured Action</span>
            <h2 className="text-3xl font-extrabold text-slate-900 mt-1">Featured Community Stories</h2>
          </div>
          <Link to="/explore" className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1">
            See All Posts <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {featured.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* LARGE ASYMMETRIC FEATURED STORY */}
            <div className="lg:col-span-7">
              <Link to={`/post/${featured[0]._id}`} className="group block relative rounded-3xl overflow-hidden h-[420px] border border-slate-200 shadow-lg">
                <img
                  src={featured[0].images?.[0] || 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1000&q=80'}
                  alt={featured[0].title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

                <div className="absolute bottom-6 left-6 right-6 space-y-3 z-10 text-white">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/90 text-slate-900">
                    Featured • {featured[0].category}
                  </span>
                  <h3 className="text-2xl font-extrabold text-white group-hover:text-amber-300 transition-colors">
                    {featured[0].title}
                  </h3>
                  <div className="flex items-center justify-between text-xs text-slate-200 border-t border-white/20 pt-3">
                    <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-rose-400" /> {featured[0].location}</span>
                    <div className="flex items-center gap-4 font-bold">
                      <span className="text-rose-300">❤️ {featured[0].interestedUsers?.length || 0} Interested</span>
                      <span className="text-teal-300">🤝 {featured[0].joinedUsers?.length || 0} Joined</span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>

            {/* SECONDARY STORIES LIST */}
            <div className="lg:col-span-5 space-y-4">
              {featured.slice(1, 4).map((post) => (
                <Link
                  key={post._id}
                  to={`/post/${post._id}`}
                  className="group bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-[#C8382C]/40 transition-all block"
                >
                  <img
                    src={post.images?.[0] || 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=300&q=80'}
                    alt={post.title}
                    className="w-20 h-20 rounded-xl object-cover shrink-0"
                  />
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-amber-700 uppercase">{post.category}</span>
                    <h4 className="font-bold text-slate-900 text-sm group-hover:text-[#C8382C] transition-colors line-clamp-1">
                      {post.title}
                    </h4>
                    <p className="text-[11px] text-slate-500">{post.location} • {post.joinedUsers?.length || 0} Joined</p>
                  </div>
                </Link>
              ))}
            </div>

          </div>
        ) : (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-500 text-sm">
            No featured stories available.
          </div>
        )}
      </section>

      {/* 6. SECTION 5 — UPCOMING EVENTS (CLEAN TIMELINE LIST) */}
      {upcomingEvents.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-sky-700">Official Assemblies</span>
              <h2 className="text-3xl font-extrabold text-slate-900 mt-1">Upcoming Events</h2>
            </div>
            <Link to="/events" className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1">
              View All Events <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-4">
            {upcomingEvents.map((ev) => (
              <div
                key={ev._id}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-sky-500/40 transition-all"
              >
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-sky-50 border border-sky-200 text-sky-700 flex flex-col items-center justify-center font-bold shrink-0">
                    <span className="text-xs uppercase">{new Date(ev.date).toLocaleDateString('ne-NP', { month: 'short' })}</span>
                    <span className="text-xl font-black text-slate-900">{new Date(ev.date).getDate()}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 text-teal-800 border border-slate-200">
                      {ev.category}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">{ev.title}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-4">
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[#C8382C]" /> {ev.location}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-amber-700" /> {ev.startTime}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                    {ev.joinedUsers?.length || 0} / {ev.maxParticipants} Attendees
                  </span>
                  <Link
                    to={`/events/${ev._id}`}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold terracotta-btn shadow-md"
                  >
                    Join Event
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* NEW SECTION B — LATEST COMMUNITY BLOGS & INSIGHTS */}
      {latestBlogs.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-purple-700">Insights & Guides</span>
              <h2 className="text-3xl font-extrabold text-slate-900 mt-1">Community Blog & Stories</h2>
            </div>
            <Link to="/blogs" className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1">
              View All Articles <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {latestBlogs.map((blog) => (
              <Link
                key={blog._id}
                to={`/blogs/${blog._id}`}
                className="group bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div className="relative h-48 overflow-hidden bg-slate-100">
                  <img
                    src={blog.coverImage || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80'}
                    alt={blog.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-white/90 text-purple-800 shadow-xs">
                    {blog.category || 'Story'}
                  </span>
                </div>

                <div className="p-6 space-y-3 flex-grow flex flex-col justify-between">
                  <div className="space-y-2">
                    <h3 className="font-extrabold text-slate-900 text-lg group-hover:text-purple-700 transition-colors line-clamp-2">
                      {blog.title}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {blog.content?.replace(/<[^>]+>/g, '') || 'Read this community article on civic action and volunteerism in Nepal.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="font-bold text-slate-800">{blog.author?.name || 'HAATEMALO Editorial'}</span>
                    <span className="text-[#C8382C] font-extrabold flex items-center gap-1">
                      Read Article <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 7. SECTION 6 — HUMAN STORIES (EMOTIONAL QUOTE STORYTELLING) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center border border-slate-200 shadow-md">
          
          <div className="lg:col-span-5 relative rounded-2xl overflow-hidden h-80 sm:h-96">
            <img
              src="https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80"
              alt="Community Volunteers Cleaning"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="lg:col-span-7 space-y-6">
            <Quote className="w-12 h-12 text-[#C8382C]" />
            <blockquote className="text-xl sm:text-3xl font-extrabold text-slate-900 leading-snug">
              "One small idea brought together 30 strangers to clean our neighborhood."
            </blockquote>
            <p className="text-sm text-slate-600 leading-relaxed">
              When heavy rains caused plastic pollution in our local stream, I posted a simple request on HAATEMALO. Within 48 hours, volunteers, local youth, and shopkeepers showed up with gloves and trash bags. That is the true power of community.
            </p>
            <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#C8382C] text-white flex items-center justify-center font-bold text-sm">
                RS
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">Ramesh Shrestha</p>
                <p className="text-xs text-slate-500">Community Volunteer • Lalitpur</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* NEW SECTION C — VERIFIED NGO & COMMUNITY PARTNERS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-700">Verified Organizations</span>
            <h2 className="text-3xl font-extrabold text-slate-900 mt-1">Our Civic & NGO Partners</h2>
          </div>
          <Link to="/organizations" className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1">
            Explore All Organizations <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-[#C8382C] flex items-center justify-center mx-auto border border-rose-200 font-black text-xl">
              NY
            </div>
            <h3 className="text-base font-extrabold text-slate-900">Nepal Youth Volunteers</h3>
            <p className="text-xs text-slate-500">Youth-led civic action network for emergency relief & tutoring.</p>
            <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Verified NGO</span>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto border border-teal-200 font-black text-xl">
              HG
            </div>
            <h3 className="text-base font-extrabold text-slate-900">Himalayan Green Drive</h3>
            <p className="text-xs text-slate-500">Eco organization dedicated to tree plantation & slope conservation.</p>
            <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Verified NGO</span>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center mx-auto border border-sky-200 font-black text-xl">
              CL
            </div>
            <h3 className="text-base font-extrabold text-slate-900">Child Literacy Nepal</h3>
            <p className="text-xs text-slate-500">Distributing books & conducting free tutoring for village schools.</p>
            <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Verified NGO</span>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto border border-amber-200 font-black text-xl">
              ER
            </div>
            <h3 className="text-base font-extrabold text-slate-900">Emergency Relief Squad</h3>
            <p className="text-xs text-slate-500">Rapid response team for monsoon landslides & winter warm clothing.</p>
            <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Verified NGO</span>
          </div>
        </div>
      </section>

      {/* NEW SECTION D — FREQUENTLY ASKED QUESTIONS (ACCORDION) */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-[#C8382C]">Everything You Need to Know</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Frequently Asked Questions</h2>
          <p className="text-sm text-slate-600">Got questions about HAATEMALO? We have clear answers.</p>
        </div>

        <div className="space-y-3">
          {[
            {
              q: 'Is HAATEMALO completely free for citizens and NGOs?',
              a: 'Yes! Creating an account, posting help requests, joining events, and finding volunteer drives is 100% free forever for all citizens, students, and NGOs across Nepal.'
            },
            {
              q: 'How does the post approval and safety system work?',
              a: 'Every request submitted on HAATEMALO is reviewed by moderators before going public. Posts containing commercial advertising, spam, or scams are rejected with feedback to maintain 100% authentic community focus.'
            },
            {
              q: 'Can I organize a volunteer drive or event in my city or village?',
              a: 'Yes! Anyone registered can create a help request, tutoring session, blood donation event, or neighborhood cleanup drive anywhere in Nepal.'
            },
            {
              q: 'How do volunteer badges and level upgrades work?',
              a: 'As you create posts, join community activities, and receive positive ratings from organizers, your profile levels up automatically (Bronze, Silver, Gold, Diamond) and unlocks special badges.'
            },
            {
              q: 'How can NGOs register as verified partner organizations?',
              a: 'NGOs can register an account with their official details. Once verified by our super administrators, they receive a Verified NGO badge on their organization profile.'
            }
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden transition-all"
            >
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? -1 : idx)}
                className="w-full p-5 text-left font-bold text-slate-900 text-sm flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-[#C8382C] shrink-0" />
                  {item.q}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${activeFaq === idx ? 'rotate-180 text-[#C8382C]' : ''}`} />
              </button>
              {activeFaq === idx && (
                <div className="px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3 animate-in fade-in duration-200">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* NEW SECTION E — BOTTOM HERO CTA BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 rounded-3xl p-10 sm:p-16 text-center text-white space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#C8382C]/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          
          <div className="max-w-2xl mx-auto space-y-3 relative z-10">
            <span className="text-xs font-extrabold uppercase tracking-widest text-amber-300">Ready to Make an Impact?</span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white">Start Your Community Drive Today</h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Whether you need volunteers for a local tree plantation, assignment tutoring, or emergency support — HAATEMALO connects you with people ready to help.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4 pt-2 relative z-10">
            <Link
              to="/create-post"
              className="px-7 py-3.5 rounded-2xl text-xs font-black bg-[#C8382C] hover:bg-[#b02e23] text-white shadow-xl transition-all hover:scale-105"
            >
              + Create a Community Post
            </Link>
            <Link
              to="/explore"
              className="px-7 py-3.5 rounded-2xl text-xs font-black bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all backdrop-blur-md"
            >
              Explore Active Drives
            </Link>
          </div>
        </div>
      </section>

      {/* 8. SECTION 7 — DONATION CTA */}
      {settings?.allowPublicDonations !== false && (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-emerald-50/60 p-10 sm:p-14 rounded-3xl text-center space-y-6 border border-emerald-200 shadow-sm">
          <div className="max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-800">Voluntary & Transparent</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Small Contributions. Real Change.</h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              HAATEMALO is completely free for everyone. Voluntary donations help maintain server infrastructure, support emergency flood response, and empower youth volunteer initiatives across Nepal.
            </p>
          </div>

          <div className="flex justify-center pt-2">
            <Link
              to="/donate"
              className="px-8 py-4 rounded-2xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl transition-all hover:scale-105"
            >
              💚 Make a Voluntary Contribution
            </Link>
          </div>
        </div>
      </section>
      )}

    </div>
  );
};

export default Home;
