import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { actor, bodyOf, handled, HttpError, json, pageOffset, textField } from '@/lib/admin/http';
import { notifySupport } from '@/lib/support-email';
export const dynamic = 'force-dynamic';
export function GET(req: NextRequest) { return handled(async () => {
  const admin = req.nextUrl.searchParams.get('scope') === 'admin';
  const user = await actor(admin); const offset = pageOffset(req);
  let query = supabase.from('support_tickets').select('id,user_id,subject,status,email_status,created_at,updated_at', { count: 'exact' }).order('created_at', { ascending: false }).order('id').range(offset, offset + 49);
  if (!admin) query = query.eq('user_id', user.id);
  const { data, error, count } = await query; if (error) throw error;
  return json({ tickets: data, total: count, offset });
}); }
export function POST(req: NextRequest) { return handled(async () => {
  const user = await actor(false); const b = await bodyOf(req);
  const { data, error } = await supabase.rpc('thrivv_support_message', { p_actor: user.id, p_request: b.requestId, p_ticket: null, p_subject: textField(b.subject, 'Subject', 3, 120), p_body: textField(b.message, 'Message', 1, 5000) });
  if (error) throw new HttpError(409, 'Ticket not submitted. Check your input or daily request limit.');
  let notification = 'unknown'; try { notification = await notifySupport(data); } catch { /* Saved ticket is authoritative. */ }
  return json({ id: data, notification }, 201);
}); }
