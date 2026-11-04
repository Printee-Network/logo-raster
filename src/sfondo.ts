import type { Pixels, StatoSfondo } from "./tipi";

/**
 * Lo sfondo bianco disegnato attorno al logo: riconoscerlo e toglierlo, sui pixel.
 *
 * **Quando serve.** Un PDF di solito non disegna il foglio: letto su fondo trasparente resta solo il
 * logo, e qui non c'è niente da fare (`assente`). Alcuni file invece disegnano un rettangolo bianco
 * sotto il logo (export da editor online o da programmi d'ufficio), e lo stesso vale per un JPG con il
 * fondo bianco: quel bianco è nel file e finirebbe sul prodotto come un riquadro.
 *
 * **Come.** Si toglie il bianco collegato ai bordi dell'immagine, partendo dai bordi. Il bianco chiuso
 * dentro il logo (l'interno di una «O», un quadrato bianco dentro uno colorato) non tocca i bordi e
 * resta. Sul contorno i pixel di passaggio fra logo e fondo diventano semitrasparenti invece di
 * lasciare un alone chiaro.
 *
 * **Non lo si fa da soli.** Un riquadro bianco può far parte della grafica (un badge bianco da stampare
 * su un tessuto scuro): chi carica il logo decide se toglierlo.
 *
 * **Fuori portata, di proposito:** foto o scansioni del logo dentro file vettoriali non sono
 * supportate (bordi sfumati, rumore, fondi non uniformi): il vettoriale va generato nativamente.
 */

/**
 * Sopra questa soglia, su tutti e tre i canali, un pixel conta come bianco (assorbe il rumore dei JPG).
 * Un quasi bianco pieno collegato ai bordi va via con il fondo: è il prezzo di riconoscere i fondi
 * «sporchi».
 */
const SOGLIA_BIANCO = 240;

/** Da qui in su un pixel conta come pieno: tollera i bordi disegnati con un filo di trasparenza. */
const ALFA_PIENO = 250;

/** Quanti px dal fondo può essere largo un bordo sfumato (quello di un tratto ridotto di scala). */
const LARGHEZZA_SFUMATURA = 2;

/** Fin dove si cerca, verso l'interno, il colore pieno del logo. */
const PROFONDITA_INTERNO = 3;

/** Quanto le coperture dei canali possono scostarsi fra loro in una miscela vera con il bianco. */
const TOLLERANZA_COPERTURA = 0.15;

/** Quanto un canale può scendere sotto quello del colore interno restando una miscela col bianco. */
const TOLLERANZA_CANALE = 8;

/** Quanta parte del bordo deve essere bianca piena perché il fondo sia disegnato. */
const BORDO_BIANCO_MINIMO = 0.9;

/** Sotto questi pixel visibili, togliere il fondo vorrebbe dire togliere tutto (anche un logo piccolo ne ha di più). */
const VISIBILI_MINIMI = 50;

/** Un colore interno quasi bianco non dice quanto il contorno sia sfumato: lì il contorno resta com'è. */
const DISTACCO_MINIMO = 16;

const alfa = (data: Uint8ClampedArray, i: number) => data[i * 4 + 3];

/** Pieno: il pixel non è già semitrasparente. */
const pieno = (data: Uint8ClampedArray, i: number) => alfa(data, i) >= ALFA_PIENO;

/** Un canale abbastanza lontano dal bianco da misurare una copertura. */
const lontanoDalBianco = (v: number) => 255 - v >= DISTACCO_MINIMO;

/** Pieno e bianco: il pixel `i` (indice del pixel, non del byte). */
const biancoPieno = (data: Uint8ClampedArray, i: number): boolean =>
  pieno(data, i) &&
  data[i * 4] >= SOGLIA_BIANCO &&
  data[i * 4 + 1] >= SOGLIA_BIANCO &&
  data[i * 4 + 2] >= SOGLIA_BIANCO;

/** Gli indici dei pixel del bordo, ciascuno una volta sola. */
const pixelDelBordo = ({ larghezza, altezza }: Pixels): number[] => {
  const orizzontali = Array.from({ length: larghezza }, (_, x) => [x, (altezza - 1) * larghezza + x]);
  const verticali = Array.from({ length: Math.max(0, altezza - 2) }, (_, y) => [
    (y + 1) * larghezza,
    (y + 1) * larghezza + larghezza - 1,
  ]);
  return [...new Set([...orizzontali, ...verticali].flat())];
};

/**
 * Il primo dei quattro vicini del pixel `i` (sinistra, destra, sopra, sotto) che sta dentro
 * l'immagine e soddisfa `vale`, o -1. Srotolato e senza array: si chiama milioni di volte per immagine.
 */
const trovaVicino = (
  i: number,
  larghezza: number,
  altezza: number,
  vale: (j: number) => boolean,
): number => {
  const x = i % larghezza;
  if (x > 0 && vale(i - 1)) return i - 1;
  if (x < larghezza - 1 && vale(i + 1)) return i + 1;
  if (i >= larghezza && vale(i - larghezza)) return i - larghezza;
  if (i < larghezza * (altezza - 1) && vale(i + larghezza)) return i + larghezza;
  return -1;
};

