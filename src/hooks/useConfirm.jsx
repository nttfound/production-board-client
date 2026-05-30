/**
 * useConfirm.jsx
 * Hook que transforma o ConfirmDialog em uma Promise, igual ao window.confirm,
 * mas sem bloquear o renderer do Electron e com visual dark-mode.
 *
 * Uso:
 *   const { confirm, ConfirmUI } = useConfirm();
 *
 *   // No JSX do componente:
 *   {ConfirmUI}
 *
 *   // Para confirmar uma ação:
 *   const ok = await confirm({
 *     message: 'Excluir este card?',
 *     confirmLabel: 'Excluir',
 *     danger: true,
 *   });
 *   if (!ok) return;
 *   // ... prosseguir com a ação
 */

import React, { useState, useCallback, useRef } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';

export function useConfirm() {
  const [state, setState] = useState(null); // null = fechado
  const resolveRef = useRef(null);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState(typeof options === 'string' ? { message: options } : options);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setState(null);
    resolveRef.current?.(true);
  }, []);

  const handleCancel = useCallback(() => {
    setState(null);
    resolveRef.current?.(false);
  }, []);

  const ConfirmUI = state ? (
    <ConfirmDialog
      message={state.message}
      detail={state.detail}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      danger={state.danger}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  return { confirm, ConfirmUI };
}
