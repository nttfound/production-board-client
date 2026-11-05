import { useEffect, useRef, useState } from 'react';
import api from '../../../services/api';
import socket from '../../../services/socket';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotifications } from '../../../contexts/NotificationContext';
import { useCidades } from '../../../contexts/CidadesContext';
import { normalizeCard, sortCards } from './boardModel';

export default function useBoardData({ showChatRef, setChatUnread }) {
  const { user } = useAuth();
  const { config: cidadesConfig } = useCidades();
  const { notifyChat, notifyProducing, notifyUrgent, notifyReady, notifyAttachment } = useNotifications();
  const [cards, setCards] = useState([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const requestInFlightRef = useRef(false);
  const cardsRef = useRef([]);
  const connectionRef = useRef(false);

  useEffect(() => { cardsRef.current = cards; }, [cards]);
  useEffect(() => {
    if (cidadesConfig) setCards(previous => sortCards(previous));
  }, [cidadesConfig]);

  useEffect(() => {
    let active = true;
    const loadCards = async () => {
      if (requestInFlightRef.current) return;
      requestInFlightRef.current = true;
      try {
        const response = await api.get('/api/cards');
        if (!active) return;
        setLoadError(false);
        const nextCards = sortCards(response.data.map(normalizeCard));
        setCards(current => {
          const unchanged = current.length === nextCards.length && current.every((card, index) => (
            card.id === nextCards[index]?.id && card.updated_at === nextCards[index]?.updated_at
          ));
          return unchanged ? current : nextCards;
        });
      } catch (error) {
        if (active) setLoadError(true);
        console.error('[BOARD] Failed to load cards:', error);
      } finally {
        requestInFlightRef.current = false;
        if (active) setLoading(false);
      }
    };

    loadCards();
    const interval = setInterval(() => {
      if (!connectionRef.current) loadCards();
    }, 5000);
    return () => {
      active = false;
      if (interval) clearInterval(interval);
    };
  }, [reloadKey]);

  useEffect(() => {
    connectionRef.current = socket.connected;
    setConnected(socket.connected);
    const handleConnect = () => { connectionRef.current = true; setConnected(true); };
    const handleDisconnect = () => { connectionRef.current = false; setConnected(false); };
    const handleConnectError = error => {
      console.info('[REALTIME] Connection unavailable; polling remains active.', error?.message || '');
      connectionRef.current = false;
      setConnected(false);
    };
    const handleCardCreated = card => {
      const normalized = normalizeCard(card);
      setCards(previous => sortCards([normalized, ...previous.filter(item => item.id !== normalized.id)]));
    };
    const handleCardUpdated = updated => {
      const normalized = normalizeCard(updated);
      const previous = cardsRef.current.find(card => card.id === normalized.id);
      if (previous) {
        if (previous.status !== normalized.status && normalized.status === 'Producing') notifyProducing(normalized.title);
        if (previous.status !== normalized.status && normalized.status === 'Ready') notifyReady(normalized.title);
        if (!previous.urgente && normalized.urgente) notifyUrgent(normalized.title, normalized.updated_by || normalized.created_by);
        if (previous.anexo_path !== normalized.anexo_path && normalized.anexo_path) notifyAttachment(normalized.anexo_nome);
      }
      setCards(current => sortCards(current.map(card => card.id === normalized.id ? normalized : card)));
    };
    const handleCardDeleted = ({ id }) => {
      setCards(previous => previous.filter(card => card.id !== id));
    };
    const handleChatMessage = message => {
      if (!showChatRef.current) {
        setChatUnread(previous => previous + 1);
        const sender = message?.username || message?.display_name || 'Alguem';
        const preview = message?.text || '';
        if (preview) notifyChat(sender, preview.slice(0, 80));
      }
    };
    const handleAttachmentUpdated = attachment => {
      if (attachment?.url) notifyAttachment(attachment.nome);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('card:created', handleCardCreated);
    socket.on('card:updated', handleCardUpdated);
    socket.on('card:deleted', handleCardDeleted);
    socket.on('chat:message', handleChatMessage);
    socket.on('anexo:atualizado', handleAttachmentUpdated);
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('card:created', handleCardCreated);
      socket.off('card:updated', handleCardUpdated);
      socket.off('card:deleted', handleCardDeleted);
      socket.off('chat:message', handleChatMessage);
      socket.off('anexo:atualizado', handleAttachmentUpdated);
    };
  }, [user, showChatRef, setChatUnread, notifyChat, notifyProducing, notifyUrgent, notifyReady, notifyAttachment]);

  const retry = () => { setLoading(true); setReloadKey(key => key + 1); };
  return { cards, setCards, cardsRef, connected, loading, loadError, retry };
}
