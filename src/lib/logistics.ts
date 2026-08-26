export type LogisticsKind =
  | 'flights'
  | 'hotels'
  | 'restaurants'
  | 'events'
  | 'places';

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