/** Tutti e quattro i vicini dentro l'immagine. */
const perOgniVicino = (i: number, larghezza: number, altezza: number, fai: (j: number) => void): void => {
  trovaVicino(i, larghezza, altezza, (j) => {
    fai(j);
    return false;
  });
};

/** Il file disegna un fondo bianco: quasi tutto il bordo è bianco pieno. */
export const fondoBiancoDisegnato = (pixels: Pixels): boolean => {
  const bordo = pixelDelBordo(pixels);
  const bianchi = bordo.filter((i) => biancoPieno(pixels.data, i)).length;
  return bordo.length > 0 && bianchi / bordo.length >= BORDO_BIANCO_MINIMO;
};

/**
 * Il bianco collegato ai bordi, come maschera (1 = fondo). Riempimento a macchia d'olio dai pixel del
 * bordo, sui quattro vicini: in diagonale il fondo non "passa" fra due tratti del logo che si toccano
 * d'angolo.
 */
const mascheraDelFondo = (pixels: Pixels): Uint8Array => {
  const { data, larghezza, altezza } = pixels;
  const fondo = new Uint8Array(larghezza * altezza);
  const coda = new Int32Array(larghezza * altezza);
  let testa = 0;
  let fine = 0;
  const visita = (i: number) => {
    if (fondo[i] === 0 && biancoPieno(data, i)) {
      fondo[i] = 1;
      coda[fine++] = i;
    }
  };
  pixelDelBordo(pixels).forEach(visita);
  while (testa < fine) perOgniVicino(coda[testa++], larghezza, altezza, visita);
  return fondo;
};

/**
 * Il bordo sfumato del logo, a strati: il primo sono i pixel pieni che toccano il fondo, il secondo
 * quelli che toccano il primo, fino a `LARGHEZZA_SFUMATURA`. Solo lì un pixel può essere il colore del
 * logo steso sul bianco; i pixel già semitrasparenti non lo sono e restano fuori.
 */
const stratiDelBordo = (data: Uint8ClampedArray, fondo: Uint8Array, larghezza: number, altezza: number): Uint8Array[] => {
  const giaPreso = new Uint8Array(larghezza * altezza);
  return Array.from({ length: LARGHEZZA_SFUMATURA }).reduce<Uint8Array[]>((strati) => {
    const precedente = strati[strati.length - 1] ?? fondo;
    const strato = new Uint8Array(larghezza * altezza);
    for (let i = 0; i < larghezza * altezza; i++) {
      if (
        fondo[i] === 0 && giaPreso[i] === 0 && pieno(data, i) &&
        trovaVicino(i, larghezza, altezza, (j) => precedente[j] === 1) >= 0
      ) {
        strato[i] = 1;
        giaPreso[i] = 1;
      }
    }
    return [...strati, strato];
  }, []);
};

/**
 * Quanto il pixel `p` copre il bianco, se è il colore `c` steso sul bianco; `null` se non lo è (un
 * contorno di un altro colore, un logo chiaro, un pixel più scuro dell'interno). Ogni canale lontano
 * dal bianco deve dare la stessa copertura, gli altri devono stare fra `c` e il bianco.
 */
const coperturaSuBianco = (p: number[], c: number[]): number | null => {
  const k = [0, 1, 2].reduce((a, b) => (c[b] < c[a] ? b : a));
  const distacco = 255 - c[k];
  if (!lontanoDalBianco(c[k])) return null;
  const copertura = (255 - p[k]) / distacco;
  const coerente = [0, 1, 2].every((ch) =>
    lontanoDalBianco(c[ch])
      ? Math.abs((255 - p[ch]) / (255 - c[ch]) - copertura) <= TOLLERANZA_COPERTURA
      : p[ch] >= c[ch] - TOLLERANZA_CANALE
  );
  return coerente && copertura <= 1 + TOLLERANZA_COPERTURA ? Math.min(1, copertura) : null;
};

const colore = (data: Uint8ClampedArray, i: number) => [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];

const ugualeEntro = (a: number[], b: number[], tolleranza: number) =>
  a.every((v, ch) => Math.abs(v - b[ch]) <= tolleranza);

/**
 * Il colore pieno del logo di cui il pixel `i` è una sfumatura: il più vicino fra quelli verso l'interno
 * (fino a `PROFONDITA_INTERNO` px, nelle quattro direzioni) per cui `i` è davvero una miscela col
 * bianco. L'interno deve essere piatto (uguale al pixel dopo, nella stessa direzione): in un gradiente
 * il colore accanto non è quello «pieno», e il pixel resta com'è. Nessuno → `null`.
 */
