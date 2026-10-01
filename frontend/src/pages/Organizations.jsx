import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import VerificationBadge from '../components/VerificationBadge';
import { Building2, MapPin, Globe, Mail, Phone, ArrowRight, ShieldCheck } from 'lucide-react';

const Organizations = () => {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrgs = async () => {
    setLoading(true);
    try {
      const res = await API.get('/search?entityType=ORGANIZATIONS');
      if (res.data.success) {
        setOrgs(res.data.data.organizations);
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-widest">
          <Building2 className="w-4 h-4" /> Civic Partners & Institutional Members
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Verified Organization Directory</h1>
        <p className="text-sm text-slate-600 max-w-2xl">
          Discover NGOs, schools, youth clubs, and community groups organizing volunteer drives and disaster relief efforts across Nepal.
        </p>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((n) => (
            <div key={n} className="h-64 rounded-3xl animate-pulse bg-slate-200" />
          ))}
        </div>
      ) : orgs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {orgs.map((org) => (
            <div
              key={org._id}
              className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-5 shadow-md hover:border-emerald-500/50 transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold border border-emerald-200 shrink-0">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        {org.orgDetails?.orgName || org.name}
                        <VerificationBadge level="ORGANIZATION" isVerified={true} showLabel={false} />
                      </h3>
                      <p className="text-xs text-emerald-700 font-semibold">{org.orgDetails?.orgType || 'Registered Organization'}</p>
                    </div>
                  </div>

                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Verified Org
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                  {org.orgDetails?.description || org.bio || 'Civic community partner organizing youth volunteer drives in Nepal.'}
                </p>

                <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <p className="flex items-center gap-2 text-teal-700 font-medium"><MapPin className="w-3.5 h-3.5 text-[#C8382C]" /> {org.location}</p>
                  {org.email && <p className="flex items-center gap-2 text-slate-600"><Mail className="w-3.5 h-3.5 text-sky-600" /> {org.email}</p>}
                </div>
              </div>

              <Link
                to={`/profile/${org._id}`}
                className="w-full mt-2 py-3 px-4 rounded-xl text-xs font-bold bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-800 border border-slate-200 transition-all flex items-center justify-center gap-1.5"
              >
                View Organization Profile <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-500 text-sm">
          No registered organizations found.
        </div>
      )}

    </div>
  );
};

export default Organizations;
