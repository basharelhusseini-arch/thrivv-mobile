import { NextRequest } from 'next/server';
import { store } from '@/lib/store';
import { legacyAdminAccess, legacyJson } from '@/lib/legacy-api-access';

export async function GET() {
  try {
    const access = await legacyAdminAccess();
    if (!access.ok) return access.response;
    const trainers = store.getAllTrainers();
    return legacyJson(trainers);
  } catch (error) {
    return legacyJson({ error: 'Failed to fetch trainers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await legacyAdminAccess();
    if (!access.ok) return access.response;
    const body = await request.json();
    const trainer = store.addTrainer(body);
    return legacyJson(trainer, { status: 201 });
  } catch (error) {
    return legacyJson({ error: 'Failed to create trainer' }, { status: 500 });
  }
}
