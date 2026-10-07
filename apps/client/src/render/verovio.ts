import type { VerovioToolkit } from 'verovio/esm';

let toolkit: Promise<VerovioToolkit> | null = null;

async function createToolkit(): Promise<VerovioToolkit> {
  // Dynamic imports keep the ~8 MB wasm bundle out of the main chunk (still bundled locally, so it works offline).
  const [{ default: createVerovioModule }, { VerovioToolkit }] = await Promise.all([
    import('verovio/wasm'),
    import('verovio/esm'),
  ]);
  const tk = new VerovioToolkit(await createVerovioModule());
  tk.setOptions({
    scale: 50,
    adjustPageHeight: true,
    adjustPageWidth: true,
    header: 'none',
    footer: 'none',
    svgViewBox: true,
    pageMarginTop: 20,
    pageMarginBottom: 20,
    pageMarginLeft: 20,
    pageMarginRight: 20,
  });
  return tk;
}

function getToolkit(): Promise<VerovioToolkit> {
  toolkit ??= createToolkit().catch((error: unknown) => {
    toolkit = null; // do not cache a failed init: the next call retries
    throw error;
  });
  return toolkit;
}

/** Renders a one-page MEI document to an SVG string. */
export async function renderMei(mei: string): Promise<string> {
  const tk = await getToolkit();
  if (!tk.loadData(mei)) throw new Error('Verovio could not load the MEI document');
  return tk.renderToSVG(1);
}
