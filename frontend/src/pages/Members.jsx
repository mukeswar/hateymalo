import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import Avatar from '../components/ui/Avatar';
import { MapPin, Search, Shield, RotateCcw, ArrowRight, BadgeCheck, Users } from 'lucide-react';

const LEVELS = {
  'NEW MEMBER': { label: 'New member', cls: 'bg-paper-deep text-ink-soft' },
  'TRUSTED MEMBER': { label: 'Trusted member', cls: 'bg-sky-tint text-sky-ink' },
  'VERIFIED MEMBER': { label: 'Verified member', cls: 'bg-pine-tint text-pine' },
  ORGANIZATION: { label: 'Organisation', cls: 'bg-sky-tint text-sky-ink' },
  ADMIN: { label: 'Admin', cls: 'bg-brand-tint text-brand' },
};

const LevelBadge = ({ level }) => {
  const meta = LEVELS[level];
  if (!meta) return null;
  return <span className={`chip ${meta.cls}`}>{meta.label}</span>;
};

const Members = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search filters
  const [searchName, setSearchName] = useState('');
  const [searchSkill, setSearchSkill] = useState('');
  const [searchInterest, setSearchInterest] = useState('');
  const [searchLocation, setSearchLocation] = useState('');

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await API.get('/auth/members');
        if (res.data.success) {
          setMembers(res.data.data);
        }
      } catch (error) {
        console.log('Failed to load members list:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, []);

  // Filter members based on criteria
  const filteredMembers = members.filter((member) => {
    const nameMatch = !searchName || member.name?.toLowerCase().includes(searchName.toLowerCase());
    const locationMatch = !searchLocation || member.location?.toLowerCase().includes(searchLocation.toLowerCase());

    const skillMatch = !searchSkill || (member.skills && member.skills.some((s) => s.toLowerCase().includes(searchSkill.toLowerCase())));
    const interestMatch = !searchInterest || (member.interests && member.interests.some((i) => i.toLowerCase().includes(searchInterest.toLowerCase())));

    return nameMatch && locationMatch && skillMatch && interestMatch;
  });

  const handleClearFilters = () => {
    setSearchName('');
    setSearchSkill('');
    setSearchInterest('');
    setSearchLocation('');
  };

  const hasFilters = searchName || searchSkill || searchInterest || searchLocation;

  return (
    <div className="pb-20">
      {/* Header */}
      <header className="container-page pt-10 sm:pt-14 pb-8 animate-rise">
        <div className="max-w-2xl space-y-3">
          <span className="eyebrow deva">समुदायका सदस्यहरू</span>
          <h1 className="text-4xl sm:text-5xl font-bold text-ink leading-[1.08]">The people behind the help</h1>
          <p className="text-muted text-lg">
            Find neighbours and volunteers by name, skill, interest or place, and reach out to work on something together.
          </p>
        </div>
      </header>

      <section className="container-page space-y-6">
        {/* Filter bar */}
        <form
          role="search"
          onSubmit={(e) => e.preventDefault()}
          className="card p-4 sm:p-5"
          aria-label="Filter members"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr_auto] gap-3 items-end">
            <div>
              <label htmlFor="member-name" className="field-label">Name</label>
              <div className="relative">
                <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                <input
                  id="member-name"
                  type="text"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="Search by name"
                  className="field !pl-10"
                />
              </div>
            </div>
            <div>
              <label htmlFor="member-skill" className="field-label">Skill</label>
              <input
                id="member-skill"
                type="text"
                value={searchSkill}
                onChange={(e) => setSearchSkill(e.target.value)}
                placeholder="e.g. Teaching"
                className="field"
              />
            </div>
            <div>
              <label htmlFor="member-interest" className="field-label">Interest</label>
              <input
                id="member-interest"
                type="text"
                value={searchInterest}
                onChange={(e) => setSearchInterest(e.target.value)}
                placeholder="e.g. Plantation"
                className="field"
              />
            </div>
            <div>
              <label htmlFor="member-location" className="field-label">Location</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                <input
                  id="member-location"
                  type="text"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  placeholder="e.g. Lalitpur"
                  className="field !pl-10"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleClearFilters}
              className="btn btn-ghost h-[46px]"
              disabled={!hasFilters}
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" /> Reset
            </button>
          </div>
        </form>

        <p className="text-sm text-muted" role="status" aria-live="polite">
          {loading ? 'Loading members…' : (
            <>Showing <strong className="text-ink">{filteredMembers.length}</strong> of {members.length} members</>
          )}
        </p>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-64 bg-paper-deep animate-pulse rounded-[var(--radius-card)]" />
            ))}
          </div>
        ) : filteredMembers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredMembers.map((member) => {
              const isStaff = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'].includes(member.role);
              return (
                <article key={member._id} className="card card-hover p-6 flex flex-col text-center">
                  <div className="relative mx-auto">
                    <Avatar name={member.name} src={member.profilePicture} size="xl" rounded="rounded-2xl" />
                    {isStaff && (
                      <span
                        className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-full bg-white border border-sand text-brand flex items-center justify-center shadow-[var(--shadow-soft)]"
                        title="Platform team"
                      >
                        <Shield className="w-4 h-4" aria-hidden="true" />
                        <span className="sr-only">Platform team</span>
                      </span>
                    )}
                  </div>

                  <h2 className="text-lg font-semibold text-ink mt-4 leading-snug flex items-center justify-center gap-1.5">
                    <span className="truncate">{member.name}</span>
                    {member.isVerified && (
                      <BadgeCheck className="w-[18px] h-[18px] text-pine shrink-0" aria-label="Verified" />
                    )}
                  </h2>

                  <div className="flex justify-center mt-2">
                    <LevelBadge level={member.memberLevel} />
                  </div>

                  {member.location && (
                    <p className="text-sm text-muted flex items-center justify-center gap-1 mt-2">
                      <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> <span className="truncate">{member.location}</span>
                    </p>
                  )}

                  {member.bio && <p className="text-sm text-ink-soft line-clamp-2 mt-3">{member.bio}</p>}

                  {member.skills && member.skills.length > 0 && (
                    <ul className="flex flex-wrap justify-center gap-1.5 mt-3" aria-label="Skills">
                      {member.skills.slice(0, 3).map((skill, idx) => (
                        <li key={idx} className="chip bg-paper-deep text-ink-soft font-medium">{skill}</li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-auto pt-5">
                    <Link to={`/profile/${member._id}`} className="btn btn-ghost btn-sm w-full min-h-10">
                      View profile <ArrowRight className="w-4 h-4" aria-hidden="true" />
                      <span className="sr-only">of {member.name}</span>
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="card p-10 text-center space-y-4 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-sky-tint text-sky-ink flex items-center justify-center mx-auto">
              <Users className="w-7 h-7" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-semibold text-ink">
              {members.length === 0 ? 'No members to show yet' : 'No one matches those filters'}
            </h2>
            <p className="text-muted">
              {members.length === 0 ? 'Join and be one of the first people here.' : 'Try a broader skill or a nearby place.'}
            </p>
            {members.length === 0 ? (
              <Link to="/register" className="btn btn-primary">Join Hateymalo</Link>
            ) : (
              <button type="button" onClick={handleClearFilters} className="btn btn-primary">
                Clear filters
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default Members;
