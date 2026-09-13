import { supabase } from '@/lib/supabase';
/** Disabled until provider/configuration approval. Never send ticket body or health data. */
export async function notifySupport(ticketId: string): Promise<string> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.SUPPORT_EMAIL_FROM;
  if (process.env.SUPPORT_EMAIL_ENABLED !== 'true' || !key || !from) {
    const result = await supabase.from('support_tickets').update({ email_status: 'unavailable' }).eq('id', ticketId).in('email_status', ['pending','failed','unavailable']);
    if (result.error) throw new Error('Notification status unavailable');
    return 'unavailable';
  }
  const { data: ticket, error } = await supabase.from('support_tickets').select('email_status,email_attempts,email_attempt_at,email_first_attempt_at').eq('id', ticketId).single();
  if (error) throw new Error('Notification unavailable');
  if (ticket.email_status === 'accepted' || ticket.email_status === 'unknown') return ticket.email_status;
  if (ticket.email_status === 'sending' && ticket.email_attempt_at && Date.now() - Date.parse(ticket.email_attempt_at) < 60000) return 'sending';
  // Provider deduplication has a limited window. Never blindly resend an ambiguous old attempt.
  if (ticket.email_attempts >= 3 || (ticket.email_first_attempt_at && Date.now() - Date.parse(ticket.email_first_attempt_at) >= 23 * 3600000)) {
    const saved = await supabase.from('support_tickets').update({ email_status: 'unknown' }).eq('id', ticketId).eq('email_attempts', ticket.email_attempts).neq('email_status', 'accepted');
    if (saved.error) throw new Error('Notification status unavailable');
    return 'unknown';
  }
  const now = new Date().toISOString();
  const { data: claimed, error: claimError } = await supabase.from('support_tickets').update({ email_status: 'sending', email_attempts: ticket.email_attempts + 1, email_attempt_at: now, email_first_attempt_at: ticket.email_first_attempt_at || now }).eq('id', ticketId).eq('email_attempts', ticket.email_attempts).eq('email_status', ticket.email_status).select('id').maybeSingle();
  if (claimError) throw new Error('Notification unavailable');
  if (!claimed) return 'sending';
  let status = 'failed';
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `support-ticket/${ticketId}` },
      body: JSON.stringify({ from, to: ['basharelhusseini@gmail.com'], subject: 'New Thrivv support request', text: `A new support request is waiting in Thrivv.\n\nTicket: ${ticketId}\nOpen: https://gyms.thrivv.dev/admin/gyms?tab=Support&ticket=${ticketId}\n\nSign in as a platform administrator to read and reply. Replying to this email does not update the ticket.` }),
    });
    if (response.ok) status = 'accepted';
  } catch { /* Ticket remains saved; admin can retry without repeating the submission. */ }
  const saved = await supabase.from('support_tickets').update({ email_status: status }).eq('id', ticketId).eq('email_attempts', ticket.email_attempts + 1);
  if (saved.error) throw new Error('Notification outcome unavailable');
  return status; // Accepted by provider is not a claim of delivery to the inbox.
}
