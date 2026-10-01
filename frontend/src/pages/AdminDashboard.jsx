import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { useToast } from '../context/ToastContext';
import RejectionModal from '../components/RejectionModal';
import VerificationBadge from '../components/VerificationBadge';
import {
  ShieldAlert,
  Users,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Grid,
  Trash2,
  Check,
  X,
  Plus,
  MessageSquare,
  Shield,
  Calendar,
  BookOpen,
  DollarSign,
  Megaphone,
  Sparkles,
  Send,
  BarChart3,
  UserX,
  UserCheck,
} from 'lucide-react';

const AdminDashboard = () => {
  const { showToast } = useToast();

  const [stats, setStats] = useState({
    totalUsers: 0,
    verifiedUsers: 0,
    totalPosts: 0,
    pendingPosts: 0,
    approvedPosts: 0,
    rejectedPosts: 0,
    upcomingEvents: 0,
    totalEventParticipants: 0,
    pendingBlogs: 0,
    totalDonationsAmount: 0,
    activeCampaigns: 0,
    recentAnnouncements: 0,
    pendingReports: 0,
    categoryStats: [],
  });

  const [pendingQueue, setPendingQueue] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [pendingBlogs, setPendingBlogs] = useState([]);
  const [reportsList, setReportsList] = useState([]);

  const [activeTab, setActiveTab] = useState('moderation');
  const [loading, setLoading] = useState(true);

  // Modals & Rejection
  const [rejectingPost, setRejectingPost] = useState(null);

  // Forms
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventLoc, setEventLoc] = useState('Kathmandu, Nepal');
  const [eventDate, setEventDate] = useState('');
  const [eventMaxPart, setEventMaxPart] = useState(50);

  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, pendingRes, usersRes, blogsRes, reportsRes] = await Promise.all([
        API.get('/admin/stats'),
        API.get('/admin/pending-posts'),
        API.get('/admin/users'),
        API.get('/admin/pending-blogs'),
        API.get('/reports'),
      ]);

      if (statsRes.data.success) setStats(statsRes.data.data);
      if (pendingRes.data.success) setPendingQueue(pendingRes.data.data);
      if (usersRes.data.success) setUsersList(usersRes.data.data);
      if (blogsRes.data.success) setPendingBlogs(blogsRes.data.data);
      if (reportsRes.data.success) setReportsList(reportsRes.data.data);
    } catch (error) {
      showToast('Failed to load admin dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleApprove = async (postId) => {
    try {
      const res = await API.put(`/posts/${postId}/status`, { status: 'APPROVED' });
      if (res.data.success) {
        showToast('Post approved and published publicly!', 'success');
        fetchAdminData();
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Approve failed', 'error');
    }
  };

  const handleConfirmReject = async (reason) => {
    if (!rejectingPost) return;
    try {
      const res = await API.put(`/posts/${rejectingPost._id}/status`, {
        status: 'REJECTED',
        rejectionReason: reason,
      });
      if (res.data.success) {
        showToast('Post rejected and feedback sent to user.', 'info');
        fetchAdminData();
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Rejection failed', 'error');
    } finally {
      setRejectingPost(null);
    }
  };

  const handleBlogApprove = async (blogId) => {
    try {
      const res = await API.put(`/blogs/${blogId}/status`, { status: 'APPROVED' });
      if (res.data.success) {
        showToast('Blog approved and published!', 'success');
        fetchAdminData();
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Approve failed', 'error');
    }
  };

  const handleBlogReject = async (blogId) => {
    const reason = window.prompt('Specify rejection reason for this blog submission:');
    if (!reason) return;
    try {
      const res = await API.put(`/blogs/${blogId}/status`, { status: 'REJECTED', rejectionReason: reason });
      if (res.data.success) {
        showToast('Blog rejected with feedback sent to author.', 'info');
        fetchAdminData();
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Rejection failed', 'error');
    }
  };

  const handleResolveReport = async (reportId, action) => {
    let reasonNote = '';
    if (action === 'SUSPEND_USER') {
      reasonNote = window.prompt('Reason for user account suspension:');
      if (!reasonNote) return;
    }
    try {
      const res = await API.put(`/reports/${reportId}/resolve`, { action, reasonNote });
      if (res.data.success) {
        showToast(res.data.message, 'success');
        fetchAdminData();
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Report resolution failed', 'error');
    }
  };

  const handleUpdateVerification = async (userId, memberLevel, isVerified) => {
    try {
      const res = await API.put(`/admin/users/${userId}/verify`, { memberLevel, isVerified });
      if (res.data.success) {
        showToast(res.data.message, 'success');
        fetchAdminData();
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to update verification', 'error');
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!eventTitle || !eventDesc || !eventDate) return;
    try {
      const res = await API.post('/events', {
        title: eventTitle,
        description: eventDesc,
        location: eventLoc,
        date: eventDate,
        maxParticipants: parseInt(eventMaxPart),
      });

      if (res.data.success) {
        showToast(res.data.message, 'success');
        setEventTitle('');
        setEventDesc('');
        setEventDate('');
        fetchAdminData();
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Event creation failed', 'error');
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!annTitle || !annContent) return;
    try {
      const res = await API.post('/announcements', {
        title: annTitle,
        content: annContent,
      });

      if (res.data.success) {
        showToast(res.data.message, 'success');
        setAnnTitle('');
        setAnnContent('');
        fetchAdminData();
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Announcement broadcast failed', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-widest">
            <ShieldAlert className="w-4 h-4" /> Platform Administration & Moderation Queue
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-1">Admin Command Center</h1>
          <p className="text-xs text-slate-400">Manage member verification levels, user suspensions, reported content, and platform analytics.</p>
        </div>
      </div>

      {/* Stats Analytics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
          <p className="text-[10px] text-slate-400 font-semibold uppercase">Pending Posts</p>
          <p className="text-2xl font-black text-amber-300">{stats.pendingPosts}</p>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-rose-500/30 bg-rose-950/10 space-y-1">
          <p className="text-[10px] text-rose-400 font-semibold uppercase">Pending Reports</p>
          <p className="text-2xl font-black text-rose-300">{stats.pendingReports || 0}</p>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
          <p className="text-[10px] text-slate-400 font-semibold uppercase">Pending Blogs</p>
          <p className="text-2xl font-black text-teal-300">{stats.pendingBlogs || 0}</p>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
          <p className="text-[10px] text-slate-400 font-semibold uppercase">Upcoming Events</p>
          <p className="text-2xl font-black text-sky-300">{stats.upcomingEvents || 0}</p>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/10 space-y-1">
          <p className="text-[10px] text-emerald-400 font-semibold uppercase">Total Raised</p>
          <p className="text-xl font-black text-emerald-300">NPR {stats.totalDonationsAmount || 0}</p>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-sky-500/30 space-y-1">
          <p className="text-[10px] text-sky-400 font-semibold uppercase">Verified Users</p>
          <p className="text-2xl font-black text-sky-300">{stats.verifiedUsers || 0} / {stats.totalUsers}</p>
        </div>
      </div>

      {/* Category Distribution Bar Chart Visualization */}
      {stats.categoryStats && stats.categoryStats.length > 0 && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4" /> Category Distribution Breakdown
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.categoryStats.map((c) => (
              <div key={c._id} className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-white">{c._id}</span>
                  <span className="text-teal-300">{c.count} posts</span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full"
                    style={{ width: `${Math.min(100, (c.count / Math.max(1, stats.totalPosts)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-4 border-b border-slate-800 overflow-x-auto">
        <button
          onClick={() => setActiveTab('moderation')}
          className={`pb-3 text-sm font-bold transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'moderation' ? 'text-amber-400 border-amber-400' : 'text-slate-400 border-transparent hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" /> Pending Posts ({pendingQueue.length})
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`pb-3 text-sm font-bold transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'reports' ? 'text-rose-400 border-rose-400' : 'text-slate-400 border-transparent hover:text-white'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-rose-400" /> Moderation Queue ({reportsList.length})
        </button>

        <button
          onClick={() => setActiveTab('blogs')}
          className={`pb-3 text-sm font-bold transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'blogs' ? 'text-amber-400 border-amber-400' : 'text-slate-400 border-transparent hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4 text-teal-400" /> Blog Moderation ({pendingBlogs.length})
        </button>

        <button
          onClick={() => setActiveTab('verification')}
          className={`pb-3 text-sm font-bold transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'verification' ? 'text-amber-400 border-amber-400' : 'text-slate-400 border-transparent hover:text-white'
          }`}
        >
          <UserCheck className="w-4 h-4 text-sky-400" /> Member Verification Levels
        </button>

        <button
          onClick={() => setActiveTab('events')}
          className={`pb-3 text-sm font-bold transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'events' ? 'text-amber-400 border-amber-400' : 'text-slate-400 border-transparent hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4 text-sky-400" /> Official Event
        </button>

        <button
          onClick={() => setActiveTab('broadcast')}
          className={`pb-3 text-sm font-bold transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'broadcast' ? 'text-amber-400 border-amber-400' : 'text-slate-400 border-transparent hover:text-white'
          }`}
        >
          <Megaphone className="w-4 h-4 text-amber-400" /> Broadcast
        </button>
      </div>

      {/* TAB CONTENTS */}

      {/* 1. Pending Posts */}
      {activeTab === 'moderation' && (
        <div className="space-y-4">
          {pendingQueue.length > 0 ? (
            <div className="space-y-4">
              {pendingQueue.map((post) => (
                <div key={post._id} className="glass-panel p-6 rounded-3xl border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
                  <div className="space-y-2 max-w-2xl">
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-900 text-teal-300 border border-teal-500/30">
                      {post.category}
                    </span>
                    <h3 className="text-xl font-bold text-white">{post.title}</h3>
                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{post.description}</p>
                    <p className="text-xs text-slate-400">Submitted by: {post.creator?.name} ({post.creator?.email})</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button onClick={() => handleApprove(post._id)} className="px-4 py-2.5 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs flex items-center gap-1.5">
                      <Check className="w-4 h-4" /> Approve & Publish
                    </button>
                    <button onClick={() => setRejectingPost(post)} className="px-4 py-2.5 rounded-xl font-bold bg-rose-600 hover:bg-rose-500 text-white text-xs flex items-center gap-1.5">
                      <X className="w-4 h-4" /> Reject Post
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-panel p-12 rounded-3xl text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <p className="text-lg font-bold text-white">All Caught Up!</p>
              <p className="text-xs text-slate-400">No pending posts waiting for review.</p>
            </div>
          )}
        </div>
      )}

      {/* 2. Unified Content & User Moderation Reports Queue */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {reportsList.length > 0 ? (
            <div className="space-y-4">
              {reportsList.map((r) => (
                <div key={r._id} className="glass-panel p-6 rounded-3xl border border-rose-500/40 bg-rose-950/10 space-y-4 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-500/20 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-rose-500 text-white">
                        Reported {r.targetType}
                      </span>
                      <span className="text-xs text-slate-400">By: {r.reporter?.name} ({r.reporter?.email})</span>
                    </div>
                    <span className="text-xs text-rose-300 font-semibold">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-bold text-rose-300">Reported Reason:</p>
                    <p className="text-sm font-semibold text-white bg-slate-900 p-3 rounded-xl border border-slate-800">{r.reason}</p>
                  </div>

                  {r.targetDoc && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                      <p className="text-slate-400 font-medium">Target Content Details:</p>
                      <p className="font-bold text-white">{r.targetDoc.title || r.targetDoc.name || r.targetDoc.content}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <button onClick={() => handleResolveReport(r._id, 'DISMISS')} className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200">
                      Dismiss Report
                    </button>
                    <button onClick={() => handleResolveReport(r._id, 'REMOVE_CONTENT')} className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white">
                      Delete Content
                    </button>
                    <button onClick={() => handleResolveReport(r._id, 'SUSPEND_USER')} className="px-3.5 py-2 rounded-xl text-xs font-bold bg-red-900 hover:bg-red-800 text-rose-200 flex items-center gap-1">
                      <UserX className="w-3.5 h-3.5" /> Suspend / Ban User
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-panel p-12 rounded-3xl text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <p className="text-lg font-bold text-white">Clean Moderation Queue</p>
              <p className="text-xs text-slate-400">No pending safety violation reports.</p>
            </div>
          )}
        </div>
      )}

      {/* 3. Member Verification & Levels Manager */}
      {activeTab === 'verification' && (
        <div className="glass-panel rounded-3xl overflow-hidden border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 font-bold uppercase border-b border-slate-800">
              <tr>
                <th className="p-4">User</th>
                <th className="p-4">Member Level</th>
                <th className="p-4">Verification Checkmark</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {usersList.map((u) => (
                <tr key={u._id} className="hover:bg-slate-900/60">
                  <td className="p-4">
                    <p className="font-bold text-white flex items-center gap-1.5">
                      {u.name} <VerificationBadge level={u.memberLevel} isVerified={u.isVerified} showLabel={false} />
                    </p>
                    <p className="text-[11px] text-slate-400">{u.email}</p>
                  </td>
                  <td className="p-4">
                    <select
                      value={u.memberLevel || 'NEW MEMBER'}
                      onChange={(e) => handleUpdateVerification(u._id, e.target.value, u.isVerified)}
                      className="bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white outline-none"
                    >
                      <option value="NEW MEMBER">NEW MEMBER</option>
                      <option value="TRUSTED MEMBER">TRUSTED MEMBER</option>
                      <option value="VERIFIED MEMBER">VERIFIED MEMBER</option>
                      <option value="ORGANIZATION">ORGANIZATION</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => handleUpdateVerification(u._id, u.memberLevel, !u.isVerified)}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs ${
                        u.isVerified
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {u.isVerified ? '✓ Verified Badge Active' : '+ Grant Verification Badge'}
                    </button>
                  </td>
                  <td className="p-4 text-right">
                    {u.isSuspended ? (
                      <span className="text-rose-400 font-bold">SUSPENDED</span>
                    ) : (
                      <span className="text-emerald-400 font-bold">ACTIVE</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. Blog Moderation */}
      {activeTab === 'blogs' && (
        <div className="space-y-4">
          {pendingBlogs.length > 0 ? (
            <div className="space-y-4">
              {pendingBlogs.map((b) => (
                <div key={b._id} className="glass-panel p-6 rounded-3xl border border-teal-500/30 space-y-3 shadow-xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-teal-300 border border-slate-700">
                        {b.category}
                      </span>
                      <h3 className="text-xl font-bold text-white mt-1">{b.title}</h3>
                      <p className="text-xs text-slate-400">Author: {b.author?.name} ({b.author?.email})</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleBlogApprove(b._id)} className="px-4 py-2 rounded-xl font-bold bg-emerald-500 text-slate-950 text-xs">
                        Approve Blog
                      </button>
                      <button onClick={() => handleBlogReject(b._id)} className="px-4 py-2 rounded-xl font-bold bg-rose-600 text-white text-xs">
                        Reject Blog
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-panel p-12 rounded-3xl text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <p className="text-lg font-bold text-white">No Pending Blogs</p>
            </div>
          )}
        </div>
      )}

      {/* 5. Official Events Form */}
      {activeTab === 'events' && (
        <form onSubmit={handleCreateEvent} className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6 shadow-2xl max-w-3xl mx-auto">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sky-400" /> Create Official Community Event
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Event Title *</label>
              <input type="text" required value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="e.g., Annual Kathmandu Clean River Summit 2026" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Description *</label>
              <textarea rows={4} required value={eventDesc} onChange={(e) => setEventDesc(e.target.value)} placeholder="Event goals, agenda, meeting location details..." className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Location *</label>
                <input type="text" required value={eventLoc} onChange={(e) => setEventLoc(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Date *</label>
                <input type="date" required value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Max Participants</label>
                <input type="number" min={10} value={eventMaxPart} onChange={(e) => setEventMaxPart(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none" />
              </div>
            </div>
          </div>

          <button type="submit" className="w-full py-3.5 rounded-2xl font-bold bg-teal-500 text-slate-950 shadow-xl text-sm">
            Publish Official Event
          </button>
        </form>
      )}

      {/* 6. Broadcast Announcement */}
      {activeTab === 'broadcast' && (
        <form onSubmit={handleCreateAnnouncement} className="glass-panel p-6 sm:p-8 rounded-3xl border border-amber-500/30 bg-amber-950/10 space-y-6 shadow-2xl max-w-3xl mx-auto">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-amber-400" /> Broadcast Platform Announcement
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-amber-300 uppercase mb-1">Announcement Title *</label>
              <input type="text" required value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} placeholder="e.g. Platform Maintenance Notice / Emergency Flood Relief Call" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none" />
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-300 uppercase mb-1">Announcement Message *</label>
              <textarea rows={4} required value={annContent} onChange={(e) => setAnnContent(e.target.value)} placeholder="Message content..." className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none" />
            </div>
          </div>

          <button type="submit" className="w-full py-3.5 rounded-2xl font-bold bg-amber-500 text-slate-950 shadow-xl text-sm flex items-center justify-center gap-2">
            <Send className="w-4 h-4" /> Broadcast Announcement to Community
          </button>
        </form>
      )}

      {/* Admin Rejection Modal */}
      {rejectingPost && (
        <RejectionModal
          isOpen={!!rejectingPost}
          onClose={() => setRejectingPost(null)}
          onConfirm={handleConfirmReject}
          postTitle={rejectingPost.title}
        />
      )}

    </div>
  );
};

export default AdminDashboard;
