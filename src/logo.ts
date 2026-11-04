import { nuovoCanvas } from "./canvas";
import { ErroreLogo } from "./errori";
import { isVettoriale } from "./formati";
import { disegnaPdf, type OpzioniPdf } from "./pdf";
import { statoSfondo, togliFondoBianco } from "./sfondo";
import type { Logo, LogoRaster, Pixels } from "./tipi";

export type OpzioniLogo = {
  /** Lato lungo massimo del PNG (px): loghi più grandi si riducono, i vettoriali si disegnano a questa misura. */
  latoLungo: number;
  /** Come leggere PDF e .ai. Senza, un PDF fallisce con un messaggio che chiede un'immagine. */
  pdf?: OpzioniPdf;
};

type Sorgente = { immagine: CanvasImageSource; larghezza: number; altezza: number; vettoriale: boolean };

const caricaImmagine = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new ErroreLogo("Il browser non riesce a mostrare questo file."));
    img.src = url;
  });

/** Un'immagine dal file. Un SVG è un vettoriale anche lui: si può portare a `latoLungo` senza sgranare. */
const caricaDaFile = async (file: File): Promise<Sorgente> => {
  const url = URL.createObjectURL(file);
  try {
    const img = await caricaImmagine(url);
    // Un SVG senza larghezza, altezza né viewBox non ha dimensioni: ne uscirebbe un PNG di 1 px.
    if (img.width === 0 || img.height === 0) {
      throw new ErroreLogo("Il file non dichiara le sue dimensioni: salvalo con larghezza e altezza.");
    }
    return { immagine: img, larghezza: img.width, altezza: img.height, vettoriale: file.type === "image/svg+xml" };
  } finally {
    URL.revokeObjectURL(url);
  }
};

const caricaDaPdf = async (file: File, { latoLungo, pdf }: OpzioniLogo): Promise<Sorgente> => {
  if (!pdf) throw new ErroreLogo("Qui i PDF non si possono mostrare: carica un PNG, JPG o SVG.");
  const canvas = await disegnaPdf(file, latoLungo, pdf);
  return { immagine: canvas, larghezza: canvas.width, altezza: canvas.height, vettoriale: true };
};

const pixelsDi = (contesto: CanvasRenderingContext2D, larghezza: number, altezza: number): Pixels => ({
  data: contesto.getImageData(0, 0, larghezza, altezza).data,
  larghezza,
  altezza,
});

const inPng = async (canvas: HTMLCanvasElement): Promise<LogoRaster> => {
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new ErroreLogo("Impossibile creare il PNG del logo."))),
      "image/png",
    ),
  );
  return { blob, url: URL.createObjectURL(blob), larghezza: canvas.width, altezza: canvas.height };
};

/**
 * Il «logo anteprima»: qualunque file supportato (raster, SVG, PDF/AI) diventa un PNG con il lato
 * lungo al massimo `latoLungo` (i vettoriali esattamente `latoLungo`), e si dice com'è il suo sfondo.
 * Il file ORIGINALE resta quello da stampare e si carica a parte.
 */
export async function creaLogoRaster(file: File, opzioni: OpzioniLogo): Promise<Logo> {
  const { immagine, larghezza: l, altezza: a, vettoriale } = isVettoriale(file)
    ? await caricaDaPdf(file, opzioni)
    : await caricaDaFile(file);
  const scala = opzioni.latoLungo / Math.max(l, a);
  const k = vettoriale ? scala : Math.min(1, scala);
  const larghezza = Math.max(1, Math.round(l * k));
  const altezza = Math.max(1, Math.round(a * k));

  const { canvas, contesto } = nuovoCanvas(larghezza, altezza);
  contesto.drawImage(immagine, 0, 0, larghezza, altezza);
  const sfondo = statoSfondo(pixelsDi(contesto, larghezza, altezza));
  return { ...(await inPng(canvas)), sfondo };
}

/**
 * Lo stesso logo senza il fondo bianco collegato ai bordi (vedi `sfondo.ts`). Un PNG nuovo, con il
 * suo object URL: quello di partenza resta valido, così si può tornare indietro.
 */
export async function logoSenzaSfondo(logo: LogoRaster): Promise<LogoRaster> {
  const img = await caricaImmagine(logo.url);
  const { canvas, contesto } = nuovoCanvas(logo.larghezza, logo.altezza);
  contesto.drawImage(img, 0, 0);
  const { pixels } = togliFondoBianco(pixelsDi(contesto, logo.larghezza, logo.altezza));
  const pulita = contesto.createImageData(pixels.larghezza, pixels.altezza);
  pulita.data.set(pixels.data);
  contesto.putImageData(pulita, 0, 0);
  return inPng(canvas);
}
