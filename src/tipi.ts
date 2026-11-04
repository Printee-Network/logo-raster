/** I pixel di un'immagine RGBA, riga per riga: la forma di `ImageData`, senza dipendere dal DOM. */
export type Pixels = {
  data: Uint8ClampedArray;
  larghezza: number;
  altezza: number;
};

/** Il PNG che l'anteprima mostra e che si compone sulla foto del prodotto. */
export type LogoRaster = {
  blob: Blob;
  /** Object URL dello stesso PNG: lo crea la libreria, lo revoca chi lo riceve (`revocaLogo`). */
  url: string;
  larghezza: number;
  altezza: number;
};

/**
 * Cosa c'è attorno al logo:
 * - `assente`: i bordi sono trasparenti (o colorati), non c'è niente da togliere;
 * - `bianco`: il file disegna un fondo bianco attorno al logo e si può togliere;
 * - `biancoSuBianco`: c'è un fondo bianco, ma togliendolo non resta niente: il logo è bianco sullo
 *   stesso bianco e i pixel non bastano a separarli. Serve il file senza fondo.
 */
export type StatoSfondo = "assente" | "bianco" | "biancoSuBianco";

/** Il logo pronto per l'anteprima, con lo stato del suo sfondo. */
export type Logo = LogoRaster & { sfondo: StatoSfondo };
