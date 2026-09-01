import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const sha256 = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Oturum gerekli' }, 401);
    const url = Deno.env.get('SUPABASE_URL');
    const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
    if (!url || !anon) return json({ error: 'Supabase ortam değişkenleri eksik' }, 500);
    const client = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user) return json({ error: 'Oturum gerekli' }, 401);
    const body = await request.json();

    if (body.action === 'start') {
      const { data, error } = await client.rpc('issue_heartbeat', { p_task_id: body.taskId });
      if (error) return json({ error: error.message }, 400);
      const challenge = Array.isArray(data) ? data[0] : data;
      if (!challenge) return json({ error: 'Heartbeat başlatılamadı' }, 500);
      const secretCode = String(Math.floor(100000 + Math.random() * 900000));
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (!serviceRoleKey) return json({ error: 'Supabase servis anahtarı eksik' }, 500);
      const service = createClient(url, serviceRoleKey);
      const submissionId = challenge.submission_id ?? challenge.submissionId;
      if (!submissionId || !challenge.nonce) return json({ error: 'Heartbeat yanıtı eksik alan içeriyor' }, 500);
      const { error: updateError } = await service.from('submissions').update({ secret_code_hash: await sha256(secretCode) }).eq('id', submissionId).eq('user_id', userData.user.id);
      if (updateError) return json({ error: updateError.message }, 500);
      return json({ submissionId, nonce: challenge.nonce, expiresAt: challenge.expires_at ?? challenge.expiresAt, durationSeconds: challenge.duration_seconds ?? challenge.durationSeconds, secretCode });
    }

    if (body.action === 'beat') {
      const { data, error } = await client.rpc('record_heartbeat', { p_nonce: body.nonce, p_seconds: body.seconds });
      if (error) return json({ error: error.message }, 400);
      return json(data?.[0] ?? { seconds: 0, completed: false });
    }

    if (body.action === 'verify-code') {
      const { data, error } = await client.rpc('verify_submission_code', { p_submission_id: body.submissionId, p_code: body.code });
      if (error) return json({ error: error.message }, 400);
      return json({ verified: data === true });
    }

    return json({ error: 'Geçersiz action' }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Heartbeat başarısız' }, 400);
  }
});
