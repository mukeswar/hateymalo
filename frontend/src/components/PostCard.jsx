import React from 'react';
import { Link } from 'react-router-dom';
import VerificationBadge from './VerificationBadge';
import { MapPin, Users, Heart, ArrowRight } from 'lucide-react';

const PostCard = ({ post }) => {
  if (!post) return null;

  const {
    _id,
    title,
    description,
    category,
    location,
    images = [],
    creator,
    joinedUsers = [],
    interestedUsers = [],
  } = post;

  const coverImage =
    images.length > 0
      ? images[0]
      : 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=800&q=80';

  return (
    <div className="group bg-white rounded-3xl overflow-hidden flex flex-col justify-between shadow-md border border-slate-200 hover:border-[#C8382C]/40 transition-all duration-300">
      
      {/* Cover Image */}
      <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
        <img
          src={coverImage}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3">
          <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full terracotta-badge bg-white/90 backdrop-blur-xs">
            {category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4 flex-grow flex flex-col justify-between">
        
        <div className="space-y-2">
          {creator && (
            <div className="flex items-center gap-2">
              <img
                src={creator.profilePicture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                alt={creator.name}
                className="w-6 h-6 rounded-full object-cover border border-slate-200"
              />
              <span className="text-xs font-semibold text-slate-700 truncate flex items-center gap-1">
                {creator.name} <VerificationBadge level={creator.memberLevel} isVerified={creator.isVerified} showLabel={false} />
              </span>
            </div>
          )}

          <h3 className="text-base font-bold text-slate-900 group-hover:text-[#C8382C] transition-colors line-clamp-2 leading-snug">
            {title}
          </h3>

          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {description}
          </p>
        </div>

        <div className="space-y-3 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
            <span className="flex items-center gap-1 text-slate-700 truncate">
              <MapPin className="w-3.5 h-3.5 text-[#C8382C]" /> {location}
            </span>
            <div className="flex items-center gap-3 font-bold text-[11px]">
              <span className="text-rose-600">❤️ {interestedUsers.length}</span>
              <span className="text-teal-700">🤝 {joinedUsers.length}</span>
            </div>
          </div>

          <Link
            to={`/post/${_id}`}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-100 hover:bg-[#C8382C] text-slate-800 hover:text-white border border-slate-200 transition-all flex items-center justify-center gap-1.5"
          >
            View Details <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>

    </div>
  );
};

export default PostCard;
