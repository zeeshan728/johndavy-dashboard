'use client';

import {
  FormEvent,
  useEffect,
  useState,
} from 'react';

import {
  AlertTriangle,
  CalendarDays,
  Car,
  ChevronRight,
  Clock3,
  Hotel,
  Plane,
  Utensils,
} from 'lucide-react';

import {
  getLogisticsOverview,
  LogisticsOverview,
  searchLogistics,
  stageLogisticsAction,
} from '@/lib/logistics';

const kinds = [
  {
    id: 'flights',
    label: 'Flights',
    icon: Plane,
  },
  {
    id: 'hotels',
    label: 'Hotels',
    icon: Hotel,
  },
  {
    id: 'restaurants',
    label: 'Restaurants',
    icon: Utensils,
  },
  {
    id: 'events',
    label: 'Events',
    icon: CalendarDays,
  },
] as const;

type Kind = (typeof kinds)[number]['id'];

export default function Logistics() {
  const [overview, setOverview] =
    useState<LogisticsOverview | null>(null);

  const [kind, setKind] = useState<Kind>('flights');
  const [query, setQuery] = useState('Dubai to London');
  const [date, setDate] = useState('');
  const [results, setResults] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    getLogisticsOverview()
      .then(setOverview)
      .catch(() => {
        setMessage('Logistics service is unavailable.');
      });
  }, []);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage('');

    try {
      const parameters =
        kind === 'flights'
          ? {
              query,
              outbound_date: date || undefined,
              currency: 'AED',
            }
          : {
              q: query,
              date: date || undefined,
              gl: 'ae',
              hl: 'en',
            };

      const response = await searchLogistics(kind, parameters);

      setResults(JSON.stringify(response.results, null, 2));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Search failed.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function stage(action: 'book' | 'modify') {
    try {
      const category =
        kind === 'flights'
          ? 'flight'
          : kind === 'hotels'
            ? 'hotel'
            : kind === 'restaurants'
              ? 'restaurant'
              : 'event';

      const item = await stageLogisticsAction({
        action,
        category,
        details: {
          query,
          date,
          search_results: results,
        },
      });

      setMessage(`Action staged for approval: ${item.id}`);

      setOverview(await getLogisticsOverview());
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not stage action.',
      );
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-gold font-bold">
            Personal operations
          </p>

          <h2 className="text-2xl font-bold">
            Logistics
          </h2>

          <p className="text-sm text-text-secondary mt-1">
            Search, plan, and keep every moving part of a trip in one place.
          </p>
        </div>

        <div className="text-xs text-text-muted flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Gmail + Calendar connected
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kinds.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setKind(id);
              setResults(null);
              setMessage('');
            }}
            className={`text-left rounded-2xl border p-4 transition ${
              kind === id
                ? 'border-gold/50 bg-gold/10'
                : 'border-border-color bg-bg-secondary hover:border-gold/30'
            }`}
          >
            <Icon className="w-5 h-5 text-gold mb-3" />

            <p className="font-semibold text-sm">
              {label}
            </p>

            <p className="text-xs text-text-muted mt-1">
              {id === 'flights'
                ? 'Search routes'
                : id === 'hotels'
                  ? 'Find stays'
                  : id === 'restaurants'
                    ? 'Find tables'
                    : 'Discover plans'}
            </p>
          </button>
        ))}
      </div>

      <form
        onSubmit={handleSearch}
        className="bg-bg-secondary border border-border-color rounded-2xl p-5 shadow-sm"
      >
        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-3 items-end">
          <label className="text-xs font-semibold text-text-secondary">
            {kind === 'flights'
              ? 'Route or destination'
              : 'What are you looking for?'}

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border-color bg-bg-card px-3 py-2.5 text-sm outline-none focus:border-gold"
              placeholder="e.g. Dubai to London"
            />
          </label>

          <label className="text-xs font-semibold text-text-secondary">
            Date

            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border-color bg-bg-card px-3 py-2.5 text-sm outline-none focus:border-gold"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-gold px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
      </form>

      {message && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          {message}
        </div>
      )}

      {results && (
        <div className="bg-bg-secondary border border-border-color rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-bold">
                Search results
              </h3>

              <p className="text-xs text-text-muted mt-1">
                Live discovery. Nothing has been booked.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => stage('book')}
                className="rounded-lg bg-gold px-3 py-2 text-xs font-bold text-white"
              >
                Stage booking
              </button>

              <button
                type="button"
                onClick={() => stage('modify')}
                className="rounded-lg border border-border-color px-3 py-2 text-xs font-semibold"
              >
                Stage change
              </button>
            </div>
          </div>

          <pre className="max-h-[420px] overflow-auto rounded-xl bg-bg-card p-4 text-xs leading-relaxed text-text-secondary whitespace-pre-wrap">
            {results}
          </pre>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 bg-bg-secondary border border-border-color rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock3 className="w-4 h-4 text-gold" />

            <h3 className="font-bold text-sm">
              Operations status
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              'Flight search',
              'Hotel search',
              'Restaurant discovery',
              'Calendar + email',
            ].map((item, index) => (
              <div
                key={item}
                className="rounded-xl bg-bg-card p-3"
              >
                <p className="text-xs text-text-secondary">
                  {item}
                </p>

                <p className="text-sm font-bold text-emerald-600 mt-2">
                  {overview?.capabilities
                    ? index === 3
                      ? 'Connected'
                      : 'Ready'
                    : 'Checking…'}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-bg-secondary border border-border-color rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Car className="w-4 h-4 text-gold" />

            <h3 className="font-bold text-sm">
              Next phase
            </h3>
          </div>

          <p className="text-xs text-text-secondary leading-relaxed">
            Transactional booking adapters will plug into this approval queue.
            No spend occurs in Phase 1.
          </p>

          <div className="mt-3 text-xs font-semibold text-gold flex items-center gap-1">
            {overview?.total_pending || 0} pending approvals
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>
      </div>
    </section>
  );
}
