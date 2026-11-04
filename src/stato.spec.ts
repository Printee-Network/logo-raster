import { conSenzaSfondo, conSfondo, logoInUso, sostituisciLogo, type LogoCaricato } from "./stato";
import type { Logo, LogoRaster } from "./tipi";

const raster = (url: string): LogoRaster => ({ blob: new Blob(), url, larghezza: 10, altezza: 10 });
const logo = (url: string): Logo => ({ ...raster(url), sfondo: "bianco" });

describe("stato del logo", () => {
  let revocati: string[];
  beforeEach(() => {
    revocati = [];
    jest.spyOn(URL, "revokeObjectURL").mockImplementation((u: string) => void revocati.push(u));
  });
  afterEach(() => jest.restoreAllMocks());

  it("in uso c'è la versione senza sfondo, se c'è", () => {
    const a = logo("a");
    expect(logoInUso(null)).toBeNull();
    expect(logoInUso({ logo: a, senzaSfondo: null })).toBe(a);
    const pulito = raster("a-pulito");
    expect(logoInUso({ logo: a, senzaSfondo: pulito })).toBe(pulito);
  });

  it("sostituire il logo revoca il vecchio e la sua versione senza sfondo", () => {
    const stato: LogoCaricato = { logo: logo("a"), senzaSfondo: raster("a-pulito") };
    const b = logo("b");
    expect(sostituisciLogo(stato, b)).toEqual({ logo: b, senzaSfondo: null });
    expect(revocati).toEqual(["a", "a-pulito"]);
    expect(sostituisciLogo(null, null)).toBeNull();
  });

  it("la versione senza sfondo di un logo che non c'è più si scarta", () => {
    const a = logo("a");
    const stato: LogoCaricato = { logo: logo("b"), senzaSfondo: null };
    expect(conSenzaSfondo(stato, a, raster("a-pulito"))).toBe(stato);
    expect(conSenzaSfondo(null, a, raster("a-pulito-2"))).toBeNull();
    expect(revocati).toEqual(["a-pulito", "a-pulito-2"]);
  });

  it("la versione senza sfondo del logo attuale entra, e si torna indietro", () => {
    const a = logo("a");
    const pulito = raster("a-pulito");
    const conPulito = conSenzaSfondo({ logo: a, senzaSfondo: null }, a, pulito);
    expect(conPulito).toEqual({ logo: a, senzaSfondo: pulito });
    expect(conSfondo(conPulito)).toEqual({ logo: a, senzaSfondo: null });
    expect(revocati).toEqual(["a-pulito"]);
  });
});
