import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import Avatar from '../components/ui/Avatar';
import { Reveal } from '../components/ui/motion';
import { Building2, MapPin, Mail, ArrowRight, BadgeCheck, Plus } from 'lucide-react';

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
    <div className="pb-20">
      {/* Header */}
      <header className="container-page pt-10 sm:pt-14 pb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-rise">
          <div className="max-w-2xl space-y-3">
            <span className="eyebrow deva">संस्थाहरू</span>
            <h1 className="text-4xl sm:text-5xl font-bold text-ink leading-[1.08]">Organisations working hand in hand</h1>
            <p className="text-muted text-lg">
              NGOs, schools, clubs and community groups that organise volunteer drives and relief work through Hateymalo.
            </p>
          </div>
          <Link to="/register" className="btn btn-ghost shrink-0">
            <Plus className="w-4 h-4" aria-hidden="true" /> Register your organisation
          </Link>
        </div>
      </header>

      <section className="container-page">
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-64 bg-paper-deep animate-pulse rounded-[var(--radius-card)]" />
            ))}
          </div>
        ) : orgs.length > 0 ? (
          <>
            <p className="text-sm text-muted mb-5">
              {orgs.length} {orgs.length === 1 ? 'organisation' : 'organisations'}
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {orgs.map((org, i) => {
                const displayName = org.orgDetails?.orgName || org.name;
                const description = org.orgDetails?.description || org.bio;
                return (
                  <Reveal key={org._id} delay={(i % 3) * 70} className="h-full">
                    <article className="card card-hover h-full p-6 flex flex-col">
                      <div className="flex items-start gap-4">
                        <Avatar name={displayName} src={org.profilePicture} size="lg" rounded="rounded-2xl" />
                        <div className="min-w-0 flex-1">
                          <h2 className="text-xl font-semibold text-ink leading-snug break-words">{displayName}</h2>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className="chip bg-sky-tint text-sky-ink">
                              <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
                              {org.orgDetails?.orgType || 'Organisation'}
                            </span>
                            {org.isVerified && (
                              <span className="chip bg-pine-tint text-pine">
                                <BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" /> Verified
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {description && (
                        <p className="text-sm text-ink-soft leading-relaxed line-clamp-3 mt-4">{description}</p>
                      )}

                      <div className="mt-auto pt-5">
                        {(org.location || org.email) && (
                          <div className="border-t border-sand pt-4 mb-4 space-y-1.5 text-sm text-muted">
                            {org.location && (
                              <p className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-brand shrink-0" aria-hidden="true" />
                                <span className="truncate">{org.location}</span>
                              </p>
                            )}
                            {org.email && (
                              <p className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-sky-ink shrink-0" aria-hidden="true" />
                                <span className="truncate">{org.email}</span>
                              </p>
                            )}
                          </div>
                        )}
                        <Link to={`/profile/${org._id}`} className="group inline-flex items-center gap-1.5 font-semibold text-ink hover:text-brand transition-colors min-h-10">
                          View profile
                          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                          <span className="sr-only">of {displayName}</span>
                        </Link>
                      </div>
                    </article>
                  </Reveal>
                );
              })}
            </div>
          </>
        ) : (
          <div className="card p-10 sm:p-14 text-center max-w-xl mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-pine-tint text-pine flex items-center justify-center mx-auto">
              <Building2 className="w-7 h-7" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-semibold text-ink">No organisations have joined yet</h2>
            <p className="text-muted">
              If you run an NGO, school, club or community group, you can be among the first to organise volunteers here.
            </p>
            <Link to="/register" className="btn btn-primary">
              Register your organisation <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>
    </div>
  );
};

export default Organizations;
