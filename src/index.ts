/**
 * `@printee-network/logo-raster`
 *
 * Il logo caricato da chi personalizza un prodotto diventa il PNG dell'anteprima: raster, SVG, PDF e
 * .ai, con lo sfondo bianco disegnato nel file che si può togliere. Una libreria sola perché più app
 * fanno la stessa cosa, e con copie diverse divergevano.
 *
 * **Solo browser** (canvas, `Image`): il PNG esce già pronto da comporre. Le regole sui pixel
 * (`sfondo.ts`) e sullo stato (`stato.ts`) sono pure, o quasi, e si provano senza browser.
 */
export * from "./tipi";
export * from "./formati";
export { fondoBiancoDisegnato, statoSfondo, togliFondoBianco } from "./sfondo";
export * from "./stato";
export { ErroreLogo } from "./errori";
export type { OpzioniPdf, Pdfjs } from "./pdf";
export * from "./logo";
