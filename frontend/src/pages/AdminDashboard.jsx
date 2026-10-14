import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import RejectionModal from '../components/RejectionModal';
import VerificationBadge from '../components/VerificationBadge';
import Avatar from '../components/ui/Avatar';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Check,
  X,
  Calendar,
  BookOpen,
  Megaphone,
  Send,
  BarChart3,
  UserX,
  UserCheck,
  Clock,
  ArrowUpRight,
  Loader2,
  Flag,
  BadgeCheck,
  Plus,
  Trash2,
} from 'lucide-react';

/* ---------- Small local presentational helpers ---------- */

const StatTile = ({ label, value, tone = 'text-ink', accent }) => (
  <div className="card p-4 space-y-1 min-w-0">
    <p className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
      {accent && <span className={`w-1.5 h-1.5 rounded-full ${accent}`} aria-hidden="true" />}
      {label}
    </p>
    <p className={`font-display text-2xl font-bold leading-tight truncate ${tone}`}>{value}</p>
  </div>
);

const EmptyState = ({ title, text }) => (
  <div className="card p-10 sm:p-12 text-center space-y-2">
    <div className="w-14 h-14 rounded-full bg-pine-tint text-pine flex items-center justify-center mx-auto">
      <CheckCircle2 className="w-7 h-7" aria-hidden="true" />
    </div>
    <p className="font-display text-xl font-bold text-ink pt-2">{title}</p>
    {text && <p className="text-sm text-muted">{text}</p>}
  </div>
);

const QueueSkeleton = () => (
  <div className="space-y-3" aria-hidden="true">
    {[0, 1, 2].map((i) => (
      <div key={i} className="h-32 bg-paper-deep animate-pulse rounded-[var(--radius-card)]" />
    ))}
  </div>
);

// Destructive actions: brand outline that fills on hover.
const dangerBtn =
  'btn btn-sm min-h-10 bg-white text-brand border border-brand/40 hover:bg-brand hover:text-white hover:border-brand';
// Stronger destructive (ban/suspend): solid brand.
const dangerSolidBtn = 'btn btn-sm min-h-10 btn-primary';
const positiveBtn = 'btn btn-sm min-h-10 btn-pine';
const neutralBtn = 'btn btn-sm min-h-10 btn-ghost';

// Each tab needs one staff permission (the server enforces the same rules)
const TABS = [
  { key: 'moderation', label: 'Pending posts', icon: Clock, countKey: 'pending', perm: 'canApprovePosts' },
  { key: 'reports', label: 'Reports', icon: Flag, countKey: 'reports', perm: 'canManageReports' },
  { key: 'blogs', label: 'Blogs', icon: BookOpen, countKey: 'blogs', perm: 'canApprovePosts' },
  { key: 'verification', label: 'Members', icon: UserCheck, perm: 'canManageUsers' },
  { key: 'events', label: 'Official event', icon: Calendar, perm: 'canManageEvents' },
  { key: 'broadcast', label: 'Broadcast', icon: Megaphone, perm: 'canSendNotifications' },
];

const MEMBER_LEVELS = ['NEW MEMBER', 'TRUSTED MEMBER', 'VERIFIED MEMBER', 'ORGANIZATION', 'ADMIN'];

