import { useEffect, useState } from 'react';
import { renderMei } from '../render/verovio';

interface Props {
  mei: string;
  className?: string;
}

export function Staff({ mei, className = 'staff' }: Props) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    renderMei(mei).then((result) => {
      if (alive) setSvg(result);
    });
    return () => {
      alive = false;
    };
  }, [mei]);

  return (
    <div
      className={className}
      data-testid="staff"
      aria-hidden="true"
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  );
}
