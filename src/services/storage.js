import api from './api';
import { uploadSignedFile } from './supabase';

export async function uploadAsset(file, purpose) {
  const signed = await api.post('/api/uploads/sign', {
    file_name: file.name,
    content_type: file.type,
    size: file.size,
    purpose,
  });
  const path = signed.data?.path;
  const token = signed.data?.token;
  if (!path || !token) {
    throw new Error('O servidor nao retornou a autorizacao de upload.');
  }
  const { error } = await uploadSignedFile(path, token, file);
  if (error) throw error;
  return path;
}
