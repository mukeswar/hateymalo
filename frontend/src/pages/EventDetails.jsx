import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import CommentSection from '../components/CommentSection';
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Heart,
  UserCheck,
  UserPlus,
  Shield,
  Sparkles,
} from 'lucide-react';

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchEvent = async () => {
    try {
      const res = await API.get(`/events/${id}`);
      if (res.data.success) {
        setEvent(res.data.data);
      }
    } catch (error) {
      showToast('Failed to load event details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvent();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white border border-slate-200 shadow-md rounded-3xl text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Event Not Found</h2>
        <Link to="/events" className="inline-block px-5 py-2.5 rounded-xl font-bold bg-teal-600 text-white text-xs">
          Back to Events
        </Link>
      </div>
    );
  }

  const {
    title,
    description,
    coverImage,
    category,
    location,
    date,
    startTime,
    endTime,
    maxParticipants,
    status,
    creator,
    joinedUsers = [],
    interestedUsers = [],
  } = event;

  const isJoined = user && joinedUsers.some((u) => u._id === user._id || u === user._id);
  const isInterested = user && interestedUsers.some((u) => u._id === user._id || u === user._id);
  const joinedCount = joinedUsers.length;
  const isFull = joinedCount >= maxParticipants;

  const handleJoinToggle = async () => {
    if (!user) {
      showToast('Please log in to join official events', 'info');
      navigate('/login');
      return;
    }

    setActionLoading(true);
    try {
      const res = await API.post(`/events/${id}/join`);
      if (res.data.success) {
        showToast(res.data.message, 'success');
        fetchEvent();
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Join failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleInterestToggle = async () => {
    if (!user) {
      showToast('Please log in to mark interest', 'info');
      navigate('/login');
      return;
    }

    setActionLoading(true);
    try {
      const res = await API.post(`/events/${id}/interest`);
      if (res.data.success) {
        showToast(res.data.message, 'success');
        fetchEvent();
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Action failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Back button */}
      <button
        onClick={() => navigate('/events')}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Official Events
      </button>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Cover & Details */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="rounded-3xl overflow-hidden bg-white border border-slate-200 h-80 sm:h-96 relative shadow-md">
            <img
              src={coverImage || 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80'}
              alt={title}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4 flex gap-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/90 text-slate-900 shadow">
                {category}
              </span>
              <span className={`text-xs font-extrabold uppercase px-3 py-1 rounded-full border ${status === 'CANCELLED' ? 'bg-rose-600 text-white border-rose-700 animate-pulse' : 'bg-amber-100 text-amber-800 border-amber-300'}`}>
                {status === 'CANCELLED' ? '⚠ CANCELLED' : status}
              </span>
            </div>

            <button
              onClick={handleInterestToggle}
              disabled={actionLoading}
              className={`absolute top-4 right-4 flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md border transition-all duration-300 shadow-xl ${
                isInterested
                  ? 'bg-rose-600 text-white border-rose-500'
                  : 'bg-white/90 text-rose-600 border-rose-300 hover:bg-rose-600 hover:text-white'
              }`}
            >
              <Heart className={`w-4 h-4 ${isInterested ? 'fill-white' : 'fill-rose-600'}`} />
              <span className="text-xs font-bold">{interestedUsers.length} Interested</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8 space-y-6 border border-slate-200 shadow-md">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
                {title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-600 pt-2 border-t border-slate-100">
                <span className="flex items-center gap-1.5 text-teal-700 font-semibold">
                  <MapPin className="w-4 h-4 text-[#C8382C]" /> {location}
                </span>
                <span className="flex items-center gap-1.5 text-sky-700 font-semibold">
                  <Calendar className="w-4 h-4" /> {new Date(date).toLocaleDateString('ne-NP', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
                <span className="flex items-center gap-1.5 text-amber-700 font-medium">
                  <Clock className="w-4 h-4" /> {startTime} - {endTime}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Event Overview</h3>
              <p className="text-slate-800 text-base leading-relaxed whitespace-pre-line">
                {description}
              </p>
            </div>

            {/* Registered Participants */}
            <div className="pt-6 border-t border-slate-100 space-y-3">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-700" /> Registered Participants ({joinedCount} / {maxParticipants})
              </h3>
              {joinedUsers.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {joinedUsers.map((u) => (
                    <div key={u._id || u} className="flex items-center gap-2 bg-slate-100 p-2 pr-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800">
                      <img src={u.profilePicture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'} alt={u.name} className="w-6 h-6 rounded-lg object-cover" />
                      <span>{u.name || 'Participant'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No participants registered yet.</p>
              )}
            </div>

          </div>

          {/* Event Discussion */}
          <CommentSection postId={id} />

        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 space-y-6 shadow-md sticky top-28">
            <div className="space-y-2 text-center">
              <span className="text-xs font-bold text-teal-700 uppercase tracking-widest">Official Registration</span>
              <h3 className="text-xl font-extrabold text-slate-900">Join Assembly</h3>
              <p className="text-xs text-slate-600">
                Reserve your seat for this official community event.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between font-semibold">
                <span className="text-slate-500">Capacity Limit:</span>
                <span className="text-slate-900 font-bold">{maxParticipants} attendees</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-slate-500">Registered:</span>
                <span className="text-teal-700 font-bold">{joinedCount} attendees</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-slate-500">Seats Remaining:</span>
                <span className="text-amber-700 font-bold">{Math.max(0, maxParticipants - joinedCount)} seats</span>
              </div>

              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200 mt-2">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (joinedCount / maxParticipants) * 100)}%` }}
                />
              </div>
            </div>

            {/* Join / Leave button */}
            <button
              onClick={handleJoinToggle}
              disabled={actionLoading || (isFull && !isJoined)}
              className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                isJoined
                  ? 'bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200'
                  : isFull
                  ? 'bg-slate-200 text-slate-500 border border-slate-300 cursor-not-allowed'
                  : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20 hover:scale-[1.02]'
              }`}
            >
              {isJoined ? (
                <>
                  <UserCheck className="w-4 h-4" /> Cancel Registration
                </>
              ) : isFull ? (
                'Event Fully Booked'
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Register & Join Event
                </>
              )}
            </button>

            {/* Organizer Info */}
            {creator && (
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <span className="text-xs text-slate-500 font-medium">Event Organizer:</span>
                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <img
                    src={creator.profilePicture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                    alt={creator.name}
                    className="w-10 h-10 rounded-xl object-cover"
                  />
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1">
                      {creator.name} <Shield className="w-3 h-3 text-amber-600 fill-amber-600" />
                    </h4>
                    <p className="text-[10px] text-slate-500">HAATEMALO Official Admin</p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

    </div>
  );
};

export default EventDetails;
