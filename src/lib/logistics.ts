export type LogisticsKind =
  | 'flights'
  | 'hotels'
  | 'restaurants'
  | 'events'
  | 'places';

export interface FlightSegment {
  airline?: string;
  flight_number?: string;
  departure_airport: {
    id?: string;
    name?: string;
    time?: string;
  };
  arrival_airport: {
    id?: string;
    name?: string;
    time?: string;
  };
  duration: number;
  travel_class?: string;
}

export interface HotelOption {
  name: string;
  image?: string;
  rating?: number;
  hotel_class?: string | number;
  price?: string;
  nightly_price?: string;
  link?: string;
  amenities: string[];
}


export interface FlightOption {
  airline?: string;
  airline_logo?: string;
  booking_token: string;
  booking_url?: string;
  price: number;
  total_duration: number;
  type?: string;
  travel_class?: string;
  flights?: FlightSegment[];
  segments: FlightSegment[];
  layovers: {
    id?: string;
    name?: string;
    duration: number;
  }[];
}

/**
 * Converts the nested Composio / Google Flights response
 * into a simpler structure for the UI.
 */
export function extractFlightOptions(
  payload: unknown,
): FlightOption[] {
  const root = payload as {
    results?: unknown;
  };

  const batch = Array.isArray(root?.results)
    ? root.results
    : [];

  const response = batch[0] as {
    response?: {
      data?: {
        results?: unknown;
      };
    };
  } | undefined;

  const data = response?.response?.data?.results as {
    best_flights?: unknown[];
    other_flights?: unknown[];
    search_metadata?: {
      google_flights_url?: string;
    };
  } | undefined;


  const options = [
    ...(data?.best_flights || []),
    ...(data?.other_flights || []),
  ];

  return options
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === 'object',
    )
    .map((item, index) => {
      const segments = Array.isArray(item.flights)
        ? item.flights.filter(
            (segment): segment is FlightSegment =>
              Boolean(segment) &&
              typeof segment === 'object',
          )
        : [];

      const first = segments[0];

      return {
        booking_url:
          typeof data?.search_metadata?.google_flights_url === 'string'
            ? data.search_metadata.google_flights_url
            : undefined,

        booking_token:
          typeof item.booking_token === 'string'
            ? item.booking_token
            : `flight-${index}`,

        airline:
          typeof first?.airline === 'string'
            ? first.airline
            : undefined,

        airline_logo:
          typeof item.airline_logo === 'string'
            ? item.airline_logo
            : undefined,

        price:
          typeof item.price === 'number'
            ? item.price
            : 0,

        total_duration:
          typeof item.total_duration === 'number'
            ? item.total_duration
            : segments.reduce(
                (total, segment) =>
                  total + (segment.duration || 0),
                0,
              ),

        type:
          typeof item.type === 'string'
            ? item.type
            : undefined,

        travel_class:
          typeof first?.travel_class === 'string'
            ? first.travel_class
            : undefined,

        flights: segments,
        segments,

        layovers: Array.isArray(item.layovers)
          ? item.layovers
              .filter(
                (
                  stop,
                ): stop is {
                  id?: string;
                  name?: string;
                  duration: number;
                } =>
                  Boolean(stop) &&
                  typeof stop === 'object',
              )
              .map((stop) => ({
                id:
                  typeof stop.id === 'string'
                    ? stop.id
                    : undefined,

                name:
                  typeof stop.name === 'string'
                    ? stop.name
                    : undefined,

                duration:
                  typeof stop.duration === 'number'
                    ? stop.duration
                    : 0,
              }))
          : [],
      };
    });
}


export type LogisticsCategory =
  | 'flight'
  | 'hotel'
  | 'restaurant'
  | 'transport'
  | 'event';

export interface LogisticsAction {
  id: string;
  status: 'pending_approval' | 'approved' | 'rejected' | string;
  created_at: string;
  action: 'book' | 'modify' | 'cancel';
  category: LogisticsCategory;
  details: Record<string, unknown>;
  estimated_total?: number | null;
  currency: string;
  note?: string;
}

export interface LogisticsOverview {
  source: string;
  fetched_at: string;
  capabilities: Record<string, boolean | string>;
  pending_actions: LogisticsAction[];
  total_pending: number;
}

export interface LogisticsSearchResponse {
  kind: LogisticsKind;
  provider: string;
  results: unknown;
  fetched_at: string;
  source?: string;
}

export async function getLogisticsOverview(): Promise<LogisticsOverview> {
  const response = await fetch('/api/logistics/overview', {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Logistics overview failed: ${response.status}`);
  }

  return response.json();
}

export async function searchLogistics(
  kind: LogisticsKind,
  parameters: Record<string, unknown>,
): Promise<LogisticsSearchResponse> {
  const response = await fetch('/api/logistics/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      kind,
      parameters,
    }),
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.detail || 'Logistics search failed');
  }

  return body as LogisticsSearchResponse;
}

export async function stageLogisticsAction(input: {
  action: 'book' | 'modify' | 'cancel';
  category: LogisticsCategory;
  details: Record<string, unknown>;
  estimated_total?: number;
  currency?: string;
}): Promise<LogisticsAction> {
  const response = await fetch('/api/logistics/actions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.detail || 'Could not stage logistics action');
  }

  return body as LogisticsAction;
}

export function extractHotelOptions(
  payload: unknown,
): HotelOption[] {
  const root = payload as {
    results?: unknown;
  };

  const batch = Array.isArray(root?.results)
    ? root.results
    : [];

  const response = batch[0] as {
    response?: {
      data?: {
        results?: {
          properties?: unknown[];
          ads?: unknown[];
        };
      };
    };
  } | undefined;

  const data =
    response?.response?.data?.results;

  const options = [
    ...(data?.properties || []),
    ...(data?.ads || []),
  ];

  return options
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) &&
        typeof item === 'object',
    )
    .map((item) => {
      const images = Array.isArray(item.images)
        ? item.images
        : [];

      const firstImage = images[0] as
        | Record<string, unknown>
        | undefined;

      const rate = item.rate_per_night as
        | Record<string, unknown>
        | undefined;

      const total = item.total_rate as
        | Record<string, unknown>
        | undefined;

      return {
        name:
          typeof item.name === 'string'
            ? item.name
            : 'Hotel option',

        image:
          typeof firstImage?.thumbnail === 'string'
            ? firstImage.thumbnail
            : typeof firstImage?.original_image ===
                'string'
              ? firstImage.original_image
              : undefined,

        rating:
          typeof item.overall_rating === 'number'
            ? item.overall_rating
            : undefined,

        hotel_class:
          typeof item.hotel_class === 'string' ||
          typeof item.hotel_class === 'number'
            ? item.hotel_class
            : undefined,

        price:
          typeof total?.lowest === 'string'
            ? total.lowest
            : typeof item.price === 'string'
              ? item.price
              : undefined,

        nightly_price:
          typeof rate?.lowest === 'string'
            ? rate.lowest
            : undefined,

        link:
          typeof item.link === 'string'
            ? item.link
            : undefined,

        amenities: Array.isArray(item.amenities)
          ? item.amenities
              .filter(
                (amenity): amenity is string =>
                  typeof amenity === 'string',
              )
              .slice(0, 5)
          : [],
      };
    });
}
