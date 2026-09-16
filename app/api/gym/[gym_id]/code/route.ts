import { NextRequest, NextResponse } from 'next/server';
import { checkGymAccess } from '@/lib/gym-auth';
import { supabase } from '@/lib/supabase';
import { newGymCode } from '@/lib/gym-codes';
import { decryptGymCode, encryptGymCode, GymCodeConfigurationError } from '@/lib/gym-code-encryption';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie' };
type Context = { params: Promise<{ gym_id: string }> };
export async function GET(_request: NextRequest, props: Context) {
  const params = await props.params;
  const access = await checkGymAccess(params.gym_id);
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status, headers });
  const { data, error } = await supabase.from('gym_join_codes').select('code_hash,code_ciphertext,code_encryption_version').eq('gym_id', params.gym_id).maybeSingle();
  if (error) return NextResponse.json({ error: 'Gym code unavailable. Please retry.' }, { status: 503, headers });
  if (!data) return NextResponse.json({ status: 'missing', code: null }, { headers });
  if (!data.code_ciphertext) return NextResponse.json({ status: 'legacy', code: null }, { headers });
  try {
    if (data.code_encryption_version !== 1) throw new Error('Unsupported code format');
    const code = decryptGymCode(data.code_ciphertext, params.gym_id, data.code_hash);
    return NextResponse.json({ status: 'available', code }, { headers });
  } catch {
    return NextResponse.json({ error: 'Stored code cannot be displayed. Contact Thrivv; the existing joining code remains valid.' }, { status: 503, headers });
  }
}
export async function POST(request: NextRequest, props: Context) {
  const params = await props.params;
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403, headers });
  const access = await checkGymAccess(params.gym_id);
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status, headers });
  const { code, hash } = newGymCode();
  try {
    // Validate encryption before replacing any existing hash.
    const encrypted = encryptGymCode(code, params.gym_id);
    const { error } = await supabase.from('gym_join_codes').upsert({ gym_id: params.gym_id, code_hash: hash,
      code_ciphertext: encrypted, code_encryption_version: 1, created_by: access.user.id, updated_at: new Date().toISOString() }, { onConflict: 'gym_id' });
    if (error) {
      console.error('Gym code storage failure', { code: error.code });
      throw new Error('Storage unavailable');
    }
    return NextResponse.json({ status: 'available', code }, { headers });
  } catch (error) {
    if (error instanceof GymCodeConfigurationError) return NextResponse.json({ error: 'Gym joining-code setup is incomplete. Ask your platform administrator to configure the encryption key.', code: 'GYM_CODE_SETUP_REQUIRED' }, { status: 503, headers });
    return NextResponse.json({ error: 'Unable to save a gym code. Please retry or contact Thrivv.' }, { status: 503, headers });
  }
}
