import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import RejectionModal from '../components/RejectionModal';
import CommentSection from '../components/CommentSection';
import PostUpdatesSection from '../components/PostUpdatesSection';
import {
  MapPin,
  Calendar,
  Users,
  CheckCircle,
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
} from 'lucide-react';

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
    fetchPost();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white border border-slate-200 shadow-md rounded-3xl text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Post Not Found</h2>
        <Link to="/explore" className="inline-block px-5 py-2.5 rounded-xl font-bold bg-teal-600 text-white text-sm">
          Back to Explore
        </Link>
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

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Back link */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Admin Moderation Bar */}
      {isAdmin && status === 'PENDING' && (
        <div className="bg-amber-50 p-5 rounded-2xl border border-amber-300 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-amber-700 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-900">Admin Action Required</p>
              <p className="text-xs text-amber-800">Review pending submission before public publishing.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleStatusChange('APPROVED')}
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all"
            >
              Approve & Publish
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md transition-all"
            >
              Reject Post
            </button>
          </div>
        </div>
      )}

      {/* Rejection Alert if Creator */}
      {status === 'REJECTED' && rejectionReason && (
        <div className="p-5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-sm space-y-1">
          <div className="flex items-center gap-2 font-bold text-rose-700">
            <AlertTriangle className="w-5 h-5" /> Admin Rejection Reason:
          </div>
          <p className="pl-7 text-rose-800">{rejectionReason}</p>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Details, Updates, Comments */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Main Cover Image */}
          <div className="rounded-3xl overflow-hidden bg-white border border-slate-200 h-80 sm:h-96 relative shadow-md">
            <img
              src={images[0] || 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=1200&q=80'}
              alt={title}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4 flex gap-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/90 text-slate-900 border border-slate-200 shadow">
                {category}
              </span>
            </div>

            {/* Interest ❤️ Float Button */}
            <button
              onClick={handleInterestToggle}
              disabled={actionLoading}
              className={`absolute top-4 right-4 flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md border transition-all duration-300 shadow-xl ${
                isInterested
                  ? 'bg-rose-600 text-white border-rose-500 shadow-rose-600/30'
                  : 'bg-white/90 text-rose-600 border-rose-300 hover:bg-rose-600 hover:text-white'
              }`}
            >
              <Heart className={`w-4 h-4 ${isInterested ? 'fill-white' : 'fill-rose-600'}`} />
              <span className="text-xs font-bold">{interestedUsers.length} Interested</span>
            </button>
          </div>

          {/* Title & Description */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 space-y-6 border border-slate-200 shadow-md">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
                {title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-600 pt-2 border-t border-slate-100">
                <span className="flex items-center gap-1.5 text-teal-700 font-semibold">
                  <MapPin className="w-4 h-4 text-[#C8382C]" /> {location}
                </span>
                <span className="flex items-center gap-1.5 text-sky-700">
                  <Calendar className="w-4 h-4" /> {new Date(dateTime).toLocaleDateString('ne-NP', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Description</h3>
              <p className="text-slate-800 text-base leading-relaxed whitespace-pre-line">
                {description}
              </p>
            </div>

            {/* Capacity breakdown card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold">Required</p>
                <p className="text-xl font-bold text-slate-900">{requiredMembers}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold">Joined</p>
                <p className="text-xl font-bold text-teal-700">{joinedCount}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold">Remaining</p>
                <p className="text-xl font-bold text-amber-700">{remainingMembers}</p>
              </div>
            </div>

            {/* Joined Members preview & View Modal trigger */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-teal-700" /> Joined Volunteers ({joinedCount})
                </h3>
                {isCreator && (
                  <button
                    onClick={() => setShowMembersModal(true)}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Interested & Joined List
                  </button>
                )}
              </div>

              {joinedUsers.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {joinedUsers.map((u) => (
                    <Link
                      key={u._id || u}
                      to={`/profile/${u._id || u}`}
                      className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 p-2 pr-3 rounded-xl border border-slate-200 transition-colors text-xs font-semibold text-slate-800"
                    >
                      <img
                        src={u.profilePicture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                        alt={u.name || 'User'}
                        className="w-6 h-6 rounded-lg object-cover"
                      />
                      <span>{u.name || 'Member'}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No volunteers have joined yet.</p>
              )}
            </div>

          </div>

          {/* Post Updates Section */}
          <PostUpdatesSection postId={id} isCreator={isCreator} />

          {/* Threaded Comments Section */}
          <CommentSection postId={id} />

        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          
          <div className="bg-white rounded-3xl p-6 border border-slate-200 space-y-6 shadow-md sticky top-28">
            
            <div className="space-y-2 text-center">
              <span className="text-xs font-bold text-teal-700 uppercase tracking-widest">Collaborate</span>
              <h3 className="text-xl font-extrabold text-slate-900">Join Activity</h3>
              <p className="text-xs text-slate-600">
                Lend a helping hand or participate in this community drive.
              </p>
            </div>

            {/* Capacity breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between font-semibold">
                <span className="text-slate-500">Required Capacity:</span>
                <span className="text-slate-900 font-bold">{requiredMembers} members</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-slate-500">Joined Members:</span>
                <span className="text-teal-700 font-bold">{joinedCount} members</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-slate-500">Remaining Capacity:</span>
                <span className="text-amber-700 font-bold">{remainingMembers} members</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200 mt-2">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (joinedCount / requiredMembers) * 100)}%` }}
                />
              </div>
            </div>

            {/* Join / Leave Button */}
            {status === 'APPROVED' && (
              <button
                onClick={handleJoinToggle}
                disabled={actionLoading}
                className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                  isJoined
                    ? 'bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200'
                    : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20 hover:scale-[1.02]'
                }`}
              >
                {isJoined ? (
                  <>
                    <UserCheck className="w-4 h-4" /> Leave Activity
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" /> 🤝 Join Activity
                  </>
                )}
              </button>
            )}

            {/* Creator Controls */}
            {(isCreator || isAdmin) && (
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <p className="text-[11px] uppercase tracking-wider font-extrabold text-slate-500 text-center">Owner Controls</p>

                {isCreator && status === 'APPROVED' && (
                  <button
                    onClick={() => handleStatusChange('COMPLETED')}
                    disabled={actionLoading}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-sky-100 text-sky-800 border border-sky-300 hover:bg-sky-200 transition-all flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Mark as Completed
                  </button>
                )}

                <button
                  onClick={handleDeletePost}
                  disabled={actionLoading}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200 transition-all flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" /> Delete Post
                </button>
              </div>
            )}

            {/* Creator Info Card */}
            {creator && (
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <span className="text-xs text-slate-500 font-medium">Organizer / Creator:</span>
                <Link
                  to={`/profile/${creator._id}`}
                  className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 hover:border-teal-500/40 transition-colors group"
                >
                  <img
                    src={creator.profilePicture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                    alt={creator.name}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                  />
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm group-hover:text-teal-700 transition-colors">
                      {creator.name}
                    </h4>
                    <p className="text-xs text-slate-500">{creator.location}</p>
                  </div>
                </Link>
              </div>
            )}

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

      {/* Creator View Interested & Joined Members Modal */}
      {showMembersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-700" /> Interested & Joined Members List
              </h3>
              <button onClick={() => setShowMembersModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Joined Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-700 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4" /> Joined Volunteers ({joinedUsers.length})
                </h4>
                {joinedUsers.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {joinedUsers.map((u) => (
                      <Link
                        key={u._id || u}
                        to={`/profile/${u._id || u}`}
                        className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:border-teal-500/40 transition-colors"
                      >
                        <img
                          src={u.profilePicture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                          alt={u.name}
                          className="w-10 h-10 rounded-xl object-cover"
                        />
                        <div>
                          <p className="font-bold text-slate-900 text-xs">{u.name}</p>
                          <p className="text-[10px] text-slate-500">{u.location}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No members joined yet.</p>
                )}
              </div>

              {/* Interested Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                  <Heart className="w-4 h-4 fill-rose-600" /> Interested Members ({interestedUsers.length})
                </h4>
                {interestedUsers.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {interestedUsers.map((u) => (
                      <Link
                        key={u._id || u}
                        to={`/profile/${u._id || u}`}
                        className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:border-rose-300 transition-colors"
                      >
                        <img
                          src={u.profilePicture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                          alt={u.name}
                          className="w-10 h-10 rounded-xl object-cover"
                        />
                        <div>
                          <p className="font-bold text-slate-900 text-xs">{u.name}</p>
                          <p className="text-[10px] text-slate-500">{u.location}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No members showed interest yet.</p>
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
