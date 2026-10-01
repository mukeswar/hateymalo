import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import VerificationBadge from '../components/VerificationBadge';
import BadgeList from '../components/BadgeList';
import ReportModal from '../components/ReportModal';
import EditProfileModal from '../components/EditProfileModal';
import { MapPin, Calendar, Mail, UserCheck, AlertTriangle, Building2, ShieldCheck, Edit2, Award, Heart } from 'lucide-react';

const UserProfile = () => {
  const { id } = useParams();
  const { user: currentUser } = useAuth();

  const [profileUser, setProfileUser] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const targetId = id || currentUser?._id;
      if (!targetId) return;

      const [userRes, postsRes] = await Promise.all([
        API.get(`/auth/user/${targetId}`).catch(() => API.get('/auth/me')),
        API.get('/posts?sort=newest'),
      ]);

      if (userRes.data.success) {
        setProfileUser(userRes.data.data);
      }

      if (postsRes.data.success) {
        const allPosts = postsRes.data.data;
        setUserPosts(allPosts.filter((p) => p.creator?._id === targetId || p.creator === targetId));
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [id, currentUser]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#C8382C]"></div>
      </div>
    );
  }

  const u = profileUser || currentUser;
  const isSelf = currentUser && u && currentUser._id === u._id;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Profile Card */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 space-y-6 shadow-md relative">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src={u.profilePicture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80'}
              alt={u.name}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-[#C8382C] shadow-xs"
            />
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                {u.name}
                <VerificationBadge level={u.memberLevel} isVerified={u.isVerified} />
              </h1>
              <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#C8382C]" /> {u.location || 'Nepal'} • {u.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSelf ? (
              <button
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#C8382C] hover:bg-[#b02e23] text-white shadow-md flex items-center gap-1.5 transition-all"
              >
                <Edit2 className="w-4 h-4" /> Edit Profile Details
              </button>
            ) : (
              <button
                onClick={() => setShowReportModal(true)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 border border-rose-200 flex items-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5" /> Report User
              </button>
            )}
          </div>
        </div>

        <p className="text-sm text-slate-700 leading-relaxed border-t border-slate-100 pt-4">
          {u.bio || 'Passionate community contributor on HAATEMALO.'}
        </p>

        {/* Skills & Interests Tags */}
        {(u.skills?.length > 0 || u.interests?.length > 0) && (
          <div className="pt-2 border-t border-slate-100 space-y-3">
            {u.skills?.length > 0 && (
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Skills & Capabilities</span>
                <div className="flex flex-wrap gap-1.5">
                  {u.skills.map((skill, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-xs font-semibold">
                      ⚡ {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {u.interests?.length > 0 && (
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Community Causes & Interests</span>
                <div className="flex flex-wrap gap-1.5">
                  {u.interests.map((interest, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold">
                      ❤️ {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Badges List */}
        <div className="pt-2 border-t border-slate-100">
          <BadgeList userId={u._id} />
        </div>
      </div>

      {/* User Posts */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Community Posts & Initiatives ({userPosts.length})</h3>
        {userPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {userPosts.map((post) => (
              <PostCard key={post._id} post={post} />
            ))}
          </div>
        ) : (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center text-slate-600 text-xs">
            No published posts available yet.
          </div>
        )}
      </div>

      {/* Modals */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetType="USER"
        targetId={u._id}
        targetTitle={u.name}
      />

      <EditProfileModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          fetchProfile();
        }}
      />

    </div>
  );
};

export default UserProfile;
