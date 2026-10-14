import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import VerificationBadge from '../components/VerificationBadge';
import BadgeList from '../components/BadgeList';
import ReportModal from '../components/ReportModal';
import EditProfileModal from '../components/EditProfileModal';
import Avatar from '../components/ui/Avatar';
import { Reveal } from '../components/ui/motion';
import {
  MapPin,
  CalendarDays,
  Mail,
  Flag,
  Building2,
  PenLine,
  Globe,
  Phone,
  FileText,
  UserCheck,
  Sparkles,
  Heart,
  Compass,
  ArrowLeft,
} from 'lucide-react';

const COVER_IMAGE = 'https://images.unsplash.com/photo-1763733595228-7d0a3e35dbad?auto=format&fit=crop&w=1600&q=70';

const safeWebsite = (url = '') => {
  const trimmed = url.trim();
  if (!trimmed) return null;
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProto);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null;
  } catch {
    return null;
  }
};

const memberSince = (d) => {
  if (!d) return null;
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
};

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
      <div className="container-page py-8" aria-busy="true" aria-label="Loading profile">
        <div className="h-40 sm:h-52 bg-paper-deep animate-pulse rounded-[var(--radius-card)]" />
        <div className="mt-6 grid lg:grid-cols-3 gap-6">
          <div className="h-72 bg-paper-deep animate-pulse rounded-[var(--radius-card)]" />
          <div className="lg:col-span-2 h-72 bg-paper-deep animate-pulse rounded-[var(--radius-card)]" />
        </div>
      </div>
    );
  }

  const u = profileUser || currentUser;

  // Guard: previously this crashed when neither a profile nor a signed-in user was available.
  if (!u) {
    return (
      <div className="container-page py-20 text-center">
        <span className="w-14 h-14 mx-auto rounded-full bg-paper-deep text-muted flex items-center justify-center">
          <UserCheck className="w-6 h-6" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-3xl font-bold text-ink">We couldn't find this profile</h1>
        <p className="mt-2 text-muted text-lg">The member may have left, or the link may be incorrect.</p>
        <Link to="/members" className="btn btn-primary mt-6">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Browse members
        </Link>
      </div>
    );
  }

  const isSelf = currentUser && u && currentUser._id === u._id;
  const org = u.orgDetails || {};
  const isOrg = u.memberLevel === 'ORGANIZATION' || !!org.orgName;
  const website = safeWebsite(org.website);
  const since = memberSince(u.createdAt);

  const stats = [
    typeof u.totalPosts === 'number' && { label: 'Approved posts', value: u.totalPosts, icon: FileText, tone: 'bg-brand-tint text-brand' },
    typeof u.totalActivitiesJoined === 'number' && {
      label: 'Drives joined',
      value: u.totalActivitiesJoined,
      icon: UserCheck,
      tone: 'bg-pine-tint text-pine',
    },
  ].filter(Boolean);

  return (
    <div className="pb-20">
      {/* Cover band */}
      <div className="container-page pt-6 sm:pt-8">
        <div className="relative h-36 sm:h-52 rounded-[var(--radius-card)] overflow-hidden bg-paper-deep">
          <img src={COVER_IMAGE} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/45 via-ink/10 to-transparent" />
        </div>
      </div>

      <div className="container-page">
        {/* Identity */}
        <div className="relative -mt-14 sm:-mt-20 px-2 sm:px-8 flex flex-col md:flex-row md:items-end gap-5 md:gap-6">
          <Avatar
            name={u.name}
            src={u.profilePicture}
            size="2xl"
            className="ring-[6px] ring-paper shadow-[var(--shadow-lift)] !w-28 !h-28 sm:!w-32 sm:!h-32"
          />
          <div className="flex-1 min-w-0 md:pb-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-3xl sm:text-4xl font-bold text-ink break-words">{u.name}</h1>
              <VerificationBadge level={u.memberLevel} isVerified={u.isVerified} />
            </div>
            {isOrg && org.orgName && org.orgName !== u.name && (
              <p className="mt-1 text-ink-soft font-medium flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-muted" aria-hidden="true" /> {org.orgName}
                {org.orgType && <span className="chip bg-paper-deep text-ink-soft ml-1">{org.orgType}</span>}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-brand" aria-hidden="true" /> {u.location || 'Nepal'}
              </span>
              {since && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4" aria-hidden="true" /> Member since {since}
                </span>
              )}
              {isSelf && currentUser.email && (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="w-4 h-4" aria-hidden="true" /> {currentUser.email}
                  <span className="text-xs">(only you can see this)</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 md:pb-2">
            {isSelf ? (
              <>
                <button type="button" onClick={() => setShowEditModal(true)} className="btn btn-primary">
                  <PenLine className="w-4 h-4" aria-hidden="true" /> Edit profile
                </button>
                <Link to="/dashboard" className="btn btn-ghost">My dashboard</Link>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                className="btn btn-sm text-muted hover:text-brand hover:bg-brand-tint"
              >
                <Flag className="w-4 h-4" aria-hidden="true" /> Report
              </button>
            )}
          </div>
        </div>

        <div className="mt-10 grid lg:grid-cols-3 gap-6 items-start">
          {/* Sidebar */}
          <aside className="space-y-6 lg:sticky lg:top-24">
            {stats.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {stats.map(({ label, value, icon: Icon, tone }) => (
                  <div key={label} className="card p-4">
                    <span className={`w-9 h-9 rounded-full flex items-center justify-center ${tone}`}>
                      <Icon className="w-4 h-4" aria-hidden="true" />
                    </span>
                    <p className="mt-3 font-display text-3xl font-bold text-ink leading-none">{value}</p>
                    <p className="mt-1 text-sm text-muted">{label}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="card p-6 space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-ink">About</h2>
                <p className="mt-2 text-ink-soft leading-relaxed whitespace-pre-line">
                  {u.bio || 'Passionate community contributor on HATEYMALO.'}
                </p>
              </div>

              {u.skills?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-ink-soft flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-pine" aria-hidden="true" /> Skills
                  </h3>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {u.skills.map((skill, idx) => (
                      <li key={idx} className="chip bg-pine-tint text-pine">{skill}</li>
                    ))}
                  </ul>
                </div>
              )}

              {u.interests?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-ink-soft flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-brand" aria-hidden="true" /> Causes they care about
                  </h3>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {u.interests.map((interest, idx) => (
                      <li key={idx} className="chip bg-brand-tint text-brand">{interest}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {isOrg && (org.orgName || org.description || website || org.contactPhone) && (
              <div className="card p-6 space-y-4">
                <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-pine" aria-hidden="true" /> Organisation
                </h2>
                {org.orgName && (
                  <div>
                    <p className="font-semibold text-ink">{org.orgName}</p>
                    {org.orgType && <p className="text-sm text-muted">{org.orgType}</p>}
                  </div>
                )}
                {org.description && <p className="text-ink-soft leading-relaxed whitespace-pre-line">{org.description}</p>}
                {(website || org.contactPhone) && (
                  <ul className="space-y-2 pt-1">
                    {website && (
                      <li>
                        <a
                          href={website}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="inline-flex items-center gap-2 text-sky-ink font-medium hover:underline underline-offset-4 break-all"
                        >
                          <Globe className="w-4 h-4 shrink-0" aria-hidden="true" /> {org.website}
                        </a>
                      </li>
                    )}
                    {org.contactPhone && (
                      <li>
                        <a href={`tel:${org.contactPhone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-2 text-ink-soft font-medium hover:text-ink">
                          <Phone className="w-4 h-4 shrink-0" aria-hidden="true" /> {org.contactPhone}
                        </a>
                      </li>
                    )}
                  </ul>
                )}
              </div>
            )}

            <div className="card p-6">
              <BadgeList userId={u._id} />
            </div>
          </aside>

          {/* Posts */}
          <section className="lg:col-span-2" aria-labelledby="profile-posts">
            <div className="flex items-end justify-between gap-4 mb-5">
              <div>
                <p className="eyebrow">Activity</p>
                <h2 id="profile-posts" className="mt-1 text-2xl sm:text-3xl font-bold text-ink">
                  {isSelf ? 'Your posts' : 'Posts & initiatives'}{' '}
                  <span className="text-muted font-normal text-xl">({userPosts.length})</span>
                </h2>
              </div>
            </div>

            {userPosts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {userPosts.map((post, i) => (
                  <Reveal key={post._id} delay={Math.min(i, 5) * 60} className="h-full">
                    <PostCard post={post} />
                  </Reveal>
                ))}
              </div>
            ) : (
              <div className="card p-10 text-center">
                <span className="w-14 h-14 mx-auto rounded-full bg-paper-deep text-muted flex items-center justify-center">
                  <FileText className="w-6 h-6" aria-hidden="true" />
                </span>
                <p className="mt-4 font-semibold text-ink">
                  {isSelf ? "You haven't published a post yet." : 'No published posts yet.'}
                </p>
                <p className="mt-1 text-muted">
                  {isSelf ? 'Ask for help or offer it — it only takes a minute.' : 'Their posts will appear here once published.'}
                </p>
                {isSelf ? (
                  <Link to="/create-post" className="btn btn-primary mt-6">Ask or offer help</Link>
                ) : (
                  <Link to="/explore" className="btn btn-ghost mt-6">
                    <Compass className="w-4 h-4" aria-hidden="true" /> Explore help requests
                  </Link>
                )}
              </div>
            )}
          </section>
        </div>
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
