import { actor, handled, json } from '@/lib/admin/http';
import { supabase } from '@/lib/supabase';
export function GET() { return handled(async () => {
  await actor();
  const { data, error } = await supabase.from('gyms').select('id,name').order('name').limit(1000);
  if (error) throw error;
  return json({ gyms: data || [] });
}); }
