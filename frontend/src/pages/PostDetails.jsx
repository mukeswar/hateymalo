import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import RejectionModal from '../components/RejectionModal';
import CommentSection from '../components/CommentSection';
import PostUpdatesSection from '../components/PostUpdatesSection';
import AdSlot from '../components/ads/AdSlot';
import ReportModal from '../components/ReportModal';
import VerificationBadge from '../components/VerificationBadge';
import Avatar from '../components/ui/Avatar';
import {
  MapPin,
  CalendarDays,
  Users,
  Clock,
  AlertTriangle,
  UserCheck,
  UserPlus,
  ShieldCheck,
  Trash2,
  CheckCircle2,
  ArrowLeft,
  Heart,
  Eye,
  X,
  Share2,
  Flag,
  XCircle,
  EyeOff,
} from 'lucide-react';

const FALLBACK_COVER = 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=1200&q=80';

const STATUS_STYLES = {
  PENDING: { label: 'Awaiting review', cls: 'bg-marigold-tint text-marigold-text', Icon: Clock },
  APPROVED: { label: 'Open for helpers', cls: 'bg-pine-tint text-pine', Icon: CheckCircle2 },
  COMPLETED: { label: 'Completed', cls: 'bg-pine-tint text-pine', Icon: CheckCircle2 },
  REJECTED: { label: 'Not approved', cls: 'bg-brand-tint text-brand', Icon: XCircle },
  HIDDEN: { label: 'Hidden', cls: 'bg-paper-deep text-ink-soft', Icon: EyeOff },
  ARCHIVED: { label: 'Archived', cls: 'bg-paper-deep text-ink-soft', Icon: EyeOff },
  DRAFT: { label: 'Draft', cls: 'bg-sky-tint text-sky-ink', Icon: Clock },
};

const formatWhen = (d) => {
  if (!d) return null;
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  return {
    day: date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }),
    time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
};

const PersonRow = ({ u, hoverCls }) => (
  <Link
    to={`/profile/${u._id || u}`}
    className={`flex items-center gap-3 p-3 rounded-2xl bg-paper border border-sand transition-colors ${hoverCls}`}
  >
    <Avatar name={u.name || 'Member'} src={u.profilePicture} size="md" />
    <div className="min-w-0">
      <p className="font-semibold text-ink text-sm truncate">{u.name || 'Member'}</p>
      {u.location && <p className="text-xs text-muted truncate">{u.location}</p>}
    </div>
  </Link>
);

const PostDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const fetchPost = async () => {
    try {
      const res = await API.get(`/posts/${id}`);
      if (res.data.success) {
        setPost(res.data.data);
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to fetch post details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setActiveImage(0);
    fetchPost();
  }, [id]);

  // Close the members dialog with Escape
  useEffect(() => {
    if (!showMembersModal) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setShowMembersModal(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showMembersModal]);

  if (loading) {
    return (
      <div className="container-page pt-8 pb-20" aria-busy="true" aria-label="Loading request">
        <div className="h-5 w-20 bg-paper-deep animate-pulse rounded-full" />
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-8">
          <div className="space-y-5">
            <div className="aspect-[16/10] bg-paper-deep animate-pulse rounded-[var(--radius-card)]" />
            <div className="h-10 w-3/4 bg-paper-deep animate-pulse rounded-full" />
            <div className="h-5 w-1/2 bg-paper-deep animate-pulse rounded-full" />
            <div className="h-32 bg-paper-deep animate-pulse rounded-[var(--radius-card)]" />
          </div>
          <div className="h-80 bg-paper-deep animate-pulse rounded-[var(--radius-card)]" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container-page py-20">
        <div className="card max-w-md mx-auto p-10 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-paper-deep text-brand flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" aria-hidden="true" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold text-ink">We couldn't find this request</h1>
          <p className="mt-2 text-muted">It may have been removed, or the link may be incomplete.</p>
          <Link to="/explore" className="btn btn-primary mt-6">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to help requests
          </Link>
        </div>
      </div>
    );
  }

  const {
    title,
    description,
    category,
    location,
    images = [],
    requiredMembers = 1,
    dateTime,
    creator,
    status,
    joinedUsers = [],
    interestedUsers = [],
    rejectionReason,
  } = post;

  const isCreator = user && creator && user._id === creator._id;
  const isJoined = user && joinedUsers.some((u) => u._id === user._id || u === user._id);
  const isInterested = user && interestedUsers.some((u) => u._id === user._id || u === user._id);

  const joinedCount = joinedUsers.length;
  const remainingMembers = Math.max(0, requiredMembers - joinedCount);
  const pct = requiredMembers > 0 ? Math.min(100, Math.round((joinedCount / requiredMembers) * 100)) : 0;

  const gallery = images.length > 0 ? images : [FALLBACK_COVER];
  const cover = gallery[Math.min(activeImage, gallery.length - 1)];
  const when = formatWhen(dateTime);
  const statusStyle = STATUS_STYLES[status];

  const handleJoinToggle = async () => {
    if (!user) {
      showToast('Please log in to join activities or offer help', 'info');
      navigate('/login');
      return;
    }

    setActionLoading(true);
    try {
      const res = await API.post(`/posts/${id}/join`);
      if (res.data.success) {
        setPost(res.data.data);
        showToast(res.data.message, 'success');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Action failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleInterestToggle = async () => {
    if (!user) {
      showToast('Please log in to show interest', 'info');
      navigate('/login');
      return;
    }

    setActionLoading(true);
    try {
      const res = await API.post(`/interactions/posts/${id}/interest`);
      if (res.data.success) {
        setPost(res.data.data);
        showToast(res.data.message, 'success');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Action failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (newStatus, reason = '') => {
    setActionLoading(true);
    try {
      const res = await API.put(`/posts/${id}/status`, {
        status: newStatus,
        rejectionReason: reason,
      });
      if (res.data.success) {
        setPost(res.data.data);
        showToast(`Status updated to ${newStatus}`, 'success');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Status update failed', 'error');
    } finally {
      setActionLoading(false);
      setShowRejectModal(false);
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    setActionLoading(true);
    try {
      const res = await API.delete(`/posts/${id}`);
      if (res.data.success) {
        showToast('Post removed successfully', 'success');
        navigate('/explore');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Delete failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Client-side only: native share sheet where available, otherwise copy the link.
  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      showToast('Link copied to clipboard', 'success');
    } catch (err) {
      if (err?.name !== 'AbortError') showToast('Could not share this link', 'error');
    }
  };

  const handleReportClick = () => {
    if (!user) {
      showToast('Please log in to submit safety reports', 'info');
      navigate('/login');
      return;
    }
    setShowReportModal(true);
  };

  return (
    <div className="pb-20">
      <div className="container-page pt-6 sm:pt-8 space-y-6">
        {/* Back link */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 min-h-[40px] text-sm font-semibold text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back
        </button>

        {/* Admin moderation bar */}
        {isAdmin && status === 'PENDING' && (
          <div className="rounded-[var(--radius-card)] border border-marigold/40 bg-marigold-tint p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-6 h-6 text-marigold-text shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-semibold text-ink">This request is waiting for review</p>
                <p className="text-sm text-ink-soft">Check it over before it is published publicly.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleStatusChange('APPROVED')}
                disabled={actionLoading}
                className="btn btn-pine btn-sm"
              >
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Approve & publish
              </button>
              <button
                type="button"
                onClick={() => setShowRejectModal(true)}
                disabled={actionLoading}
                className="btn btn-primary btn-sm"
              >
                <XCircle className="w-4 h-4" aria-hidden="true" /> Reject
              </button>
            </div>
          </div>
        )}

        {/* Rejection reason */}
        {status === 'REJECTED' && rejectionReason && (
          <div className="rounded-[var(--radius-card)] border border-brand/25 bg-brand-tint p-5" role="status">
            <p className="flex items-center gap-2 font-semibold text-brand">
              <AlertTriangle className="w-5 h-5" aria-hidden="true" /> Reason this request was not approved
            </p>
            <p className="mt-1 pl-7 text-ink-soft">{rejectionReason}</p>
          </div>
        )}

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-8 lg:gap-10">
          {/* A — hero, title, organiser */}
          <section className="lg:col-start-1 space-y-6 min-w-0 animate-rise">
            <div className="space-y-3">
              <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-paper-deep border border-sand shadow-[var(--shadow-soft)] aspect-[16/10]">
                <img src={cover} alt={images.length > 0 ? title : ''} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" aria-hidden="true" />
                <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                  {category && <span className="chip bg-white/95 text-ink shadow-sm">{category}</span>}
                </div>
              </div>

              {gallery.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-1" role="group" aria-label="Photos">
                  {gallery.map((src, i) => (
                    <button
                      key={`${src}-${i}`}
                      type="button"
                      onClick={() => setActiveImage(i)}
                      aria-label={`Show photo ${i + 1} of ${gallery.length}`}
                      aria-pressed={i === activeImage}
                      className={`shrink-0 w-20 h-16 sm:w-24 sm:h-[72px] rounded-xl overflow-hidden border-2 transition-all ${
                        i === activeImage ? 'border-brand shadow-[var(--shadow-soft)]' : 'border-transparent opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img src={src} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              {statusStyle && (
                <span className={`chip ${statusStyle.cls}`}>
                  <statusStyle.Icon className="w-3.5 h-3.5" aria-hidden="true" /> {statusStyle.label}
                </span>
              )}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-ink leading-tight">{title}</h1>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-ink-soft">
                {location && (
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-brand shrink-0" aria-hidden="true" /> {location}
                  </span>
                )}
                {when && (
                  <span className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-brand shrink-0" aria-hidden="true" />
                    {when.day} <span className="text-muted">· {when.time}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Organiser */}
            {creator && (
              <Link
                to={`/profile/${creator._id}`}
                className="group card card-hover flex items-center gap-4 p-4 sm:p-5"
              >
                <Avatar name={creator.name} src={creator.profilePicture} size="lg" />
                <div className="min-w-0 flex-grow">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">Organised by</p>
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-ink group-hover:text-brand transition-colors">
                    <span className="truncate">{creator.name}</span>
                    <VerificationBadge level={creator.memberLevel} isVerified={creator.isVerified} />
                  </p>
                  {creator.location && <p className="text-sm text-muted truncate">{creator.location}</p>}
                </div>
                <ArrowLeft className="w-4 h-4 rotate-180 text-muted group-hover:text-brand group-hover:translate-x-1 transition-all shrink-0" aria-hidden="true" />
              </Link>
            )}
          </section>

          {/* B — action panel (sticky on desktop; appears right after the header on mobile) */}
          <aside className="lg:col-start-2 lg:row-start-1 lg:row-span-2" aria-label="Take part">
            <div className="lg:sticky lg:top-24 space-y-4">
              <div className="card p-6 space-y-5">
                <div>
                  <p className="eyebrow deva">हात दिनुहोस्</p>
                  <h2 className="mt-1 text-2xl font-semibold text-ink">Lend a hand</h2>
                </div>

                {/* Helpers progress */}
                <div>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-ink">
                      <span className="font-display text-3xl font-bold">{joinedCount}</span>
                      <span className="text-muted"> of {requiredMembers} helpers joined</span>
                    </p>
                    <span className="text-sm font-semibold text-ink-soft">{pct}%</span>
                  </div>
                  <div
                    className="progress-track mt-2"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Helpers joined"
                  >
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    {remainingMembers > 0
                      ? `${remainingMembers} more ${remainingMembers === 1 ? 'helper' : 'helpers'} needed`
                      : 'All helper spots are filled'}
                  </p>
                </div>

                {/* Joined avatars */}
                {joinedCount > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {joinedUsers.slice(0, 6).map((u) => (
                        <span key={u._id || u} className="rounded-full ring-2 ring-white">
                          <Avatar name={u.name || 'Member'} src={u.profilePicture} size="sm" />
                        </span>
                      ))}
                    </div>
                    {joinedCount > 6 && <span className="text-sm text-muted">+{joinedCount - 6} more</span>}
                  </div>
                )}

                {/* Join / Leave */}
                {status === 'APPROVED' && (
                  <button
                    type="button"
                    onClick={handleJoinToggle}
                    disabled={actionLoading}
                    className={`btn btn-lg w-full ${isJoined ? 'btn-ghost' : 'btn-primary'}`}
                  >
                    {isJoined ? (
                      <>
                        <UserCheck className="w-5 h-5" aria-hidden="true" /> You've joined · Leave
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-5 h-5" aria-hidden="true" /> Join and help
                      </>
                    )}
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleInterestToggle}
                    disabled={actionLoading}
                    aria-pressed={!!isInterested}
                    className={`btn ${isInterested ? 'bg-brand-tint text-brand border border-brand/30' : 'btn-ghost'}`}
                  >
                    <Heart className={`w-4 h-4 ${isInterested ? 'fill-current' : ''}`} aria-hidden="true" />
                    Interested · {interestedUsers.length}
                  </button>
                  <button type="button" onClick={handleShare} className="btn btn-ghost">
                    <Share2 className="w-4 h-4" aria-hidden="true" /> Share
                  </button>
                </div>

                {!isCreator && (
                  <button
                    type="button"
                    onClick={handleReportClick}
                    className="w-full inline-flex items-center justify-center gap-1.5 min-h-[40px] text-sm text-muted hover:text-brand transition-colors"
                  >
                    <Flag className="w-4 h-4" aria-hidden="true" /> Report this request
                  </button>
                )}
              </div>

              {/* Owner / admin controls */}
              {(isCreator || isAdmin) && (
                <div className="surface-sunken p-5 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                    {isCreator ? 'Your request' : 'Admin controls'}
                  </p>

                  {isCreator && status === 'APPROVED' && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange('COMPLETED')}
                      disabled={actionLoading}
                      className="btn btn-pine w-full"
                    >
                      <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Mark as completed
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleDeletePost}
                    disabled={actionLoading}
                    className="btn w-full bg-white text-brand border border-brand/30 hover:bg-brand-tint"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" /> Delete post
                  </button>
                </div>
              )}
            </div>
          </aside>

          {/* C — story, people, updates, discussion */}
          <div className="lg:col-start-1 space-y-8 min-w-0">
            <section className="card p-6 sm:p-8 space-y-4">
              <h2 className="text-2xl font-semibold text-ink">About this request</h2>
              <p className="text-ink-soft text-lg leading-relaxed whitespace-pre-line">{description}</p>
            </section>

            <section className="card p-6 sm:p-8 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold text-ink flex items-center gap-2">
                  <Users className="w-5 h-5 text-pine" aria-hidden="true" /> Helpers who joined
                  <span className="chip bg-pine-tint text-pine">{joinedCount}</span>
                </h2>
                {isCreator && (
                  <button
                    type="button"
                    onClick={() => setShowMembersModal(true)}
                    className="btn btn-ghost btn-sm"
                  >
                    <Eye className="w-4 h-4" aria-hidden="true" /> View interested & joined
                  </button>
                )}
              </div>

              {joinedUsers.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {joinedUsers.map((u) => (
                    <Link
                      key={u._id || u}
                      to={`/profile/${u._id || u}`}
                      className="flex items-center gap-2 min-h-[40px] pl-1.5 pr-3.5 py-1.5 rounded-full bg-paper border border-sand hover:border-ink transition-colors text-sm font-semibold text-ink-soft"
                    >
                      <Avatar name={u.name || 'Member'} src={u.profilePicture} size="sm" />
                      <span>{u.name || 'Member'}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-muted">
                  No one has joined yet{status === 'APPROVED' ? ' — you could be the first to lend a hand.' : '.'}
                </p>
              )}
            </section>

            {/* Post Updates Section */}
            <PostUpdatesSection postId={id} isCreator={isCreator} />

            {/* Sponsored, below the main content (nothing when no ad is served) */}
            <AdSlot placement="content.footer" layout="wide" category={category} />

            {/* Threaded Comments Section */}
            <CommentSection postId={id} />
          </div>
        </div>
      </div>

      {/* Admin Rejection Modal */}
      <RejectionModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        onConfirm={(reason) => handleStatusChange('REJECTED', reason)}
        postTitle={title}
      />

      {/* Report this post */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetType="POST"
        targetId={id}
        targetTitle={title}
      />

      {/* Creator: view interested & joined members */}
      {showMembersModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowMembersModal(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="members-dialog-title"
            className="card !rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 sm:p-8 space-y-6 animate-pop"
          >
            <div className="flex items-center justify-between gap-4 border-b border-sand pb-4">
              <h3 id="members-dialog-title" className="text-xl font-semibold text-ink flex items-center gap-2">
                <Users className="w-5 h-5 text-pine" aria-hidden="true" /> People on this request
              </h3>
              <button
                type="button"
                onClick={() => setShowMembersModal(false)}
                aria-label="Close"
                className="w-10 h-10 rounded-full flex items-center justify-center text-muted hover:text-ink hover:bg-paper-deep transition-colors"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-pine flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4" aria-hidden="true" /> Joined ({joinedUsers.length})
                </h4>
                {joinedUsers.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {joinedUsers.map((u) => (
                      <PersonRow key={u._id || u} u={u} hoverCls="hover:border-pine/40" />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">No members joined yet.</p>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-brand flex items-center gap-1.5">
                  <Heart className="w-4 h-4 fill-current" aria-hidden="true" /> Interested ({interestedUsers.length})
                </h4>
                {interestedUsers.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {interestedUsers.map((u) => (
                      <PersonRow key={u._id || u} u={u} hoverCls="hover:border-brand/40" />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">No members showed interest yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostDetails;
