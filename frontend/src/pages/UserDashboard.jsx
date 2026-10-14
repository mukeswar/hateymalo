import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import BadgeList from '../components/BadgeList';
import VerificationBadge from '../components/VerificationBadge';
import EditProfileModal from '../components/EditProfileModal';
import ChangePasswordCard from '../components/ChangePasswordCard';
import Avatar from '../components/ui/Avatar';
import {
  FileText,
  Heart,
  UserCheck,
  Bell,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  PenLine,
  Plus,
  Compass,
  MapPin,
  Mail,
  Hourglass,
  User,
  CalendarDays,
} from 'lucide-react';

const STATUS_STYLES = {
  PENDING: { label: 'Pending review', cls: 'bg-marigold-tint text-marigold-text', icon: Hourglass },
  APPROVED: { label: 'Approved', cls: 'bg-pine-tint text-pine', icon: CheckCircle2 },
  COMPLETED: { label: 'Completed', cls: 'bg-pine-tint text-pine', icon: CheckCircle2 },
  REJECTED: { label: 'Not approved', cls: 'bg-brand-tint text-brand', icon: AlertTriangle },
  CANCELLED: { label: 'Cancelled', cls: 'bg-brand-tint text-brand', icon: AlertTriangle },
  DRAFT: { label: 'Draft', cls: 'bg-sky-tint text-sky-ink', icon: PenLine },
  HIDDEN: { label: 'Hidden', cls: 'bg-paper-deep text-ink-soft', icon: Clock },
  ARCHIVED: { label: 'Archived', cls: 'bg-paper-deep text-ink-soft', icon: Clock },
};

const StatusChip = ({ status }) => {
  const s = STATUS_STYLES[status] || { label: status || 'Unknown', cls: 'bg-sky-tint text-sky-ink', icon: Clock };
  const Icon = s.icon;
  return (
    <span className={`chip ${s.cls}`}>
      <Icon className="w-3.5 h-3.5" aria-hidden="true" /> {s.label}
    </span>
  );
};

