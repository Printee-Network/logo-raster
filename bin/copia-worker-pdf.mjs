#!/usr/bin/env node
/**
 * Copia il worker di pdf.js in `public/` dell'app, così si carica da un percorso assoluto stabile
 * (`/pdf.worker.min.mjs`). Si lancia dal `postinstall` dell'app: il worker resta allineato alla
 * versione di `pdfjs-dist` installata lì.
 *
 * Perché non `new URL("pdfjs-dist/...", import.meta.url)`: dipende dalla risoluzione del bundler e
 * fallisce a runtime senza rompere il build.
 */
import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

// pdf.js si cerca dall'app che lancia il comando, non da questa libreria.
const require = createRequire(join(process.cwd(), "package.json"));

try {
  const pdfjs = dirname(require.resolve("pdfjs-dist/package.json"));
  const destinazione = join(process.cwd(), "public");
  await mkdir(destinazione, { recursive: true });
  await copyFile(join(pdfjs, "build", "pdf.worker.min.mjs"), join(destinazione, "pdf.worker.min.mjs"));
  console.log("[copia-worker-pdf] copiato in public/pdf.worker.min.mjs");
} catch (errore) {
  // Non blocca l'installazione: senza worker fallisce solo il caricamento di un PDF, con un errore
  // esplicito; il resto dell'app funziona.
  console.warn("[copia-worker-pdf] copia non riuscita:", errore.message);
}