const AdminDashboard = () => {
  const { showToast } = useToast();
  const { can } = useAuth();
  const visibleTabs = TABS.filter((t) => can(t.perm));

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
      // Load only what this staff member may see; one refused request never blocks the rest
      const skip = Promise.resolve(null);
      const safe = (p) => p.catch(() => null);
      const [statsRes, pendingRes, usersRes, blogsRes, reportsRes] = await Promise.all([
        safe(API.get('/admin/stats')),
        can('canApprovePosts') ? safe(API.get('/admin/pending-posts')) : skip,
        can('canManageUsers') ? safe(API.get('/admin/users')) : skip,
        can('canApprovePosts') ? safe(API.get('/admin/pending-blogs')) : skip,
        can('canManageReports') ? safe(API.get('/reports')) : skip,
      ]);

      if (statsRes?.data.success) setStats(statsRes.data.data);
      if (pendingRes?.data.success) setPendingQueue(pendingRes.data.data);
      if (usersRes?.data.success) setUsersList(usersRes.data.data);
      if (blogsRes?.data.success) setPendingBlogs(blogsRes.data.data);
      if (reportsRes?.data.success) setReportsList(reportsRes.data.data);
    } catch (error) {
      showToast('Failed to load admin dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Open the first section this staff member is allowed to use
  useEffect(() => {
    if (!visibleTabs.some((t) => t.key === activeTab) && visibleTabs.length > 0) setActiveTab(visibleTabs[0].key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, visibleTabs.length]);

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

  const tabCounts = {
    pending: pendingQueue.length,
    reports: reportsList.length,
    blogs: pendingBlogs.length,
  };

  const formatNPR = (n) => `NPR ${Number(n || 0).toLocaleString('en-IN')}`;

  const verificationToggle = (u) => (
    <button
      type="button"
      onClick={() => handleUpdateVerification(u._id, u.memberLevel, !u.isVerified)}
      aria-pressed={!!u.isVerified}
      className={`btn btn-sm min-h-10 ${
        u.isVerified
          ? 'bg-pine-tint text-pine border border-pine/25 hover:bg-white hover:border-pine'
          : 'btn-ghost'
      }`}
    >
      {u.isVerified ? (
        <>
          <BadgeCheck className="w-4 h-4" aria-hidden="true" /> Verified badge active
        </>
      ) : (
        <>
          <Plus className="w-4 h-4" aria-hidden="true" /> Grant verification badge
        </>
      )}
    </button>
  );

  const levelSelect = (u, id) => (
    <select
      id={id}
      aria-label={`Member level for ${u.name}`}
      value={u.memberLevel || 'NEW MEMBER'}
      onChange={(e) => handleUpdateVerification(u._id, e.target.value, u.isVerified)}
      className="field !py-2 !text-xs min-h-10 w-full sm:w-auto"
    >
      {MEMBER_LEVELS.map((lvl) => (
        <option key={lvl} value={lvl}>
          {lvl}
        </option>
      ))}
    </select>
  );

  const accountChip = (u) =>
    u.isSuspended ? (
      <span className="chip bg-brand-tint text-brand">Suspended</span>
    ) : (
      <span className="chip bg-pine-tint text-pine">Active</span>
    );

  return (
    <div className="h-full w-full overflow-y-auto bg-paper text-ink">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-sand">
        <div className="container-page flex items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/logo-mark.png" alt="" className="w-9 h-9 object-contain shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted leading-tight truncate">
                Hateymalo <span className="deva">· मोडरेसन</span>
              </p>
              <p className="font-display text-lg font-bold text-ink leading-tight truncate">Moderation desk</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {loading && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted" role="status">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Refreshing
              </span>
            )}
            <Link to="/" className="btn btn-ghost btn-sm min-h-10">
              View site <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <main className="container-page py-8 sm:py-10 space-y-8">
        {/* Intro */}
        <div className="space-y-2">
          <span className="eyebrow">
            <ShieldAlert className="w-4 h-4" aria-hidden="true" /> Platform administration
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-ink">Review & moderation</h1>
          <p className="text-muted max-w-2xl">
            Review submitted posts and blogs, resolve community reports, manage member verification, and publish
            official events and announcements.
          </p>
        </div>

        {/* KPI tiles */}
        <section aria-label="Platform statistics" className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatTile label="Pending posts" value={stats.pendingPosts || 0} tone="text-marigold-text" accent="bg-marigold" />
          <StatTile label="Pending reports" value={stats.pendingReports || 0} tone="text-brand" accent="bg-brand" />
          <StatTile label="Pending blogs" value={stats.pendingBlogs || 0} accent="bg-marigold" />
          <StatTile label="Upcoming events" value={stats.upcomingEvents || 0} tone="text-sky-ink" accent="bg-sky-ink" />
          {can('canViewDonations') && (
            <StatTile label="Total raised" value={formatNPR(stats.totalDonationsAmount)} tone="text-pine" accent="bg-pine" />
          )}
          <StatTile
            label="Verified users"
            value={`${stats.verifiedUsers || 0} / ${stats.totalUsers || 0}`}
            tone="text-pine"
            accent="bg-pine"
          />
        </section>

        {/* Category distribution */}
        {stats.categoryStats && stats.categoryStats.length > 0 && (
          <section className="card p-5 sm:p-6 space-y-4" aria-labelledby="cat-dist-title">
            <h2 id="cat-dist-title" className="text-lg font-bold text-ink flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-muted" aria-hidden="true" /> Posts by category
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
              {stats.categoryStats.map((c) => (
                <div key={c._id} className="space-y-1.5 min-w-0">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="font-semibold text-ink truncate">{c._id}</span>
                    <span className="text-muted shrink-0">{c.count} posts</span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${Math.min(100, (c.count / Math.max(1, stats.totalPosts)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tabs */}
        <div className="border-b border-sand -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto">
          <div role="tablist" aria-label="Admin sections" className="flex items-center gap-1 min-w-max">
            {visibleTabs.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.key;
              const count = t.countKey ? tabCounts[t.countKey] : null;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  id={`tab-${t.key}`}
                  aria-selected={active}
                  aria-controls={`panel-${t.key}`}
                  onClick={() => setActiveTab(t.key)}
                  className={`relative flex items-center gap-2 px-3 sm:px-4 min-h-11 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${
                    active ? 'text-brand border-brand' : 'text-muted border-transparent hover:text-ink'
                  }`}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  {t.label}
                  {count !== null && (
                    <span
                      className={`chip !px-2 !py-0 ${
                        count > 0
                          ? t.key === 'reports'
                            ? 'bg-brand-tint text-brand'
                            : 'bg-marigold-tint text-marigold-text'
                          : 'bg-paper-deep text-muted'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 1. Pending posts */}
        {activeTab === 'moderation' && (
          <section role="tabpanel" id="panel-moderation" aria-labelledby="tab-moderation" className="space-y-3">
            {loading && pendingQueue.length === 0 ? (
              <QueueSkeleton />
            ) : pendingQueue.length > 0 ? (
              pendingQueue.map((post) => (
                <article
                  key={post._id}
                  className="card p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                >
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="chip bg-marigold-tint text-marigold-text">
                        <Clock className="w-3.5 h-3.5" aria-hidden="true" /> Pending review
                      </span>
                      {post.category && <span className="chip bg-sky-tint text-sky-ink">{post.category}</span>}
                    </div>
                    <h3 className="text-xl font-bold text-ink break-words">{post.title}</h3>
                    <p className="text-sm text-ink-soft line-clamp-2">{post.description}</p>
                    <div className="flex items-center gap-2 pt-1 min-w-0">
                      <Avatar name={post.creator?.name || ''} src={post.creator?.profilePicture} size="sm" />
                      <p className="text-sm text-muted truncate">
                        <span className="font-semibold text-ink-soft">{post.creator?.name}</span>
                        {post.creator?.email && <> · {post.creator.email}</>}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                    <button type="button" onClick={() => handleApprove(post._id)} className={positiveBtn}>
                      <Check className="w-4 h-4" aria-hidden="true" /> Approve & publish
                    </button>
                    <button type="button" onClick={() => setRejectingPost(post)} className={dangerBtn}>
                      <X className="w-4 h-4" aria-hidden="true" /> Reject post
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <EmptyState title="All caught up" text="No pending posts are waiting for review." />
            )}
          </section>
        )}

        {/* 2. Reports queue */}
        {activeTab === 'reports' && (
          <section role="tabpanel" id="panel-reports" aria-labelledby="tab-reports" className="space-y-3">
            {loading && reportsList.length === 0 ? (
              <QueueSkeleton />
            ) : reportsList.length > 0 ? (
              reportsList.map((r) => (
                <article key={r._id} className="card p-5 sm:p-6 space-y-4 border-l-4 !border-l-brand">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="chip bg-brand-tint text-brand">
                        <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" /> Reported {r.targetType}
                      </span>
                      <span className="text-sm text-muted truncate">
                        By <span className="font-semibold text-ink-soft">{r.reporter?.name}</span>
                        {r.reporter?.email && <> · {r.reporter.email}</>}
                      </span>
                    </div>
                    <time className="text-sm text-muted shrink-0" dateTime={r.createdAt}>
                      {new Date(r.createdAt).toLocaleDateString()}
                    </time>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">Reason</p>
                    <p className="text-sm text-ink surface-sunken !rounded-xl p-3 break-words">{r.reason}</p>
                  </div>

                  {r.targetDoc && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted">Reported content</p>
                      <p className="text-sm font-semibold text-ink border border-sand rounded-xl p-3 break-words">
                        {r.targetDoc.title || r.targetDoc.name || r.targetDoc.content}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 pt-1">
                    <button type="button" onClick={() => handleResolveReport(r._id, 'DISMISS')} className={neutralBtn}>
                      <Check className="w-4 h-4" aria-hidden="true" /> Dismiss report
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResolveReport(r._id, 'REMOVE_CONTENT')}
                      className={dangerBtn}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" /> Delete content
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResolveReport(r._id, 'SUSPEND_USER')}
                      className={dangerSolidBtn}
                    >
                      <UserX className="w-4 h-4" aria-hidden="true" /> Suspend / ban user
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <EmptyState title="Report queue is clear" text="There are no pending safety reports." />
            )}
          </section>
        )}

        {/* 3. Member verification */}
        {activeTab === 'verification' && (
          <section role="tabpanel" id="panel-verification" aria-labelledby="tab-verification">
            {loading && usersList.length === 0 ? (
              <QueueSkeleton />
            ) : usersList.length === 0 ? (
              <EmptyState title="No members yet" text="Registered members will appear here." />
            ) : (
              <>
                {/* Desktop table */}
                <div className="card overflow-hidden hidden md:block">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-paper text-xs uppercase tracking-wider text-muted border-b border-sand">
                        <tr>
                          <th scope="col" className="px-5 py-3 font-semibold">Member</th>
                          <th scope="col" className="px-5 py-3 font-semibold">Member level</th>
                          <th scope="col" className="px-5 py-3 font-semibold">Verification</th>
                          <th scope="col" className="px-5 py-3 font-semibold text-right">Account</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-sand">
                        {usersList.map((u) => (
                          <tr key={u._id} className="hover:bg-paper/70 transition-colors">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <Avatar name={u.name || ''} src={u.profilePicture} size="md" />
                                <div className="min-w-0">
                                  <p className="font-semibold text-ink flex items-center gap-1.5">
                                    <span className="truncate">{u.name}</span>
                                    <VerificationBadge level={u.memberLevel} isVerified={u.isVerified} showLabel={false} />
                                  </p>
                                  <p className="text-xs text-muted truncate">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3">{levelSelect(u, `level-${u._id}`)}</td>
                            <td className="px-5 py-3">{verificationToggle(u)}</td>
                            <td className="px-5 py-3 text-right">{accountChip(u)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile stacked cards */}
                <ul className="md:hidden space-y-3">
                  {usersList.map((u) => (
                    <li key={u._id} className="card p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar name={u.name || ''} src={u.profilePicture} size="md" />
                          <div className="min-w-0">
                            <p className="font-semibold text-ink flex items-center gap-1.5">
                              <span className="truncate">{u.name}</span>
                              <VerificationBadge level={u.memberLevel} isVerified={u.isVerified} showLabel={false} />
                            </p>
                            <p className="text-xs text-muted truncate">{u.email}</p>
                          </div>
                        </div>
                        {accountChip(u)}
                      </div>
                      <div>
                        <label htmlFor={`level-m-${u._id}`} className="field-label !text-xs">
                          Member level
                        </label>
                        {levelSelect(u, `level-m-${u._id}`)}
                      </div>
                      <div className="[&>button]:w-full">{verificationToggle(u)}</div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}

        {/* 4. Blog moderation */}
        {activeTab === 'blogs' && (
          <section role="tabpanel" id="panel-blogs" aria-labelledby="tab-blogs" className="space-y-3">
            {loading && pendingBlogs.length === 0 ? (
              <QueueSkeleton />
            ) : pendingBlogs.length > 0 ? (
              pendingBlogs.map((b) => (
                <article
                  key={b._id}
                  className="card p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                >
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="chip bg-marigold-tint text-marigold-text">
                        <Clock className="w-3.5 h-3.5" aria-hidden="true" /> Pending review
                      </span>
                      {b.category && <span className="chip bg-sky-tint text-sky-ink">{b.category}</span>}
                    </div>
                    <h3 className="text-xl font-bold text-ink break-words">{b.title}</h3>
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar name={b.author?.name || ''} src={b.author?.profilePicture} size="sm" />
                      <p className="text-sm text-muted truncate">
                        <span className="font-semibold text-ink-soft">{b.author?.name}</span>
                        {b.author?.email && <> · {b.author.email}</>}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                    <button type="button" onClick={() => handleBlogApprove(b._id)} className={positiveBtn}>
                      <Check className="w-4 h-4" aria-hidden="true" /> Approve blog
                    </button>
                    <button type="button" onClick={() => handleBlogReject(b._id)} className={dangerBtn}>
                      <X className="w-4 h-4" aria-hidden="true" /> Reject blog
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <EmptyState title="No pending blogs" text="New blog submissions will appear here for review." />
            )}
          </section>
        )}

        {/* 5. Official event form */}
        {activeTab === 'events' && (
          <section role="tabpanel" id="panel-events" aria-labelledby="tab-events">
            <form onSubmit={handleCreateEvent} className="card p-5 sm:p-8 space-y-6 max-w-3xl mx-auto">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-tint text-sky-ink flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-ink">Create an official community event</h2>
                  <p className="text-sm text-muted">Published events are listed publicly on the Events page.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="ev-title" className="field-label">
                    Event title <span className="text-brand">*</span>
                  </label>
                  <input
                    id="ev-title"
                    type="text"
                    required
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder="e.g., Annual Kathmandu Clean River Summit 2026"
                    className="field"
                  />
                </div>

                <div>
                  <label htmlFor="ev-desc" className="field-label">
                    Description <span className="text-brand">*</span>
                  </label>
                  <textarea
                    id="ev-desc"
                    rows={4}
                    required
                    value={eventDesc}
                    onChange={(e) => setEventDesc(e.target.value)}
                    placeholder="Event goals, agenda, meeting location details..."
                    className="field"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="ev-loc" className="field-label">
                      Location <span className="text-brand">*</span>
                    </label>
                    <input
                      id="ev-loc"
                      type="text"
                      required
                      value={eventLoc}
                      onChange={(e) => setEventLoc(e.target.value)}
                      className="field"
                    />
                  </div>
                  <div>
                    <label htmlFor="ev-date" className="field-label">
                      Date <span className="text-brand">*</span>
                    </label>
                    <input
                      id="ev-date"
                      type="date"
                      required
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="field"
                    />
                  </div>
                  <div>
                    <label htmlFor="ev-max" className="field-label">
                      Max participants
                    </label>
                    <input
                      id="ev-max"
                      type="number"
                      min={10}
                      value={eventMaxPart}
                      onChange={(e) => setEventMaxPart(e.target.value)}
                      className="field"
                    />
                    <p className="text-xs text-muted mt-1">Minimum 10.</p>
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-pine w-full sm:w-auto">
                <Calendar className="w-4 h-4" aria-hidden="true" /> Publish official event
              </button>
            </form>
          </section>
        )}

        {/* 6. Broadcast announcement */}
        {activeTab === 'broadcast' && (
          <section role="tabpanel" id="panel-broadcast" aria-labelledby="tab-broadcast">
            <form onSubmit={handleCreateAnnouncement} className="card p-5 sm:p-8 space-y-6 max-w-3xl mx-auto">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-marigold-tint text-marigold-text flex items-center justify-center shrink-0">
                  <Megaphone className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-ink">Broadcast a platform announcement</h2>
                  <p className="text-sm text-muted">Announcements are shown to the whole community.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="ann-title" className="field-label">
                    Announcement title <span className="text-brand">*</span>
                  </label>
                  <input
                    id="ann-title"
                    type="text"
                    required
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    placeholder="e.g. Platform Maintenance Notice / Emergency Flood Relief Call"
                    className="field"
                  />
                </div>

                <div>
                  <label htmlFor="ann-content" className="field-label">
                    Message <span className="text-brand">*</span>
                  </label>
                  <textarea
                    id="ann-content"
                    rows={4}
                    required
                    value={annContent}
                    onChange={(e) => setAnnContent(e.target.value)}
                    placeholder="Message content..."
                    className="field"
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-full sm:w-auto">
                <Send className="w-4 h-4" aria-hidden="true" /> Broadcast to community
              </button>
            </form>
          </section>
        )}
      </main>

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
