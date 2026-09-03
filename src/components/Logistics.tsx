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
  extractFlightOptions,
  extractHotelOptions,
  FlightOption,
  HotelOption,
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

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return hours
    ? `${hours}h ${mins}m`
    : `${mins}m`;
}

function FlightCard({
  flight,
  onStage,
}: {
  flight: FlightOption;
  onStage: (flight: FlightOption) => void;
}) {
  const first = flight.segments[0];
  const last =
    flight.segments[flight.segments.length - 1];

  return (
    <article className="rounded-xl border border-border-color bg-bg-card p-4 transition hover:border-gold/50">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {flight.airline_logo ? (
            <img
              src={flight.airline_logo}
              alt=""
              className="h-8 w-8 object-contain"
            />
          ) : (
            <Plane className="h-5 w-5 shrink-0 text-gold" />
          )}

          <div>
            <p className="font-bold text-text-primary">
              {flight.airline || 'Flight option'}
            </p>

            <p className="text-xs text-text-muted">
              {flight.travel_class || 'Economy'}
              {' · '}
              {flight.segments
                .map((segment) => segment.flight_number)
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <p className="text-lg font-bold text-text-primary">
            AED {flight.price.toLocaleString()}
          </p>

          <p className="text-xs text-text-muted">
            {flight.type || 'One way'}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
        <div>
          <p className="font-bold">
            {first?.departure_airport?.id || '—'}
          </p>

          <p className="text-xs text-text-secondary">
            {first?.departure_airport?.time ||
              'Time unavailable'}
          </p>
        </div>

        <div className="text-center text-xs text-text-muted">
          <p>{formatDuration(flight.total_duration)}</p>
          <p>
            {flight.layovers.length
              ? `${flight.layovers.length} stop${
                  flight.layovers.length > 1
                    ? 's'
                    : ''
                }`
              : 'Nonstop'}
          </p>
        </div>

        <div className="text-right">
          <p className="font-bold">
            {last?.arrival_airport?.id || '—'}
          </p>

          <p className="text-xs text-text-secondary">
            {last?.arrival_airport?.time ||
              'Time unavailable'}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border-color pt-3">
        <p className="text-xs text-text-muted">
          {flight.layovers
            .map(
              (stop) =>
                `${stop.name || stop.id || 'Layover'} · ${formatDuration(
                  stop.duration,
                )}`,
            )
            .join(' · ') || 'Direct route'}
        </p>

        <button
          type="button"
          onClick={() => onStage(flight)}
          className="rounded-lg bg-gold px-3 py-2 text-xs font-bold text-white"
        >
          Stage this flight
        </button>
      </div>
    </article>
  );
}


export default function Logistics() {
  const [overview, setOverview] =
    useState<LogisticsOverview | null>(null);

  const [kind, setKind] = useState<Kind>('flights');
  const [query, setQuery] = useState('');
  const [date, setDate] = useState('');
  const [rawResults, setRawResults] =
    useState<unknown>(null);
  const [flightResults, setFlightResults] =
    useState<FlightOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [bookingLink, setBookingLink] =
  useState<string | null>(null);
  const [checkOutDate, setCheckOutDate] = useState('');
  const [hotelResults, setHotelResults] =
    useState<HotelOption[]>([]);

  useEffect(() => {
    getLogisticsOverview()
      .then(setOverview)
      .catch(() => {
        setMessage('Logistics service is unavailable.');
      });
  }, []);

  async function handleSearch(event: FormEvent) {
    event.preventDefault();

    setLoading(true);
    setMessage('');
    setRawResults(null);
    setFlightResults([]);

    try {
      const parameters =
        kind === 'flights'
          ? {
              query,
              outbound_date: date || undefined,
              currency: 'AED',
            }
          : kind === 'hotels'
            ? {
                q: query,
                check_in_date: date || undefined,
                check_out_date: checkOutDate || undefined,
                gl: 'ae',
                hl: 'en',
              }
            : {
                q: query,
                date: date || undefined,
                gl: 'ae',
                hl: 'en',
              };

      const response = await searchLogistics(
        kind,
        parameters,
      );

      setRawResults(response.results);

      if (kind === 'flights') {
        const options = extractFlightOptions(
          response.results,
        );

        setFlightResults(options);

        if (!options.length) {
          setMessage(
            'No flight options were returned for that search.',
          );
        }
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Search failed.',
      );
    } finally {
      setLoading(false);
    }
  }


  async function stage(
    action: 'book' | 'modify',
    selectedFlight?: FlightOption,
  ) {
    // Open a temporary tab immediately from the user's click.
    // This avoids popup blockers during the async API request.
    const bookingWindow = selectedFlight?.booking_url
      ? window.open('about:blank', '_blank')
      : null;

    try {
      const category =
        kind === 'flights'
          ? 'flight'
          : kind === 'hotels'
            ? 'hotel'
            : kind === 'restaurants'
              ? 'restaurant'
              : 'event';

      const details = selectedFlight
        ? {
            query,
            date,
            flight: selectedFlight,
          }
        : {
            query,
            date,
            search_results: rawResults,
          };

      const item = await stageLogisticsAction({
        action,
        category,
        details,
        estimated_total: selectedFlight?.price,
      });

      if (selectedFlight?.booking_url) {
        setBookingLink(selectedFlight.booking_url);

        if (bookingWindow) {
          // Replace the blank page with the actual external booking page.
          bookingWindow.location.href =
            selectedFlight.booking_url;
        } else {
          setMessage(
            `Flight staged for approval: ${item.id}. Your browser blocked the new tab; use Continue to booking below.`,
          );
        }
      }

      if (selectedFlight?.booking_url && bookingWindow) {
        setMessage(
          `Flight staged for approval: ${item.id}. Booking opened in a new tab.`,
        );
      } else if (!selectedFlight?.booking_url) {
        setMessage(
          `Flight staged for approval: ${item.id}, but no external booking link was returned.`,
        );
      }

      setOverview(await getLogisticsOverview());
    } catch (error) {
      // Do not leave an empty tab open if staging fails.
      bookingWindow?.close();

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
              setRawResults(null);
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
              placeholder={
                kind === 'flights'
                  ? 'e.g. Dubai to London'
                  : kind === 'hotels'
                    ? 'e.g. hotels near London Heathrow'
                    : kind === 'restaurants'
                      ? 'e.g. Japanese restaurant in Dubai'
                      : 'e.g. events in London'
              }
            />
          </label>

          {kind === 'hotels' ? (
            <>
              <label className="text-xs font-semibold text-text-secondary">
                Check-in
                <input
                  required
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-border-color bg-bg-card px-3 py-2.5 text-sm outline-none focus:border-gold"
                />
              </label>

              <label className="text-xs font-semibold text-text-secondary">
                Check-out
                <input
                  required
                  type="date"
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-border-color bg-bg-card px-3 py-2.5 text-sm outline-none focus:border-gold"
                />
              </label>
            </>
          ) : (
            <label className="text-xs font-semibold text-text-secondary">
              Date
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border-color bg-bg-card px-3 py-2.5 text-sm outline-none focus:border-gold"
              />
            </label>
          )}


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
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

          <span>{message}</span>

          {bookingLink && (
            <a
              href={bookingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-gold px-3 py-2 text-xs font-bold text-white"
            >
              Continue to booking
            </a>
          )}
        </div>
      )}


      {kind === 'flights' &&
        flightResults.length > 0 && (
          <div className="space-y-3 rounded-2xl border border-border-color bg-bg-secondary p-5">
            <div>
              <h3 className="font-bold">
                Flight options
              </h3>

              <p className="mt-1 text-xs text-text-muted">
                Live discovery · {flightResults.length}{' '}
                options found · nothing has been booked
              </p>
            </div>

            {flightResults.map((flight, index) => (
              <FlightCard
                flight={flight}
                onStage={(selectedFlight) =>
                  void stage('book', selectedFlight)
                }
              />
            ))}
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
