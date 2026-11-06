import { nuovoCanvas } from "./canvas";
import { ErroreLogo } from "./errori";

/**
 * La prima pagina di un PDF (o di un .ai) disegnata su un canvas, per l'anteprima.
 *
 * **Solo anteprima.** Il file da stampare resta l'ORIGINALE: questo raster vive nel browser e serve a
 * posizionare la grafica e a comporla su una foto.
 *
 * **Anche gli .ai.** Dalla versione 9 di Illustrator un `.ai` salvato con «Crea file compatibile con
 * PDF» (l'impostazione predefinita) è un PDF valido, e pdf.js lo apre. Gli .ai in PostScript puro
 * (molto vecchi) no: si fallisce con un messaggio che dice come risalvarli.
 *
 * **Sfondo trasparente.** pdf.js di suo dipinge la pagina di bianco prima di disegnare, e quel bianco
 * finiva attorno al logo come un riquadro. Il foglio di un PDF non è disegnato: con lo sfondo
 * trasparente resta solo ciò che il file contiene, con i bordi esatti dei vettori, e un logo bianco
 * resta bianco. Se invece il file disegna un rettangolo bianco sotto il logo, quello si vede: è nel
 * file, e lo riconosce `statoSfondo`.
 *
 * **pdf.js lo passa chi chiama** (`caricaPdfjs`): è pesante, ogni app lo installa nella versione che
 * vuole e lo carica solo quando arriva un PDF; la libreria non lo importa.
 */

/** La parte di pdf.js che serve qui. Il modulo `pdfjs-dist` la soddisfa così com'è. */
export type Pdfjs = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument(sorgente: { data: ArrayBuffer }): {
    promise: Promise<DocumentoPdf>;
    destroy(): Promise<void>;
  };
};

type DocumentoPdf = {
  numPages: number;
  getPage(numero: number): Promise<PaginaPdf>;
};

type VistaPdf = { width: number; height: number };

type PaginaPdf = {
  getViewport(parametri: { scale: number }): VistaPdf;
  render(parametri: {
    canvas: HTMLCanvasElement;
    canvasContext: CanvasRenderingContext2D;
    // È la vista avuta da `getViewport`: il suo tipo vero lo dichiara pdf.js e cambia fra le versioni.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    viewport: any;
    background: string;
  }): { promise: Promise<unknown> };
};

export type OpzioniPdf = {
  /** Es. `() => import("pdfjs-dist")`. */
  caricaPdfjs: () => Promise<Pdfjs>;
  /**
   * Percorso assoluto del worker servito dall'app (es. `/pdf.worker.min.mjs`, copiato in `public/` dal
   * comando `copia-worker-pdf`). Non `new URL(..., import.meta.url)`: dipende dal bundler e fallisce a
   * runtime senza rompere il build.
   */
  worker: string;
};

/**
 * Gli errori di pdf.js che dipendono dal file, con il messaggio per chi l'ha caricato. Gli altri (es.
 * il worker che non si trova) sono errori dell'app e risalgono così come sono.
 */
const ERRORI_DEL_FILE: Record<string, string> = {
  InvalidPDFException:
    "Il file non è leggibile come PDF. Se è un .ai, va salvato da Illustrator con l'opzione «Crea file compatibile con PDF».",
  PasswordException: "Il PDF è protetto da password: serve il file senza protezione.",
};

const erroreDelFile = (errore: unknown): unknown => {
  const messaggio = ERRORI_DEL_FILE[(errore as { name?: string } | null)?.name ?? ""];
  return messaggio ? new ErroreLogo(messaggio) : errore;
};

/**
 * Disegna la prima pagina con il lato lungo di `latoLungo` px, su fondo trasparente. La scala segue
 * la pagina in tutte e due le direzioni: una tavola piccola non esce sgranata, una enorme non produce
 * un canvas oltre i limiti del browser.
 */
export async function disegnaPdf(
  file: Blob,
  latoLungo: number,
  { caricaPdfjs, worker }: OpzioniPdf,
): Promise<HTMLCanvasElement> {
  const pdfjs = await caricaPdfjs();
  pdfjs.GlobalWorkerOptions.workerSrc = worker;

  const caricamento = pdfjs.getDocument({ data: await file.arrayBuffer() });
  const documento = await caricamento.promise.catch((errore: unknown) => {
    throw erroreDelFile(errore);
  });
  try {
    if (documento.numPages === 0) throw new ErroreLogo("Il file non contiene pagine.");
    const pagina = await documento.getPage(1);
    const base = pagina.getViewport({ scale: 1 });
    if (!(base.width > 0 && base.height > 0)) throw new ErroreLogo("La prima pagina del file è vuota.");
    const vista = pagina.getViewport({ scale: latoLungo / Math.max(base.width, base.height) });

    // Per difetto: una riga o colonna coperta solo in parte resterebbe semitrasparente, e un fondo
    // bianco disegnato non si riconoscerebbe più dai bordi. Il margine assorbe gli arrotondamenti
    // (595,28 pt × scala dà 1999,9999…: senza, 1999 px e un ricampionamento inutile dopo).
    const perDifetto = (n: number) => Math.max(1, Math.floor(n + 1e-6));
    const { canvas, contesto } = nuovoCanvas(perDifetto(vista.width), perDifetto(vista.height));
    await pagina.render({
      canvas,
      canvasContext: contesto,
      viewport: vista,
      background: "rgba(0, 0, 0, 0)",
    }).promise;
    return canvas;
  } finally {
    // Il canvas è già dipinto: il documento nel worker non serve più. Se la chiusura fallisce non
    // deve coprire l'errore vero né far fallire un disegno riuscito.
    await caricamento.destroy().catch(() => undefined);
  }
}
