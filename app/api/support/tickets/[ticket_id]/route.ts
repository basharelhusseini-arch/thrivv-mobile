import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { actor, bodyOf, handled, HttpError, json, pageOffset, textField, uuid } from '@/lib/admin/http';
type Context = { params: Promise<{ ticket_id: string }> };
export const dynamic = 'force-dynamic';
async function access(id: string) {
  const user = await actor(false); if (!uuid(id)) throw new HttpError(400, 'Invalid ticket');
  const { data, error } = await supabase.from('support_tickets').select('id,user_id,subject,status,email_status,created_at').eq('id', id).maybeSingle();
  if (error) throw error; if (!data) throw new HttpError(404, 'Ticket unavailable');
  if (data.user_id !== user.id) await actor(true);
  return { user, ticket: data };
}
export async function GET(req: NextRequest, props: Context) {
  const params = await props.params;
  return handled(async () => {
    const { ticket } = await access(params.ticket_id); const offset = pageOffset(req);
    const { data, error, count } = await supabase.from('support_messages').select('id,author_role,body,created_at', { count: 'exact' }).eq('ticket_id', ticket.id).order('created_at').order('id').range(offset, offset + 49);
    if (error) throw error; return json({ ticket, messages: data, total: count, offset });
  });
}
export async function POST(req: NextRequest, props: Context) {
  const params = await props.params;
  return handled(async () => {
    const { user, ticket } = await access(params.ticket_id); const b = await bodyOf(req);
    if (b.status !== undefined) { await actor(true); if (!['open', 'resolved'].includes(b.status)) throw new HttpError(400, 'Invalid status'); }
    const { data, error } = await supabase.rpc('thrivv_support_message', { p_actor: user.id, p_request: b.requestId, p_ticket: ticket.id, p_subject: null, p_body: textField(b.message, 'Message', 1, 5000), p_status: b.status || null });
    if (error) throw new HttpError(409, 'Reply not saved. Check the ticket status or message limit.');
    return json({ id: data });
  });
}
