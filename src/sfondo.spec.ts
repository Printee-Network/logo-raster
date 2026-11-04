import { fondoBiancoDisegnato, statoSfondo, togliFondoBianco } from "./sfondo";
import type { Pixels } from "./tipi";

type Rgba = [number, number, number, number];
const BIANCO: Rgba = [255, 255, 255, 255];
const ROSSO: Rgba = [255, 0, 0, 255];
const TRASPARENTE: Rgba = [0, 0, 0, 0];

/** Un'immagine `lato × lato` di colore `fondo`, con dei rettangoli disegnati sopra in ordine. */
const immagine = (
  lato: number,
  fondo: Rgba,
  rettangoli: { x: number; y: number; l: number; a: number; colore: Rgba }[] = [],
): Pixels => {
  const data = new Uint8ClampedArray(lato * lato * 4);
  Array.from({ length: lato * lato }).forEach((_, i) => data.set(fondo, i * 4));
  rettangoli.forEach(({ x, y, l, a, colore }) =>
    Array.from({ length: a }).forEach((_, dy) =>
      Array.from({ length: l }).forEach((_, dx) => data.set(colore, ((y + dy) * lato + x + dx) * 4)),
    ),
  );
  return { data, larghezza: lato, altezza: lato };
};

const pixel = (p: Pixels, x: number, y: number) =>
  Array.from(p.data.slice((y * p.larghezza + x) * 4, (y * p.larghezza + x) * 4 + 4));

/** Quadrato rosso con un quadrato bianco dentro, su fondo bianco disegnato. */
const logoSuBianco = () =>
  immagine(20, BIANCO, [
    { x: 5, y: 5, l: 10, a: 10, colore: ROSSO },
    { x: 8, y: 8, l: 4, a: 4, colore: BIANCO },
  ]);

describe("statoSfondo", () => {
  it("bordi trasparenti: niente da togliere (il PDF che non disegna il foglio)", () => {
    const p = immagine(20, TRASPARENTE, [{ x: 5, y: 5, l: 10, a: 10, colore: ROSSO }]);
    expect(statoSfondo(p)).toBe("assente");
  });

  it("logo bianco su fondo trasparente: niente da togliere, il bianco resta", () => {
    const p = immagine(20, TRASPARENTE, [{ x: 5, y: 5, l: 10, a: 10, colore: BIANCO }]);
    expect(statoSfondo(p)).toBe("assente");
  });

  it("fondo bianco disegnato attorno a un logo colorato: si può togliere", () => {
    expect(statoSfondo(logoSuBianco())).toBe("bianco");
  });

  it("logo bianco su fondo bianco disegnato: togliendolo non resterebbe niente", () => {
    const p = immagine(20, BIANCO, [{ x: 5, y: 5, l: 10, a: 10, colore: BIANCO }]);
    expect(statoSfondo(p)).toBe("biancoSuBianco");
  });

  it("un logo colorato che riempie la pagina non ha fondo bianco", () => {
    expect(statoSfondo(immagine(20, ROSSO))).toBe("assente");
  });

  it("un logo piccolo su una pagina grande non è «bianco su bianco»", () => {
    // 20×10 pixel rossi su 400×400: lo 0,125% della pagina.
    const p = immagine(400, BIANCO, [{ x: 100, y: 100, l: 20, a: 10, colore: ROSSO }]);
    expect(statoSfondo(p)).toBe("bianco");
  });

  it("un bordo disegnato con un filo di trasparenza conta ancora", () => {
    const p = immagine(20, [255, 255, 255, 252], [{ x: 5, y: 5, l: 10, a: 10, colore: ROSSO }]);
    expect(fondoBiancoDisegnato(p)).toBe(true);
  });

  it("il bianco «sporco» dei JPG conta come bianco", () => {
    const p = immagine(20, [250, 247, 252, 255], [{ x: 5, y: 5, l: 10, a: 10, colore: ROSSO }]);
    expect(fondoBiancoDisegnato(p)).toBe(true);
  });
});

