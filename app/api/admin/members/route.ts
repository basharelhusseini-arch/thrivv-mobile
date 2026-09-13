import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { actor, handled, HttpError, json, pageOffset, uuid } from '@/lib/admin/http';
import { memberDetail } from '@/lib/admin/data';
export const dynamic = 'force-dynamic';
export function GET(req: NextRequest) { return handled(async () => {
  await actor();
  const id = req.nextUrl.searchParams.get('id');
  if (id) { if (!uuid(id)) throw new HttpError(400, 'Invalid member'); const detail = await memberDetail(id); return detail ? json(detail) : json({ error: 'Member not found' }, 404); }
  const offset = pageOffset(req);
  let query = supabase.from('users').select('id,first_name,last_name,email,gym_id', { count: 'exact' }).order('id').range(offset, offset + 49);
  const search = (req.nextUrl.searchParams.get('q') || '').trim().slice(0, 120).replace(/[^\p{L}\p{N}@. +\-]/gu, '');
  if (search) query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
  const gym = req.nextUrl.searchParams.get('gym'); if (gym) { if (!uuid(gym)) throw new HttpError(400, 'Invalid gym'); query = query.eq('gym_id', gym); }
  const { data, error, count } = await query; if (error) throw error;
  return json({ members: data, total: count, offset });
}); }
