import createVerovioModule from 'verovio/wasm';
import { VerovioToolkit } from 'verovio/esm';

let toolkit: Promise<VerovioToolkit> | null = null;

function getToolkit(): Promise<VerovioToolkit> {
  toolkit ??= createVerovioModule().then((module) => {
    const tk = new VerovioToolkit(module);
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
  });
  return toolkit;
}

/** Renders a one-page MEI document to an SVG string. */
export async function renderMei(mei: string): Promise<string> {
  const tk = await getToolkit();
  tk.loadData(mei);
  return tk.renderToSVG(1);
}
