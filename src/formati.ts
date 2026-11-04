/** Basta nome e tipo: un `File` va bene, e le regole si provano senza browser. */
type FileDescritto = { name: string; type: string };

/** Estensioni vettoriali gestite. Un `.ai` arriva spesso con `type` vuoto o postscript. */
const ESTENSIONI_VETTORIALI = ["pdf", "ai"];
const TIPI_VETTORIALI = ["application/pdf", "application/postscript"];

const estensione = (file: FileDescritto) => file.name.split(".").pop()?.toLowerCase() ?? "";

/** Un file che il browser sa disegnare da solo (PNG, JPG, WEBP, GIF, SVG…). */
export const isImmagine = (file: FileDescritto): boolean => file.type.startsWith("image/");

/** Un vettoriale di stampa (.pdf, .ai): si legge con pdf.js. */
export const isVettoriale = (file: FileDescritto): boolean =>
  !isImmagine(file) &&
  (ESTENSIONI_VETTORIALI.includes(estensione(file)) || TIPI_VETTORIALI.includes(file.type));

/** Un file che la libreria sa trasformare in logo. */
export const isLogoSupportato = (file: FileDescritto): boolean =>
  isImmagine(file) || isVettoriale(file);
