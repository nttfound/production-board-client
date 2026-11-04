import supabase, { signFile } from './supabase';
import { SUPABASE_PUBLISHABLE_KEY } from './config';

const listeners = new Map();
let channel = null;
let realtimeToken = null;
let retryTimer = null;
let retryAttempt = 0;
let connecting = false;

function emitLocal(event, payload) {
  for (const handler of listeners.get(event) || []) handler(payload);
}

async function messageWithMentions(row) {
  const mentions = (row.text?.match(/@(\w+)/g) || []).map((mention) => mention.slice(1));
  let fileUrl = row.file_url || null;
  if (fileUrl && !/^https?:|^data:/i.test(fileUrl)) {
    try { fileUrl = await signFile(fileUrl); } catch { fileUrl = null; }
  }
  return { ...row, file_url: fileUrl, mentions };
}

async function signedCard(row) {
  const [imagePath, attachmentPath] = await Promise.all([
    row.image_path && !/^https?:/i.test(row.image_path) ? signFile(row.image_path).catch(() => null) : row.image_path,
    row.anexo_path && !/^https?:/i.test(row.anexo_path) ? signFile(row.anexo_path).catch(() => null) : row.anexo_path,
  ]);
  return { ...row, image_path: imagePath, anexo_path: attachmentPath };
}

const socket = {
  connected: false,
  on(event, handler) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(handler);
  },
  off(event, handler) {
    if (handler) listeners.get(event)?.delete(handler);
    else listeners.delete(event);
  },
  emit(event, payload) {
    emitLocal(event, payload);
  },
  async connect(token) {
    if (!token) return;
    realtimeToken = token;
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    if (channel || connecting) {
      await supabase.realtime.setAuth(token);
      supabase.storage.setHeader('Authorization', `Bearer ${token}`);
      return;
    }

    connecting = true;
    try {
      await supabase.realtime.setAuth(token);
      supabase.storage.setHeader('Authorization', `Bearer ${token}`);
      // This topic only carries Postgres Changes. The table RLS policies below
      // still authorize every row; private-channel authorization is for
      // Broadcast/Presence and adds an unrelated second policy check here.
      const activeChannel = supabase.channel('production-board', { config: { private: false } });
      channel = activeChannel;

      activeChannel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cards' }, async ({ new: row }) => {
        if (row.archived_at == null) emitLocal('card:created', await signedCard(row));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cards' }, async ({ new: row, old }) => {
        if (old.archived_at == null && row.archived_at != null) emitLocal('card:deleted', { id: row.id });
        else if (row.archived_at == null) emitLocal('card:updated', await signedCard(row));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'cards' }, ({ old: row }) => {
        emitLocal('card:deleted', { id: row.id });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async ({ new: row }) => {
        emitLocal('chat:message', await messageWithMentions(row));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, ({ new: row }) => {
        if (row.deleted_at) emitLocal('chat:deleted', { id: Number(row.id) });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, ({ old: row }) => {
        emitLocal('chat:deleted', { id: Number(row.id) });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'anexos_globais' }, async (payload) => {
        const row = payload.new && Object.keys(payload.new).length ? payload.new : null;
        let url = row?.url || null;
        if (url && !/^https?:/i.test(url)) url = await signFile(url).catch(() => null);
        emitLocal('anexo:atualizado', row ? { ...row, url } : null);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cidades_carga' }, () => {
        emitLocal('cidades:updated');
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_log' }, ({ new: row }) => {
        emitLocal('audit:new', row);
      })
      .subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          retryAttempt = 0;
          socket.connected = true;
          emitLocal('connect');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          socket.connected = false;
          emitLocal('connect_error', error || new Error(status));
          emitLocal('disconnect');
          if (channel === activeChannel) {
            channel = null;
            supabase.removeChannel(activeChannel).catch(() => {});
            socket.scheduleReconnect();
          }
        }
      });
    } catch (error) {
      socket.connected = false;
      emitLocal('connect_error', error);
      socket.scheduleReconnect();
    } finally {
      connecting = false;
    }
  },
  scheduleReconnect() {
    if (!realtimeToken || retryTimer) return;
    const delay = Math.min(1000 * (2 ** retryAttempt), 30000);
    retryAttempt += 1;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      socket.connect(realtimeToken);
    }, delay);
  },
  async refreshAuth(token) {
    if (token) await socket.connect(token);
  },
  async disconnect() {
    realtimeToken = null;
    retryAttempt = 0;
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    const active = channel;
    channel = null;
    if (active) await supabase.removeChannel(active);
    await supabase.realtime.setAuth();
    supabase.storage.setHeader('Authorization', `Bearer ${SUPABASE_PUBLISHABLE_KEY}`);
    socket.connected = false;
    emitLocal('disconnect');
  },
};

export default socket;
