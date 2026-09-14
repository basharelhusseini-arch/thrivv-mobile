import { NextRequest } from 'next/server';
import { store } from '@/lib/store';
import { legacyAdminAccess, legacyJson } from '@/lib/legacy-api-access';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await legacyAdminAccess();
    if (!access.ok) return access.response;
    const trainer = store.getTrainer(params.id);
    if (!trainer) {
      return legacyJson({ error: 'Trainer not found' }, { status: 404 });
    }
    return legacyJson(trainer);
  } catch (error) {
    return legacyJson({ error: 'Failed to fetch trainer' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await legacyAdminAccess();
    if (!access.ok) return access.response;
    const body = await request.json();
    const trainer = store.updateTrainer(params.id, body);
    if (!trainer) {
      return legacyJson({ error: 'Trainer not found' }, { status: 404 });
    }
    return legacyJson(trainer);
  } catch (error) {
    return legacyJson({ error: 'Failed to update trainer' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await legacyAdminAccess();
    if (!access.ok) return access.response;
    const success = store.deleteTrainer(params.id);
    if (!success) {
      return legacyJson({ error: 'Trainer not found' }, { status: 404 });
    }
    return legacyJson({ message: 'Trainer deleted successfully' });
  } catch (error) {
    return legacyJson({ error: 'Failed to delete trainer' }, { status: 500 });
  }
}
