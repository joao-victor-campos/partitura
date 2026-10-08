import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

function Boom({ explode }: { explode: boolean }) {
  if (explode) throw new Error('boom');
  return <p>tudo certo</p>;
}

describe('ErrorBoundary', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows a message and a way back home when a child throws, then recovers', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onReset = vi.fn();
    const { rerender } = render(
      <ErrorBoundary onReset={onReset}>
        <Boom explode />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Algo deu errado.')).toBeInTheDocument();

    // The parent swaps the broken screen out when told to go home.
    rerender(
      <ErrorBoundary onReset={onReset}>
        <Boom explode={false} />
      </ErrorBoundary>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Voltar ao início' }));
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.getByText('tudo certo')).toBeInTheDocument();
  });
});
