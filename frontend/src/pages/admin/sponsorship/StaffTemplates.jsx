import React from 'react';
import { Wand2 } from 'lucide-react';

/**
 * One-click job templates (Campaign Manager, Media Team, Finance Team) from
 * GET /super-admin/access-catalog → staffTemplates. Applying one replaces the
 * ticks; the access is still saved through the normal permission endpoint.
 */
const StaffTemplates = ({ catalog, value = [], onApply }) => {
  const templates = Object.entries(catalog?.staffTemplates || {});
  if (!templates.length) return null;
  const same = (perms) => perms.length === value.length && perms.every((p) => value.includes(p));
  return (
    <div className="rounded-2xl border border-sand bg-paper p-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Wand2 className="h-4 w-4 text-brand" aria-hidden="true" /> Job templates
      </p>
      <p className="mt-0.5 text-xs text-muted">Ticks exactly the permissions for that job. Adjust below, then save.</p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {templates.map(([key, t]) => {
          const active = same(t.permissions || []);
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => onApply(t.permissions || [])}
              title={(t.permissions || []).join(', ')}
              className={`btn btn-sm min-h-10 ${active ? 'bg-ink text-white' : 'btn-ghost'}`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StaffTemplates;