const sfumaturaDi = (
  data: Uint8ClampedArray,
  i: number,
  escluso: (j: number) => boolean,
  larghezza: number,
  altezza: number,
): { colore: number[]; copertura: number } | null => {
  const x = i % larghezza;
  const y = Math.floor(i / larghezza);
  const p = colore(data, i);
  const interno = (cx: number, cy: number): number => {
    if (cx < 0 || cy < 0 || cx >= larghezza || cy >= altezza) return -1;
    const j = cy * larghezza + cx;
    return escluso(j) || !pieno(data, j) ? -1 : j;
  };
  for (let d = 1; d <= PROFONDITA_INTERNO; d++) {
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const j = interno(x + dx * d, y + dy * d);
      const dopo = interno(x + dx * (d + 1), y + dy * (d + 1));
      if (j < 0 || dopo < 0) continue;
      const c = colore(data, j);
      if (!ugualeEntro(c, colore(data, dopo), TOLLERANZA_CANALE)) continue;
      const copertura = coperturaSuBianco(p, c);
      if (copertura !== null) return { colore: c, copertura };
    }
  }
  return null;
};

/**
 * Il contorno senza alone: ogni pixel del bordo sfumato che è il colore del logo steso sul bianco
 * torna quel colore, con la copertura come alfa. Dal secondo strato in poi solo se la sfumatura
 * cresce verso l'interno, cioè se il vicino dello strato prima è sfumato e copre meno: un contorno
 * pieno di 1 px non è un alone, e il bianco chiuso subito dietro (un anello vuoto in un timbro)
 * resta bianco. Un contorno di un altro colore, un logo chiaro, un gradiente e i tratti stretti, che
 * non hanno un interno piatto, restano come sono.
 */
const contornoSenzaAlone = (data: Uint8ClampedArray, fondo: Uint8Array, larghezza: number, altezza: number) => {
  const strati = stratiDelBordo(data, fondo, larghezza, altezza);
  const originale = new Uint8ClampedArray(data);
  const nelBordo = (j: number) => strati.some((strato) => strato[j] === 1);
  const escluso = (j: number) => fondo[j] === 1 || nelBordo(j);
  // La copertura data a ogni pixel del bordo; -1 = rimasto com'era (pieno).
  const coperture = new Float32Array(larghezza * altezza).fill(-1);
  strati.forEach((strato, n) => {
    const precedente = strati[n - 1];
    strato.forEach((v, i) => {
      const sfumatura = v === 1 ? sfumaturaDi(originale, i, escluso, larghezza, altezza) : null;
      const cresce = (copertura: number) =>
        !precedente ||
        trovaVicino(i, larghezza, altezza, (j) =>
          precedente[j] === 1 && coperture[j] >= 0 && coperture[j] < 1 && coperture[j] <= copertura
        ) >= 0;
      if (!sfumatura || !cresce(sfumatura.copertura)) return;
      coperture[i] = sfumatura.copertura;
      data.set([...sfumatura.colore, Math.round(255 * sfumatura.copertura)], i * 4);
    });
  });
};

/**
 * Quanti pixel restano visibili togliendo il fondo: quelli fuori dal fondo e non trasparenti. Basta la
 * maschera: il contorno può azzerare al più qualche pixel quasi bianco accanto a un interno saturo,
 * un errore di pochi pixel contro una soglia (`VISIBILI_MINIMI`) che serve a riconoscere il «niente».
 */
const contaVisibili = (data: Uint8ClampedArray, fondo: Uint8Array): number => {
  let visibili = 0;
  for (let i = 0; i < fondo.length; i++) if (fondo[i] === 0 && alfa(data, i) > 0) visibili++;
  return visibili;
};

/**
 * Toglie il fondo bianco collegato ai bordi. Restituisce pixel nuovi (l'originale non si tocca) e
 * quanti pixel restano visibili.
 */
export const togliFondoBianco = (pixels: Pixels): { pixels: Pixels; visibili: number } => {
  const { larghezza, altezza } = pixels;
  const fondo = mascheraDelFondo(pixels);
  const data = new Uint8ClampedArray(pixels.data);
  contornoSenzaAlone(data, fondo, larghezza, altezza);
  fondo.forEach((v, i) => v === 1 && (data[i * 4 + 3] = 0));
  return { pixels: { data, larghezza, altezza }, visibili: contaVisibili(pixels.data, fondo) };
};

/**
 * Lo stato dello sfondo, dalle stesse regole che poi lo tolgono (stessa maschera, stesso conteggio).
 * In ordine, e valutate solo se serve: la maschera è il passo costoso.
 */
export const statoSfondo = (pixels: Pixels): StatoSfondo => {
  const regole: [() => boolean, StatoSfondo][] = [
    [() => !fondoBiancoDisegnato(pixels), "assente"],
    [() => contaVisibili(pixels.data, mascheraDelFondo(pixels)) < VISIBILI_MINIMI, "biancoSuBianco"],
  ];
  return regole.find(([vale]) => vale())?.[1] ?? "bianco";
};
