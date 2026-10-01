import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import { Users, MapPin, Search, Shield, Filter, RefreshCw, ArrowRight } from 'lucide-react';
import VerificationBadge from '../components/VerificationBadge';

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-teal-700 font-bold text-xs uppercase tracking-widest">
          <Users className="w-4 h-4" /> Community Directory
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Find Volunteers & Community Members</h1>
        <p className="text-sm text-slate-600 max-w-2xl">
          Search fellow citizens across Nepal by name, specialized skills, interests, or location to collaborate on civic initiatives.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-6 rounded-3xl space-y-4 border border-slate-200 shadow-md">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Name Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="Search by Name..."
              className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none"
            />
          </div>

          {/* Skill Search */}
          <div>
            <input
              type="text"
              value={searchSkill}
              onChange={(e) => setSearchSkill(e.target.value)}
              placeholder="Filter by Skill (e.g. Teaching)..."
              className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none"
            />
          </div>

          {/* Interest Search */}
          <div>
            <input
              type="text"
              value={searchInterest}
              onChange={(e) => setSearchInterest(e.target.value)}
              placeholder="Filter by Interest (e.g. Plantation)..."
              className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none"
            />
          </div>

          {/* Location Search */}
          <div className="flex gap-2">
            <div className="relative flex-grow">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                placeholder="Location..."
                className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none"
              />
            </div>
            <button
              onClick={handleClearFilters}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200"
              title="Reset Search"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>

      <div className="text-sm text-slate-600">
        Showing <strong className="text-slate-900">{filteredMembers.length}</strong> community members
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-64 rounded-2xl animate-pulse bg-slate-200" />
          ))}
        </div>
      ) : filteredMembers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredMembers.map((member) => (
            <div
              key={member._id}
              className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-teal-500/50 transition-all duration-300 flex flex-col justify-between space-y-4 group shadow-md"
            >
              <div className="space-y-3 text-center">
                
                {/* Avatar */}
                <div className="relative inline-block mx-auto">
                  <img
                    src={member.profilePicture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'}
                    alt={member.name}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-teal-500/40 shadow-md group-hover:scale-105 transition-transform"
                  />
                  {['SUPER_ADMIN', 'ADMIN', 'MODERATOR'].includes(member.role) && (
                    <span className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 p-1 rounded-lg shadow" title="Platform Admin">
                      <Shield className="w-3.5 h-3.5 fill-slate-950" />
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                    {member.name}
                  </h3>
                  <div className="flex justify-center mt-1">
                    <VerificationBadge level={member.memberLevel} isVerified={member.isVerified} />
                  </div>
                  <p className="text-xs text-slate-500 flex items-center justify-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-teal-600" /> {member.location}
                  </p>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 italic px-2">
                  "{member.bio || 'Community volunteer'}"
                </p>

                {/* Skills Chips */}
                {member.skills && member.skills.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1 pt-1">
                    {member.skills.slice(0, 3).map((skill, idx) => (
                      <span key={idx} className="text-[10px] bg-teal-50 text-teal-800 px-2 py-0.5 rounded-full border border-teal-200 font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

              </div>

              <Link
                to={`/profile/${member._id}`}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-100 hover:bg-teal-600 hover:text-white text-slate-800 border border-slate-200 transition-all flex items-center justify-center gap-1.5"
              >
                View Profile <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3 max-w-md mx-auto">
          <p className="text-lg font-bold text-slate-900">No members match your criteria</p>
          <button
            onClick={handleClearFilters}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 text-white"
          >
            Clear Filters
          </button>
        </div>
      )}

    </div>
  );
};

export default Members;
