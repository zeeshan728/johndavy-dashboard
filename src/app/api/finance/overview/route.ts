import { NextRequest } from 'next/server';
import { proxyFinance } from '../proxy';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return proxyFinance(request, '/api/finance/overview');
}