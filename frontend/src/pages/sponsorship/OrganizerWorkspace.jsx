import React, { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, MapPin, ExternalLink, ShieldAlert, SearchX, Layers, Users } from 'lucide-react';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Avatar from '../../components/ui/Avatar';
import OpportunityForm from '../admin/sponsorship/OpportunityForm';
import DealsTab from '../admin/sponsorship/DealsTab';
import BrandKitEditor from '../admin/sponsorship/BrandKitEditor';
import { SP, label, npr, dateRange, errMsg, Chip, SubTabs, Loading, Empty } from '../admin/sponsorship/shared';

const Notice = ({ icon: Icon, title, children, action }) => (
  <div className="container-page py-16">
    <div className="card mx-auto max-w-lg p-8 text-center">
      <Icon className="mx-auto mb-3 h-10 w-10 text-brand" aria-hidden="true" />
      <h1 className="text-2xl font-bold text-ink">{title}</h1>
      <p className="mt-2 text-muted">{children}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  </div>
);

const Packages = ({ tiers = [] }) =>
  tiers.length === 0 ? (
    <Empty icon={Layers}>No packages are offered yet. The sponsorship team sets them up.</Empty>
  ) : (
    <ul className="grid gap-3 sm:grid-cols-2">
      {tiers.map((t) => (
        <li key={t._id} className="card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold text-ink">{t.name}</p>
            <span className="chip bg-paper-deep text-ink-soft">{label(t.level)}</span>
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            {t.price > 0 ? npr(t.price) : t.priceNote || 'By quotation'} ·{' '}
            {t.slotsLeft === null ? 'unlimited slots' : `${t.slotsLeft} of ${t.slots} slot${t.slots === 1 ? '' : 's'} left`}
          </p>
          {t.benefits?.length > 0 && (
            <ul className="mt-2 list-inside list-disc text-sm text-muted">
              {t.benefits.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );

/**
 * /organize/:id — one campaign's workspace for its organisers (and staff):
 * details, sponsor deals, packages and the brand kit. Organisers never
 * receive amounts from the API, so none are rendered here.
 */
const OrganizerWorkspace = () => {
  const { id } = useParams();
  const location = useLocation();
  const { user, loading: authLoading, isAdmin } = useAuth();
  const { showToast } = useToast();
  const [opp, setOpp] = useState(null);
  const [error, setError] = useState(null); // { status, message }
  const [tab, setTab] = useState('deals');

  const load = useCallback(async () => {
    try {
      const res = await API.get(`${SP}/opportunities/${id}`);
      setOpp(res.data.data);
      setError(null);
    } catch (e) {
      setError({ status: e.response?.status || 0, message: errMsg(e, 'Could not load this campaign') });
    }
  }, [id]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  useEffect(() => {
    if (opp?.title) document.title = `${opp.title} · Organiser workspace · Hateymalo`;
  }, [opp?.title]);

  if (authLoading) return <Loading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  if (error) {
    if (error.status === 404) {
      return (
        <Notice icon={SearchX} title="Campaign not found" action={<Link to="/sponsor" className="btn btn-primary">See sponsorship campaigns</Link>}>
          This campaign does not exist, or it is a draft you cannot see.
        </Notice>
      );
    }
    if (error.status === 403) {
      return (
        <Notice icon={ShieldAlert} title="No access" action={<Link to="/" className="btn btn-primary">Go home</Link>}>
          You are not an organiser of this campaign. Ask the sponsorship team to add you.
        </Notice>
      );
    }
    return (
      <Notice icon={ShieldAlert} title="Something went wrong" action={<button type="button" onClick={load} className="btn btn-primary">Try again</button>}>
        {error.message}
      </Notice>
    );
  }
  if (!opp) return <Loading>Loading campaign…</Loading>;

  const v = opp.viewer || {};
  if (!v.isOrganizer && !v.canManage && !v.canBrand) {
    return (
      <Notice
        icon={ShieldAlert}
        title="Organisers only"
        action={<Link to={`/sponsor/opportunities/${opp._id}`} className="btn btn-primary">View the public campaign page</Link>}
      >
        This workspace is for the organisers of “{opp.title}”. Ask the sponsorship team if you should be one.
      </Notice>
    );
  }

  const canEditDetails = v.isOrganizer || v.canManage;
  const saveDetails = async (body) => {
    try {
      const res = await API.put(`${SP}/opportunities/${opp._id}`, body);
      showToast(res.data.message || 'Campaign updated', 'success');
      load();
    } catch (e) {
      showToast(errMsg(e, 'Could not save'), 'error');
    }
  };

  const tabs = [
    { id: 'deals', label: 'Sponsors' },
    { id: 'brand', label: 'Brand kit' },
    { id: 'packages', label: 'Packages' },
    { id: 'details', label: canEditDetails ? 'Edit details' : 'Details' },
  ];

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-sand bg-white">
        <div className="container-page py-6 sm:py-8">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            {isAdmin && (
              <Link to="/admin?tab=sponsorship" className="inline-flex items-center gap-1 font-semibold text-muted hover:text-ink">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Command center
              </Link>
            )}
            <span className="eyebrow">Organiser workspace</span>
          </div>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start">
            {opp.coverImage && <img src={opp.coverImage} alt="" className="h-24 w-full rounded-2xl object-cover sm:h-24 sm:w-40" />}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-bold text-ink">{opp.title}</h1>
                <Chip status={opp.status} />
              </div>
              <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                <span>{label(opp.campaignType)}</span>
                {(opp.startDate || opp.endDate) && <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" aria-hidden="true" />{dateRange(opp.startDate, opp.endDate)}</span>}
                {opp.location && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" aria-hidden="true" />{opp.location}</span>}
              </p>
              {opp.organizers?.length > 0 && (
                <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
                  <Users className="h-4 w-4 text-muted" aria-hidden="true" />
                  {opp.organizers.map((o) => (
                    <span key={o._id} className="inline-flex items-center gap-1.5"><Avatar name={o.name} src={o.profilePicture} size="xs" />{o.name}</span>
                  ))}
                </p>
              )}
            </div>
            {['OPEN', 'CLOSED', 'COMPLETED'].includes(opp.status) && (
              <Link to={`/sponsor/opportunities/${opp._id}`} className="btn btn-sm btn-ghost min-h-10 self-start">
                <ExternalLink className="h-4 w-4" aria-hidden="true" /> Public page
              </Link>
            )}
          </div>
          {v.isOrganizer && !v.canManage && (
            <p className="mt-4 rounded-2xl bg-sky-tint px-4 py-3 text-sm text-sky-ink">
              As an organiser you can review proposals, message sponsors, track deliverables, write impact reports and prepare the brand kit. Agreeing, completing or cancelling deals, and the money side, stay with the sponsorship team.
            </p>
          )}
        </div>
      </header>

      <main className="container-page space-y-5 py-6 sm:py-8">
        <SubTabs tabs={tabs} value={tab} onChange={setTab} ariaLabel="Workspace sections" />
        <div role="tabpanel">
          {tab === 'deals' && <DealsTab opportunityId={opp._id} />}
          {tab === 'brand' && (
            <section className="card p-4 sm:p-6">
              <h2 className="mb-4 text-xl font-bold text-ink">Brand kit</h2>
              <BrandKitEditor opportunityId={opp._id} opportunity={opp} canEdit={v.isOrganizer || v.canBrand || v.canManage} />
            </section>
          )}
          {tab === 'packages' && <Packages tiers={opp.tiers} />}
          {tab === 'details' && (
            <section className="card p-4 sm:p-6">
              {canEditDetails ? (
                <OpportunityForm key={opp.updatedAt} opportunity={opp} isManager={!!v.canManage} onSubmit={saveDetails} submitLabel="Save details" />
              ) : (
                <div className="space-y-3 text-sm text-ink-soft">
                  {opp.summary && <p className="text-base font-semibold text-ink">{opp.summary}</p>}
                  {opp.description && <p className="whitespace-pre-line">{opp.description}</p>}
                  <p className="text-muted">Only the sponsorship team and organisers can edit these details.</p>
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
};

export default OrganizerWorkspace;
