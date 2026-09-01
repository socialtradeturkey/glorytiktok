import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const authHeader = request.headers.get('Authorization');
    const { submissionId, videoId, channelId, accessToken } = await request.json();
    if (!authHeader || !submissionId || !videoId || !channelId || !accessToken) return json({ error: 'Eksik doğrulama bilgisi' }, 400);

    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: 'Oturum gerekli' }, 401);

    const youtube = async (path: string) => {
      const response = await fetch(`https://www.googleapis.com/youtube/v3/${path}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || 'YouTube API hatası');
      return payload;
    };
    const rating = await youtube(`videos?part=id&myRating=like&id=${encodeURIComponent(videoId)}`);
    const subscriptions = await youtube(`subscriptions?part=snippet&mine=true&forChannelId=${encodeURIComponent(channelId)}&maxResults=1`);
    const liked = Array.isArray(rating.items) && rating.items.some((item: { id: string }) => item.id === videoId);
    const subscribed = Boolean(subscriptions.items?.length);
    const admin = createClient(url, service);
    const { error: updateError } = await admin.from('submissions').update({ liked, subscribed, youtube_verified_at: liked && subscribed ? new Date().toISOString() : null }).eq('id', submissionId).eq('user_id', userData.user.id);
    if (updateError) return json({ error: updateError.message }, 500);
    return json({ liked, subscribed, verified: liked && subscribed });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Doğrulama başarısız' }, 400);
  }
});