describe("togliFondoBianco", () => {
  it("toglie il fondo, lascia il logo e il bianco chiuso dentro il logo", () => {
    const { pixels } = togliFondoBianco(logoSuBianco());
    expect(pixel(pixels, 0, 0)[3]).toBe(0);
    expect(pixel(pixels, 19, 19)[3]).toBe(0);
    expect(pixel(pixels, 6, 6)).toEqual(ROSSO);
    expect(pixel(pixels, 10, 10)).toEqual(BIANCO);
  });

  it("non tocca i pixel di partenza", () => {
    const p = logoSuBianco();
    togliFondoBianco(p);
    expect(pixel(p, 0, 0)).toEqual(BIANCO);
  });

  it("il contorno sfumato diventa semitrasparente, senza alone chiaro", () => {
    // Rosa = rosso al 50% steso sul bianco: il pixel di passaggio fra logo e fondo.
    const p = immagine(20, BIANCO, [
      { x: 4, y: 5, l: 1, a: 10, colore: [255, 128, 128, 255] },
      { x: 5, y: 5, l: 10, a: 10, colore: ROSSO },
    ]);
    const [r, g, b, a] = pixel(togliFondoBianco(p).pixels, 4, 8);
    expect([r, g, b]).toEqual([255, 0, 0]);
    expect(a).toBeGreaterThan(120);
    expect(a).toBeLessThan(135);
  });

  it("il fondo non passa in diagonale fra due tratti che si toccano d'angolo", () => {
    // Un rombo di quattro pixel rossi che si toccano solo d'angolo, con un pixel bianco al centro:
    // con i vicini in diagonale il fondo ci entrerebbe.
    const punto = (x: number, y: number) => ({ x, y, l: 1, a: 1, colore: ROSSO });
    const p = immagine(5, BIANCO, [punto(2, 1), punto(1, 2), punto(3, 2), punto(2, 3)]);
    expect(pixel(togliFondoBianco(p).pixels, 2, 2)).toEqual(BIANCO);
    expect(pixel(togliFondoBianco(p).pixels, 1, 1)[3]).toBe(0);
  });

  it("dice quanti pixel restano visibili", () => {
    const p = immagine(20, BIANCO, [{ x: 5, y: 5, l: 10, a: 10, colore: ROSSO }]);
    expect(togliFondoBianco(p).visibili).toBe(100);
  });

  it("un logo pastello resta pieno anche sul contorno", () => {
    const PASTELLO: Rgba = [200, 230, 255, 255];
    const p = immagine(20, BIANCO, [{ x: 5, y: 5, l: 10, a: 10, colore: PASTELLO }]);
    const { pixels } = togliFondoBianco(p);
    expect(pixel(pixels, 5, 10)).toEqual(PASTELLO);
    expect(pixel(pixels, 10, 10)).toEqual(PASTELLO);
  });

  it("un contorno di 1 px di un altro colore resta com'è", () => {
    // Quadrato giallo con contorno nero di 1 px: il nero non è il giallo steso sul bianco.
    const NERO: Rgba = [0, 0, 0, 255];
    const p = immagine(20, BIANCO, [
      { x: 5, y: 5, l: 10, a: 10, colore: NERO },
      { x: 6, y: 6, l: 8, a: 8, colore: [255, 255, 0, 255] },
    ]);
    const { pixels } = togliFondoBianco(p);
    expect(pixel(pixels, 5, 10)).toEqual(NERO);
    expect(pixel(pixels, 10, 10)).toEqual([255, 255, 0, 255]);
  });

  it("un bordo sfumato su 2 px torna il colore del logo, semitrasparente", () => {
    // Strati 200 e 100 attorno a un nero: un tratto nero ridotto di scala.
    const p = immagine(20, BIANCO, [
      { x: 4, y: 4, l: 12, a: 12, colore: [200, 200, 200, 255] },
      { x: 5, y: 5, l: 10, a: 10, colore: [100, 100, 100, 255] },
      { x: 6, y: 6, l: 8, a: 8, colore: [0, 0, 0, 255] },
    ]);
    const { pixels } = togliFondoBianco(p);
    expect(pixel(pixels, 4, 10)).toEqual([0, 0, 0, 55]);
    expect(pixel(pixels, 5, 10)).toEqual([0, 0, 0, 155]);
    expect(pixel(pixels, 10, 10)).toEqual([0, 0, 0, 255]);
  });

  it("il bianco chiuso dietro un contorno di 1 px resta bianco (un timbro con l'anello vuoto)", () => {
    const p = immagine(24, BIANCO, [
      { x: 2, y: 2, l: 20, a: 20, colore: ROSSO },
      { x: 3, y: 3, l: 18, a: 18, colore: BIANCO },
      { x: 5, y: 5, l: 14, a: 14, colore: ROSSO },
    ]);
    const { pixels, visibili } = togliFondoBianco(p);
    expect(pixel(pixels, 3, 12)).toEqual(BIANCO);
    expect(pixel(pixels, 4, 12)).toEqual(BIANCO);
    expect(pixel(pixels, 2, 12)).toEqual(ROSSO);
    expect(visibili).toBe(400);
  });

  it("un gradiente sul bordo resta com'è", () => {
    // Da nero a grigio chiaro verso il bordo sinistro, pieno: non è una sfumatura sul bianco.
    const p = immagine(20, BIANCO, [
      ...[190, 170, 150, 130, 110, 90, 70, 50, 30, 10].map((g, n) => ({
        x: 5 + n, y: 5, l: 1, a: 10, colore: [g, g, g, 255] as Rgba,
      })),
    ]);
    const { pixels } = togliFondoBianco(p);
    expect(pixel(pixels, 5, 8)).toEqual([190, 190, 190, 255]);
    expect(pixel(pixels, 14, 8)).toEqual([10, 10, 10, 255]);
  });

  it("i pixel visibili sono gli stessi che conta lo stato", () => {
    const casi = [
      logoSuBianco(),
      immagine(20, BIANCO, [
        { x: 4, y: 4, l: 12, a: 12, colore: [200, 200, 200, 255] },
        { x: 6, y: 6, l: 8, a: 8, colore: [0, 0, 0, 255] },
      ]),
    ];
    casi.forEach((p) => {
      const { pixels, visibili } = togliFondoBianco(p);
      const contati = Array.from({ length: 400 }, (_, i) => pixels.data[i * 4 + 3]).filter((a) => a > 0).length;
      expect(contati).toBe(visibili);
    });
  });

  it("i pixel già semitrasparenti non si toccano", () => {
    // Rosa coerente col rosso: se fosse pieno diventerebbe rosso semitrasparente.
    const VELATO: Rgba = [255, 128, 128, 128];
    const p = immagine(20, BIANCO, [
      { x: 4, y: 5, l: 1, a: 10, colore: VELATO },
      { x: 5, y: 5, l: 10, a: 10, colore: ROSSO },
    ]);
    expect(pixel(togliFondoBianco(p).pixels, 4, 8)).toEqual(VELATO);
  });

  it("funziona anche su immagini di una riga o di un pixel", () => {
    expect(togliFondoBianco(immagine(1, BIANCO)).visibili).toBe(0);
    const riga = { data: new Uint8ClampedArray([...BIANCO, ...ROSSO, ...BIANCO]), larghezza: 3, altezza: 1 };
    expect(togliFondoBianco(riga).visibili).toBe(1);
  });
});
