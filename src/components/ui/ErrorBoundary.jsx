import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[APP] Unhandled rendering error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-error-screen" role="alert">
          <div className="app-error-mark" aria-hidden="true">!</div>
          <p className="app-error-eyebrow">ITADOBRAS · PRODUCAO</p>
          <h1>O aplicativo encontrou um problema</h1>
          <p>Recarregue a tela para continuar. Seus dados salvos no sistema nao foram alterados.</p>
          <button type="button" onClick={() => window.location.reload()}>Recarregar aplicativo</button>
        </main>
      );
    }
    return this.props.children;
  }
}
