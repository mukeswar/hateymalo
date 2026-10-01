import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import BadgeList from '../components/BadgeList';
import VerificationBadge from '../components/VerificationBadge';
import EditProfileModal from '../components/EditProfileModal';
import {
  FileText,
  Heart,
  UserCheck,
  Bell,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Award,
  Sparkles,
  BookOpen,
  Calendar,
  Wallet,
  ShieldAlert,
  ArrowRight,
  Edit2,
  PlusCircle,
  Compass,
  Zap,
  TrendingUp,
  MapPin,
  Mail,
  ShieldCheck,
} from 'lucide-react';

const UserDashboard = () => {
  const { user, isAdmin } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);

  const [myPosts, setMyPosts] = useState([]);
  const [joinedActivities, setJoinedActivities] = useState([]);
  const [interestedPosts, setInterestedPosts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my-posts');

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [postsRes, notifRes] = await Promise.all([
        API.get('/posts?status=ALL&sort=newest'),
        API.get('/notifications'),
      ]);

      if (postsRes.data.success) {
        const allPosts = postsRes.data.data;
        const created = allPosts.filter((p) => p.creator?._id === user._id || p.creator === user._id);
        const joined = allPosts.filter((p) => p.joinedUsers?.some((u) => u._id === user._id || u === user._id));
        const interested = allPosts.filter((p) => p.interestedUsers?.some((u) => u._id === user._id || u === user._id));

        setMyPosts(created);
        setJoinedActivities(joined);
        setInterestedPosts(interested);
      }

      if (notifRes.data.success) {
        setNotifications(notifRes.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#C8382C] to-amber-500 animate-spin flex items-center justify-center p-1 shadow-lg">
            <div className="w-full h-full bg-white rounded-xl"></div>
          </div>
          <Zap className="w-6 h-6 text-[#C8382C] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-xs font-bold text-slate-500 tracking-wider uppercase animate-pulse">Loading Your Dashboard...</p>
      </div>
    );
  }

  const approvedPosts = myPosts.filter((p) => p.status === 'APPROVED');
  const totalPeopleHelped = joinedActivities.length * 5 + approvedPosts.length * 10;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Sleek Admin SaaS Command Banner for Staff Accounts */}
      {isAdmin && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 p-6 text-white shadow-2xl border border-rose-500/20 group">
          <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-[#C8382C]/20 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center justify-center shrink-0 shadow-inner">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white">
                    {user.role}
                  </span>
                  <p className="text-sm font-black text-white tracking-wide">Administrative Authority Granted</p>
                </div>
                <p className="text-xs text-slate-300 mt-1">Access master controls, review pending submissions, manage platform users, and track audit ledgers.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
              <Link
                to="/admin"
                className="flex-1 md:flex-none px-4 py-2.5 rounded-xl text-xs font-extrabold bg-white text-slate-900 hover:bg-slate-100 shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-105"
              >
                <ShieldCheck className="w-4 h-4 text-[#C8382C]" /> Super Admin Portal
              </Link>
              <Link
                to="/admin-dashboard"
                className="flex-1 md:flex-none px-4 py-2.5 rounded-xl text-xs font-extrabold bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md shadow-md flex items-center justify-center gap-2 transition-all hover:scale-105"
              >
                Moderation Queue <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Hero Profile Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xl">
        {/* Top Cover Decorative Backdrop */}
        <div className="h-28 bg-gradient-to-r from-[#C8382C]/10 via-amber-500/10 to-teal-500/10 border-b border-slate-100 relative">
          <div className="absolute inset-0 bg-[radial-gradient(#C8382C_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
        </div>

        {/* Profile Content */}
        <div className="px-6 sm:px-8 pb-8 pt-0 relative flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5 -mt-12">
            <div className="relative group">
              <img
                src={user.profilePicture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80'}
                alt={user.name}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-4 border-white shadow-xl ring-2 ring-[#C8382C]/30 bg-white"
              />
              <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white shadow-sm" title="Active Account" />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{user.name}</h1>
                <VerificationBadge level={user.memberLevel} isVerified={user.isVerified} />
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-slate-400" /> {user.email}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[#C8382C]" /> {user.location}</span>
              </div>
              {user.bio && (
                <p className="text-xs text-slate-600 max-w-xl line-clamp-2 italic pt-1">"{user.bio}"</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto shrink-0">
            <button
              onClick={() => setShowEditModal(true)}
              className="flex-1 md:flex-none px-4 py-3 rounded-2xl font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 shadow-xs transition-all text-xs flex items-center justify-center gap-2 active:scale-95"
            >
              <Edit2 className="w-4 h-4 text-teal-600" /> Edit Profile
            </button>
            <Link
              to="/create-post"
              className="flex-1 md:flex-none px-5 py-3 rounded-2xl font-extrabold terracotta-btn text-white shadow-lg shadow-[#C8382C]/20 transition-all text-xs flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95"
            >
              <PlusCircle className="w-4 h-4" /> Request Help / Activity
            </Link>
          </div>
        </div>
      </div>

      {/* Modern Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Posts Created */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-md hover:shadow-lg transition-all group hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Posts Created</span>
            <div className="w-9 h-9 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-[#C8382C] group-hover:text-white transition-colors">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{myPosts.length}</p>
          <p className="text-[10px] font-semibold text-slate-400 mt-1">Total initiatives created</p>
        </div>

        {/* Approved Posts */}
        <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/50 p-5 rounded-3xl border border-emerald-200/80 shadow-md hover:shadow-lg transition-all group hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">Approved</span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-900 mt-2">{approvedPosts.length}</p>
          <p className="text-[10px] font-semibold text-emerald-700 mt-1">Verified & public</p>
        </div>

        {/* Activities Joined */}
        <div className="bg-gradient-to-br from-sky-50/80 to-blue-50/50 p-5 rounded-3xl border border-sky-200/80 shadow-md hover:shadow-lg transition-all group hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-800">Joined Drives</span>
            <div className="w-9 h-9 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition-colors">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-sky-900 mt-2">{joinedActivities.length}</p>
          <p className="text-[10px] font-semibold text-sky-700 mt-1">Drives participated in</p>
        </div>

        {/* Impact / People Helped */}
        <div className="bg-gradient-to-br from-amber-50/80 to-yellow-50/50 p-5 rounded-3xl border border-amber-200/80 shadow-md hover:shadow-lg transition-all group hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">People Helped</span>
            <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-amber-900 mt-2">{totalPeopleHelped}+</p>
          <p className="text-[10px] font-semibold text-amber-700 mt-1">Community impact score</p>
        </div>

        {/* Interested Items */}
        <div className="bg-gradient-to-br from-rose-50/80 to-pink-50/50 p-5 rounded-3xl border border-rose-200/80 shadow-md hover:shadow-lg transition-all group hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-800">Bookmarks</span>
            <div className="w-9 h-9 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <Heart className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-rose-900 mt-2">{interestedPosts.length}</p>
          <p className="text-[10px] font-semibold text-rose-700 mt-1">Saved items</p>
        </div>
      </div>

      {/* Community Achievements & Badges Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
        <BadgeList userId={user._id} />
      </div>

      {/* Pill Tab Navigation Container */}
      <div className="space-y-6">
        <div className="bg-slate-100/90 p-1.5 rounded-2xl flex items-center gap-1 overflow-x-auto border border-slate-200/70 shadow-inner">
          <button
            onClick={() => setActiveTab('my-posts')}
            className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'my-posts'
                ? 'bg-white text-[#C8382C] shadow-md shadow-slate-200/60 scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <FileText className="w-4 h-4" /> My Posts
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              activeTab === 'my-posts' ? 'bg-[#C8382C]/10 text-[#C8382C]' : 'bg-slate-200 text-slate-700'
            }`}>
              {myPosts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('joined')}
            className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'joined'
                ? 'bg-white text-teal-700 shadow-md shadow-slate-200/60 scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <UserCheck className="w-4 h-4" /> Joined Drives
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              activeTab === 'joined' ? 'bg-teal-100 text-teal-800' : 'bg-slate-200 text-slate-700'
            }`}>
              {joinedActivities.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('interested')}
            className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'interested'
                ? 'bg-white text-rose-600 shadow-md shadow-slate-200/60 scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" /> Saved / Interested
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              activeTab === 'interested' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'
            }`}>
              {interestedPosts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 min-w-[170px] py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'notifications'
                ? 'bg-white text-amber-700 shadow-md shadow-slate-200/60 scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Bell className="w-4 h-4 text-amber-600" /> Notifications
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              activeTab === 'notifications' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
            }`}>
              {notifications.length}
            </span>
          </button>
        </div>

        {/* Tab Panel Content */}
        <div className="pt-2">
          {activeTab === 'my-posts' && (
            <div className="space-y-6">
              {myPosts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {myPosts.map((post) => (
                    <div key={post._id} className="relative group">
                      <div className="absolute top-3 left-3 z-10">
                        <span className={`text-[10px] font-black tracking-wider uppercase px-3 py-1 rounded-full border shadow-sm backdrop-blur-md ${
                          post.status === 'APPROVED' ? 'bg-emerald-500/90 text-white border-emerald-400' :
                          post.status === 'PENDING' ? 'bg-amber-500/90 text-white border-amber-400' :
                          'bg-rose-500/90 text-white border-rose-400'
                        }`}>
                          {post.status}
                        </span>
                      </div>
                      <PostCard post={post} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white p-12 sm:p-16 rounded-3xl border border-slate-200/80 text-center space-y-4 shadow-sm">
                  <div className="w-16 h-16 rounded-2xl bg-rose-50 text-[#C8382C] flex items-center justify-center mx-auto border border-rose-100 shadow-inner">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1">
                    <h3 className="text-lg font-extrabold text-slate-900">No Help Posts Created Yet</h3>
                    <p className="text-xs text-slate-500">Need community support or want to organize a local volunteer drive? Create your first post in seconds.</p>
                  </div>
                  <Link
                    to="/create-post"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-extrabold terracotta-btn text-white shadow-lg shadow-[#C8382C]/20 transition-all hover:scale-105"
                  >
                    <PlusCircle className="w-4 h-4" /> Create Your First Activity
                  </Link>
                </div>
              )}
            </div>
          )}

          {activeTab === 'joined' && (
            <div className="space-y-6">
              {joinedActivities.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {joinedActivities.map((post) => (
                    <PostCard key={post._id} post={post} />
                  ))}
                </div>
              ) : (
                <div className="bg-white p-12 sm:p-16 rounded-3xl border border-slate-200/80 text-center space-y-4 shadow-sm">
                  <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto border border-teal-100 shadow-inner">
                    <UserCheck className="w-8 h-8" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1">
                    <h3 className="text-lg font-extrabold text-slate-900">No Joined Community Drives</h3>
                    <p className="text-xs text-slate-500">Explore active tree plantations, river cleanups, tutoring programs, and blood donation drives happening across Nepal.</p>
                  </div>
                  <Link
                    to="/explore"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-extrabold bg-teal-700 hover:bg-teal-800 text-white shadow-lg shadow-teal-700/20 transition-all hover:scale-105"
                  >
                    <Compass className="w-4 h-4" /> Explore Community Drives
                  </Link>
                </div>
              )}
            </div>
          )}

          {activeTab === 'interested' && (
            <div className="space-y-6">
              {interestedPosts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {interestedPosts.map((post) => (
                    <PostCard key={post._id} post={post} />
                  ))}
                </div>
              ) : (
                <div className="bg-white p-12 sm:p-16 rounded-3xl border border-slate-200/80 text-center space-y-4 shadow-sm">
                  <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100 shadow-inner">
                    <Heart className="w-8 h-8" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1">
                    <h3 className="text-lg font-extrabold text-slate-900">No Saved / Bookmarked Posts</h3>
                    <p className="text-xs text-slate-500">Click the heart icon on any community post or event to bookmark it for quick access later.</p>
                  </div>
                  <Link
                    to="/explore"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-extrabold bg-slate-900 hover:bg-slate-800 text-white shadow-md transition-all hover:scale-105"
                  >
                    <Compass className="w-4 h-4" /> Discover Initiatives
                  </Link>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-3">
              {notifications.length > 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-md divide-y divide-slate-100">
                  {notifications.map((n) => (
                    <div key={n._id} className="p-5 flex items-start gap-4 hover:bg-slate-50/80 transition-colors">
                      <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200/70 flex items-center justify-center shrink-0 shadow-xs">
                        <Bell className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5 flex-1">
                        <p className="font-extrabold text-slate-900 text-sm">{n.title}</p>
                        <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                        <p className="text-[10px] font-bold text-slate-400 pt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {new Date(n.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white p-12 rounded-3xl border border-slate-200/80 text-center space-y-3 shadow-sm">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                    <Bell className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-500">No new notifications in your history.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal Component */}
      <EditProfileModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
      />

    </div>
  );
};

export default UserDashboard;
