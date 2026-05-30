/**
 * ErrorBoundary.jsx
 * Captura erros de render em qualquer componente filho.
 * Sem isso, um erro em ProductionCard ou ChatPanel derruba TODA a aplicação.
 *
 * Uso:
 *   <ErrorBoundary>
 *     <ComponenteQuePoderiaFalhar />
 *   </ErrorBoundary>
 *
 *   <ErrorBoundary fallback={<p>Erro customizado</p>}>
 *     ...
 *   </ErrorBoundary>
 */

import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    // Log estruturado — substituir por Sentry/Datadog em produção
    console.error('[ErrorBoundary] Erro capturado:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ error: null, errorInfo: null });
  };

  render() {
    const { error } = this.state;
    const { fallback, children } = this.props;

    if (!error) return children;

    // Fallback customizado via prop
    if (fallback) return fallback;

    // UI padrão de recuperação
    return (
      <div
        style={{
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          gap:            '12px',
          padding:        '2rem',
          color:          '#ef4444',
          background:     '#1a0a0a',
          borderRadius:   '8px',
          border:         '1px solid #3a1a1a',
          margin:         '1rem',
        }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>

        <p style={{ fontSize: '14px', fontWeight: 500 }}>
          Algo deu errado nesta seção.
        </p>
        <p style={{ fontSize: '12px', color: '#888', textAlign: 'center', maxWidth: '320px' }}>
          {error?.message || 'Erro desconhecido'}
        </p>

        <button
          onClick={this.handleReset}
          style={{
            marginTop:     '4px',
            padding:       '6px 16px',
            fontSize:      '12px',
            background:    '#1e1e1e',
            color:         '#ccc',
            border:        '1px solid #333',
            borderRadius:  '6px',
            cursor:        'pointer',
          }}
        >
          Tentar novamente
        </button>
      </div>
    );
  }
}
