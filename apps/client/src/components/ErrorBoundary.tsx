import { Component, type ErrorInfo, type ReactNode } from 'react';
import { t } from '../i18n/pt-BR';

interface Props {
  /** Called when the learner leaves the error screen; the parent should show a working screen. */
  onReset: () => void;
  children: ReactNode;
}

interface State {
  failed: boolean;
}

/** Catches render errors in the screens so a bug shows a message instead of a blank page. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('Screen crashed', error, info.componentStack);
  }

  private reset = () => {
    this.setState({ failed: false });
    this.props.onReset();
  };

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="screen" role="alert">
        <h1>{t.error.title}</h1>
        <button type="button" className="primary" onClick={this.reset}>{t.error.home}</button>
      </main>
    );
  }
}