const greetingFor = (date = new Date()) => {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const EmptyState = ({ icon: Icon, title, text, action }) => (
  <div className="card p-10 sm:p-14 text-center">
    <span className="w-14 h-14 mx-auto rounded-full bg-paper-deep text-ink-soft flex items-center justify-center">
      <Icon className="w-6 h-6" aria-hidden="true" />
    </span>
    <h3 className="mt-4 text-xl font-semibold text-ink">{title}</h3>
    <p className="mt-1 text-muted max-w-md mx-auto">{text}</p>
    {action && <div className="mt-6">{action}</div>}
  </div>
);

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
      <div className="container-page pt-10 sm:pt-14 pb-16" aria-busy="true" aria-label="Loading your dashboard">
        <div className="h-8 w-48 bg-paper-deep animate-pulse rounded-full" />
        <div className="mt-4 h-12 w-80 max-w-full bg-paper-deep animate-pulse rounded-2xl" />
        <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-paper-deep animate-pulse rounded-[var(--radius-card)]" />
          ))}
        </div>
        <div className="mt-8 h-64 bg-paper-deep animate-pulse rounded-[var(--radius-card)]" />
      </div>
    );
  }

  const approvedPosts = myPosts.filter((p) => p.status === 'APPROVED');
  const pendingPosts = myPosts.filter((p) => p.status === 'PENDING');
  const rejectedPosts = myPosts.filter((p) => p.status === 'REJECTED');
  const firstName = user.name?.split(' ')[0] || 'friend';

  const stats = [
    { label: 'Posts created', value: myPosts.length, icon: FileText, tone: 'bg-brand-tint text-brand' },
    { label: 'Approved & public', value: approvedPosts.length, icon: CheckCircle2, tone: 'bg-pine-tint text-pine' },
    { label: 'Drives joined', value: joinedActivities.length, icon: UserCheck, tone: 'bg-sky-tint text-sky-ink' },
    { label: 'Saved / interested', value: interestedPosts.length, icon: Heart, tone: 'bg-marigold-tint text-marigold-text' },
  ];

  const tabs = [
    { id: 'my-posts', label: 'My posts', icon: FileText, count: myPosts.length },
    { id: 'joined', label: 'Joined drives', icon: UserCheck, count: joinedActivities.length },
    { id: 'interested', label: 'Saved / interested', icon: Heart, count: interestedPosts.length },
    { id: 'notifications', label: 'Notifications', icon: Bell, count: notifications.length },
  ];

  return (
    <div className="pb-20">
      {/* Greeting header */}
      <header className="container-page pt-10 sm:pt-14 pb-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
          <div className="flex items-start gap-5">
            <Avatar name={user.name} src={user.profilePicture} size="lg" className="ring-4 ring-white shadow-[var(--shadow-soft)] hidden sm:inline-flex" />
            <div className="min-w-0">
              <p className="eyebrow deva">नमस्ते, {firstName}</p>
              <h1 className="mt-1 text-4xl sm:text-5xl font-bold text-ink">
                {greetingFor()}, {firstName}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-muted">
                <VerificationBadge level={user.memberLevel} isVerified={user.isVerified} />
                {user.location && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-brand" aria-hidden="true" /> {user.location}
                  </span>
                )}
                {user.email && (
                  <span className="inline-flex items-center gap-1.5 min-w-0">
                    <Mail className="w-4 h-4" aria-hidden="true" /> <span className="truncate">{user.email}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Link to="/create-post" className="btn btn-primary">
              <Plus className="w-4 h-4" aria-hidden="true" /> Ask or offer help
            </Link>
            <Link to="/explore" className="btn btn-ghost">
              <Compass className="w-4 h-4" aria-hidden="true" /> Explore requests
            </Link>
            <button type="button" onClick={() => setShowEditModal(true)} className="btn btn-ghost">
              <PenLine className="w-4 h-4" aria-hidden="true" /> Edit profile
            </button>
          </div>
        </div>
      </header>

      <div className="container-page space-y-10">
        {/* Staff shortcut */}
        {isAdmin && (
          <div className="rounded-[var(--radius-card)] bg-night text-white p-5 sm:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="flex items-center gap-4">
              <span className="w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-semibold flex flex-wrap items-center gap-2">
                  Staff tools <span className="chip bg-brand text-white">{user.role}</span>
                </p>
                <p className="text-white/75 text-sm mt-0.5">Review pending submissions, manage members and platform settings.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Link to="/admin" className="btn btn-sm bg-white text-ink hover:bg-paper">
                <ShieldCheck className="w-4 h-4 text-brand" aria-hidden="true" /> Admin command center
              </Link>
              <Link to="/admin-dashboard" className="btn btn-light btn-sm">
                Moderation queue <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        )}

        {/* Stats */}
        <section aria-label="Your activity" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ label, value, icon: Icon, tone }) => (
            <div key={label} className="card p-5">
              <span className={`w-10 h-10 rounded-full flex items-center justify-center ${tone}`}>
                <Icon className="w-[18px] h-[18px]" aria-hidden="true" />
              </span>
              <p className="mt-4 font-display text-4xl font-bold text-ink leading-none">{value}</p>
              <p className="mt-1.5 text-sm text-muted">{label}</p>
            </div>
          ))}
        </section>

        {/* Status notices for own posts */}
        {(pendingPosts.length > 0 || rejectedPosts.length > 0) && (
          <div className="grid md:grid-cols-2 gap-4">
            {pendingPosts.length > 0 && (
              <div className="rounded-[var(--radius-card)] bg-marigold-tint border border-marigold/30 p-5 flex items-start gap-3">
                <Hourglass className="w-5 h-5 text-marigold-text shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-ink">
                    {pendingPosts.length} {pendingPosts.length === 1 ? 'post is' : 'posts are'} waiting for review
                  </p>
                  <p className="text-sm text-ink-soft mt-0.5">A moderator checks each post before it goes public. You'll get a notification once it's reviewed.</p>
                </div>
              </div>
            )}
            {rejectedPosts.length > 0 && (
              <div className="rounded-[var(--radius-card)] bg-brand-tint border border-brand/20 p-5 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-brand shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-ink">
                    {rejectedPosts.length} {rejectedPosts.length === 1 ? 'post was' : 'posts were'} not approved
                  </p>
                  <p className="text-sm text-ink-soft mt-0.5">See the reason under each post in “My posts” below.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Badges */}
        <section className="card p-6 sm:p-8" aria-labelledby="dash-badges">
          <h2 id="dash-badges" className="sr-only">Your badges</h2>
          <BadgeList userId={user._id} />
        </section>

        {/* Tabs */}
        <section>
          <div role="tablist" aria-label="Dashboard sections" className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 border-b border-sand">
            {tabs.map(({ id, label, icon: Icon, count }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`tab-${id}`}
                  aria-selected={active}
                  aria-controls={`panel-${id}`}
                  onClick={() => setActiveTab(id)}
                  className={`relative shrink-0 inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors whitespace-nowrap after:absolute after:left-3 after:right-3 after:-bottom-[5px] after:h-[2px] after:rounded-full after:transition-transform ${
                    active ? 'text-ink after:bg-brand after:scale-x-100' : 'text-muted hover:text-ink after:scale-x-0'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-brand' : ''}`} aria-hidden="true" />
                  {label}
                  <span className={`chip !px-2 !py-0 ${active ? 'bg-brand-tint text-brand' : 'bg-paper-deep text-ink-soft'}`}>{count}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-8" role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
            {activeTab === 'my-posts' &&
              (myPosts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {myPosts.map((post) => (
                    <div key={post._id} className="flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-2">
                        <StatusChip status={post.status} />
                      </div>
                      <PostCard post={post} />
                      {post.status === 'REJECTED' && (
                        <div className="rounded-2xl bg-brand-tint border border-brand/20 px-4 py-3 text-sm">
                          <p className="font-semibold text-brand-dark">Reason from the moderator</p>
                          <p className="text-ink-soft mt-0.5">{post.rejectionReason || 'No reason was given.'}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={FileText}
                  title="You haven't posted yet"
                  text="Need a hand, or want to organise something in your neighbourhood? Create your first post — it takes a minute."
                  action={
                    <Link to="/create-post" className="btn btn-primary">
                      <Plus className="w-4 h-4" aria-hidden="true" /> Ask or offer help
                    </Link>
                  }
                />
              ))}

            {activeTab === 'joined' &&
              (joinedActivities.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {joinedActivities.map((post) => (
                    <PostCard key={post._id} post={post} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={UserCheck}
                  title="No drives joined yet"
                  text="Browse help requests and community drives near you, and join one that fits your time."
                  action={
                    <Link to="/explore" className="btn btn-pine">
                      <Compass className="w-4 h-4" aria-hidden="true" /> Explore help requests
                    </Link>
                  }
                />
              ))}

            {activeTab === 'interested' &&
              (interestedPosts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {interestedPosts.map((post) => (
                    <PostCard key={post._id} post={post} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Heart}
                  title="Nothing saved yet"
                  text="Mark a post as interested and it will be kept here for later."
                  action={
                    <Link to="/explore" className="btn btn-ghost">
                      <Compass className="w-4 h-4" aria-hidden="true" /> Discover initiatives
                    </Link>
                  }
                />
              ))}

            {activeTab === 'notifications' &&
              (notifications.length > 0 ? (
                <ul className="card divide-y divide-sand overflow-hidden">
                  {notifications.map((n) => (
                    <li key={n._id} className={`p-5 flex items-start gap-4 ${n.read ? '' : 'bg-brand-tint/30'}`}>
                      <span className="w-10 h-10 rounded-full bg-marigold-tint text-marigold-text flex items-center justify-center shrink-0">
                        <Bell className="w-[18px] h-[18px]" aria-hidden="true" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-ink">{n.title}</p>
                        {n.message && <p className="text-ink-soft text-sm leading-relaxed mt-0.5">{n.message}</p>}
                        <p className="text-xs text-muted mt-1.5 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" aria-hidden="true" /> {new Date(n.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={Bell} title="No notifications yet" text="Updates on your posts and the drives you join will appear here." />
              ))}
          </div>
        </section>

        {/* Quick links */}
        <section className="grid sm:grid-cols-3 gap-4" aria-label="Quick links">
          <Link to={`/profile/${user._id}`} className="card card-hover p-5 flex items-center gap-3">
            <User className="w-5 h-5 text-sky-ink" aria-hidden="true" />
            <span className="font-semibold text-ink">View my public profile</span>
            <ArrowRight className="w-4 h-4 text-muted ml-auto" aria-hidden="true" />
          </Link>
          <Link to="/events" className="card card-hover p-5 flex items-center gap-3">
            <CalendarDays className="w-5 h-5 text-pine" aria-hidden="true" />
            <span className="font-semibold text-ink">Upcoming events</span>
            <ArrowRight className="w-4 h-4 text-muted ml-auto" aria-hidden="true" />
          </Link>
          <Link to="/organizations" className="card card-hover p-5 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-brand" aria-hidden="true" />
            <span className="font-semibold text-ink">Organisations</span>
            <ArrowRight className="w-4 h-4 text-muted ml-auto" aria-hidden="true" />
          </Link>
        </section>

        <ChangePasswordCard />
      </div>

      <EditProfileModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} />
    </div>
  );
};

export default UserDashboard;
