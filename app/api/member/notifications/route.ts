import { NextRequest } from 'next/server';
import { legacyJson, legacyMemberAccess } from '@/lib/legacy-api-access';

export async function GET(request: NextRequest) {
  const access = await legacyMemberAccess(request.nextUrl.searchParams.get('memberId'));
  if (!access.ok) return access.response;
  // The retired demo generated confirmations without an actual booking, charge,
  // or delivered email. Preserve its records without presenting them as real.
  return legacyJson([]);
}
