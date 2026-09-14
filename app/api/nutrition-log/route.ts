import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { parseNutritionEntry, validEntryId, validNutritionDate } from '@/lib/nutrition-log-validation';

const headers = { 'Cache-Control': 'no-store' };
const failure = (error: string, status: number) => NextResponse.json({ error }, { status, headers });
function crossOrigin(request: NextRequest) {
  return request.headers.get('sec-fetch-site') === 'cross-site' || Boolean(request.headers.get('origin') && request.headers.get('origin') !== request.nextUrl.origin);
}
async function owner() {
  try { return await requireAuth(); } catch { return null; }
}
async function readLog(userId: string, date: string) {
  const { data, error } = await supabase.from('nutrition_log_entries').select('entry_id,meal')
    .eq('user_id', userId).eq('date', date).is('deleted_at', null).order('created_at');
  if (error) throw new Error('Unable to load food log');
  return { date, meals: (data || []).map(row => ({ ...row.meal, id: row.entry_id })) };
}
export async function GET(request: NextRequest) {
  const user = await owner();
  if (!user) return failure('Please sign in to view your food log.', 401);
  const date = request.nextUrl.searchParams.get('date') || new Date().toISOString().slice(0, 10);
  if (request.nextUrl.searchParams.get('expectedUserId') !== user.id) return failure('Your account changed. Refresh before continuing.', 403);
  if (!validNutritionDate(date)) return failure('Invalid date', 400);
  try { return NextResponse.json(await readLog(user.id, date), { headers }); }
  catch { return failure('Your food log could not be loaded. Please retry.', 503); }
}
export async function POST(request: NextRequest) {
  if (crossOrigin(request)) return failure('Invalid request origin', 403);
  const user = await owner();
  if (!user) return failure('Please sign in to save food.', 401);
  try {
    const text = await request.text();
    if (text.length > 512000) return failure('Import is too large. Please use smaller batches.', 413);
    const body = JSON.parse(text);
    if (body.expectedUserId !== user.id) return failure('Your account changed. Refresh before continuing.', 403);
    if (!Array.isArray(body.entries) || body.entries.length < 1 || body.entries.length > 100) return failure('Invalid meal batch', 400);
    let entries;
    try { entries = body.entries.map(parseNutritionEntry); } catch { return failure('This food entry could not be read. Your existing log is unchanged.', 400); }
    const rows = entries.map((entry: ReturnType<typeof parseNutritionEntry>) => ({ user_id: user.id, entry_id: entry.entryId, date: entry.date, meal: entry.meal }));
    // Never overwrite an existing entry or tombstone. Retries and imports are idempotent.
    const { error } = await supabase.from('nutrition_log_entries').upsert(rows, { onConflict: 'user_id,entry_id', ignoreDuplicates: true });
    if (error) return failure('Food was not saved. Your local history is still available. Please retry.', 503);
    return NextResponse.json({ success: true }, { headers });
  } catch { return failure('Unable to read food entries.', 400); }
}
export async function DELETE(request: NextRequest) {
  if (crossOrigin(request)) return failure('Invalid request origin', 403);
  const user = await owner();
  if (!user) return failure('Please sign in to edit your food log.', 401);
  try {
    const body = await request.json();
    if (body.expectedUserId !== user.id) return failure('Your account changed. Refresh before continuing.', 403);
    if (!validNutritionDate(body.date) || !validEntryId(body.entryId)) return failure('Invalid meal entry', 400);
    const { error } = await supabase.from('nutrition_log_entries').update({ deleted_at: new Date().toISOString() })
      .eq('user_id', user.id).eq('entry_id', body.entryId).eq('date', body.date).is('deleted_at', null);
    if (error) return failure('Unable to remove this meal. Please retry.', 503);
    return NextResponse.json(await readLog(user.id, body.date), { headers });
  } catch { return failure('Unable to remove this meal.', 503); }
}
export async function PATCH(request: NextRequest) {
  if (crossOrigin(request)) return failure('Invalid request origin', 403);
  const user = await owner();
  if (!user) return failure('Please sign in to edit your food log.', 401);
  try {
    const body = await request.json();
    if (body.expectedUserId !== user.id) return failure('Your account changed. Refresh before continuing.', 403);
    if (!validNutritionDate(body.date) || !validEntryId(body.entryId) || typeof body.servings !== 'number' || !Number.isFinite(body.servings) || body.servings <= 0 || body.servings > 10000) return failure('Invalid serving quantity', 400);
    const { data, error } = await supabase.from('nutrition_log_entries').select('meal').eq('user_id', user.id).eq('entry_id', body.entryId).eq('date', body.date).is('deleted_at', null).maybeSingle();
    if (error) return failure('Unable to load this meal.', 503);
    if (!data) return failure('Meal not found.', 404);
    const result = await supabase.from('nutrition_log_entries').update({ meal: { ...data.meal, servings: body.servings } })
      .eq('user_id', user.id).eq('entry_id', body.entryId).eq('date', body.date).is('deleted_at', null);
    if (result.error) return failure('Unable to update this meal.', 503);
    return NextResponse.json(await readLog(user.id, body.date), { headers });
  } catch { return failure('Unable to update this meal.', 503); }
}
