import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export type DbTask = { id: number; title: string; creator: string; description: string; video_id: string; points: number; duration_seconds: number; audience: string; color: string };

export async function loadTasks() {
  if (!supabase) return { data: null, error: new Error('Supabase yapılandırılmamış') };
  return supabase.from('tasks').select('id,title,creator,description,video_id,points,duration_seconds,audience,color').eq('is_active', true).order('id');
}

export async function createSubmission(input: { taskId: number; watchedSeconds: number; liked: boolean; subscribed: boolean }) {
  if (!supabase) return { data: null, error: new Error('Supabase yapılandırılmamış') };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { data: null, error: new Error('Oturum gerekli') };
  return supabase.from('submissions').insert({ task_id: input.taskId, user_id: auth.user.id, watched_seconds: input.watchedSeconds, liked: input.liked, subscribed: input.subscribed }).select('id').single();
}

export async function uploadEvidence(submissionId: string, file: File) {
  if (!supabase) return { data: null, error: new Error('Supabase yapılandırılmamış') };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { data: null, error: new Error('Oturum gerekli') };
  const path = `${auth.user.id}/${submissionId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const upload = await supabase.storage.from('evidence').upload(path, file, { contentType: file.type, upsert: false });
  if (upload.error) return { data: null, error: upload.error };
  const evidence = await supabase.from('evidence').insert({ submission_id: submissionId, user_id: auth.user.id, storage_path: path, kind: 'screenshot' }).select().single();
  if (evidence.error) return { data: null, error: evidence.error };
  return evidence;
}

export async function createCampaign(input: { name: string; videoUrl: string; targetParticipants: number; pointsPerTask: number }) {
  if (!supabase) return { data: null, error: new Error('Supabase yapılandırılmamış') };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { data: null, error: new Error('Oturum gerekli') };
  return supabase.from('campaigns').insert({ advertiser_id: auth.user.id, name: input.name, video_url: input.videoUrl, target_participants: input.targetParticipants, points_per_task: input.pointsPerTask, budget_reserved: input.targetParticipants * input.pointsPerTask }).select().single();
}

export async function approveSubmission(submissionId: string) {
  if (!supabase) return { error: new Error('Supabase yapılandırılmamış') };
  return supabase.rpc('approve_submission', { p_submission_id: submissionId });
}
