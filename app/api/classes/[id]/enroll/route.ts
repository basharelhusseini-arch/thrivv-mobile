import { NextRequest } from 'next/server';
import { unavailableLegacyAction } from '@/lib/legacy-api-access';

// The old global memory store cannot reserve a real, gym-scoped appointment.
export async function POST(request: NextRequest) {
  return unavailableLegacyAction(request, 'BOOKING_UNAVAILABLE', 'Online class booking is not available yet. Please contact your gym to arrange or change a booking.');
}

export async function DELETE(request: NextRequest) {
  return unavailableLegacyAction(request, 'BOOKING_UNAVAILABLE', 'Online class booking is not available yet. Please contact your gym to arrange or change a booking.');
}
