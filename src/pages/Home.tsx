import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Building2, MapPin, CheckCircle, AlertTriangle, ChevronRight } from 'lucide-react';
import { api, Institution } from '../api';
import { LoadingSpinner, ErrorPanel } from '../components/ui';

export default function HomePage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.getInstitutions()
      .then(setInstitutions)
      .catch(() => setError('Failed to load institutions.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = institutions.filter((i) =>
    i.name.toLowerCase().includes(query.toLowerCase()) ||
    i.aictePermanentId.includes(query)
  );

  return (
    <div className="max-w-3xl mx-auto">
      {/* Page title */}
      <div className="mb-5">
        <h1 className="text-base font-semibold text-gray-900">Institution Search</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Search and select an institution to view its complaint case profile across all AICTE bureaus and cells.
        </p>
      </div>

      {/* Search bar */}
      <div className="relative mb-5">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by institution name or AICTE Permanent ID..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
        />
      </div>

      {/* Results */}
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorPanel message={error} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-500">
          No institutions found.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((inst) => (
            <InstitutionCard
              key={inst.id}
              institution={inst}
              onClick={() => navigate(`/institutions/${inst.id}`)}
            />
          ))}
        </div>
      )}

      {/* Info note */}
      <div className="mt-8 p-3 bg-teal-50 border border-teal-200 rounded text-xs text-teal-700">
        <strong>CaseLens</strong> identifies an institution and retrieves related cases across all AICTE bureaus and cells,
        detects potential cross-bureau conflicts, and recommends coordination before independent disposal.
      </div>
    </div>
  );
}

function InstitutionCard({
  institution,
  onClick,
}: {
  institution: Institution;
  onClick: () => void;
}) {
  const isHigh = institution.attentionLevel === 'High';
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-gray-200 rounded-md px-4 py-3 hover:border-navy-400 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-navy-50 border border-navy-100 rounded flex items-center justify-center shrink-0 mt-0.5">
            <Building2 size={14} className="text-navy-600" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900 group-hover:text-navy-700">
              {institution.name}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              AICTE Permanent ID: {institution.aictePermanentId}
            </div>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="flex items-center gap-1 text-[11px] text-gray-500">
                <MapPin size={10} />
                {institution.district}, {institution.state}
              </span>
              <span className="text-[11px] text-gray-500">{institution.type}</span>
              <span className="flex items-center gap-1 text-[11px] text-green-600">
                <CheckCircle size={10} />
                {institution.approvalStatus}
              </span>
              {isHigh && (
                <span className="flex items-center gap-1 text-[11px] text-amber-600">
                  <AlertTriangle size={10} />
                  Attention: {institution.attentionLevel}
                </span>
              )}
            </div>
          </div>
        </div>
        <ChevronRight size={14} className="text-gray-400 group-hover:text-navy-500 shrink-0 mt-1" />
      </div>
    </button>
  );
}
