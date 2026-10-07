import { useEffect, useState } from 'react';
import { renderMei } from '../render/verovio';

interface Props {
  mei: string;
  className?: string;
}

export function Staff({ mei, className = 'staff' }: Props) {
  // Keep the source MEI next to its SVG so a stale drawing is never shown for a new mei.
  const [rendered, setRendered] = useState<{ mei: string; svg: string } | null>(null);

  useEffect(() => {
    let alive = true;
    renderMei(mei)
      .then((svg) => {
        if (alive) setRendered({ mei, svg });
      })
      .catch((error: unknown) => {
        console.warn('Staff: could not render notation', error);
      });
    return () => {
      alive = false;
    };
  }, [mei]);

  const svg = rendered?.mei === mei ? rendered.svg : null;

  return (
    <div
      className={className}
      data-testid="staff"
      aria-hidden="true"
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  );
}
