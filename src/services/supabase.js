import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  realtime: {
    params: { eventsPerSecond: 20 },
  },
});

export default supabase;

export const STORAGE_BUCKET = 'production-board-files';

export async function uploadSignedFile(path, token, file) {
  return supabase.storage.from(STORAGE_BUCKET).uploadToSignedUrl(path, token, file, {
    contentType: file.type || 'application/octet-stream',
  });
}

export async function signFile(path, expiresIn = 24 * 60 * 60) {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
