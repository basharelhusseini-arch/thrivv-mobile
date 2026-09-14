import { NextRequest } from 'next/server';
import { legacyJson, legacyMemberAccess, unavailableLegacyAction } from '@/lib/legacy-api-access';

export async function POST(request: NextRequest) {
  return unavailableLegacyAction(request, 'PAYMENT_UNAVAILABLE', 'Payments are not available through Thrivv yet. Please contact your gym directly.');
}

export async function GET(request: NextRequest) {
  const access = await legacyMemberAccess(request.nextUrl.searchParams.get('memberId'));
  if (!access.ok) return access.response;
  // No provider has confirmed transactions. Preserve old simulated receipts in
  // the legacy store without presenting them as actual payments.
  return legacyJson([]);
}
