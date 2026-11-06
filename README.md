# @printee-network/logo-raster

Il logo caricato da chi personalizza un prodotto diventa il **PNG dell'anteprima**: immagini (PNG,
JPG, WEBP, SVG…), PDF e `.ai`, portati a un lato lungo massimo, con lo **sfondo bianco disegnato nel
file** che si può togliere. Solo browser (canvas, `Image`); le regole sui pixel sono pure e si provano
senza.

Si installa da GitHub a tag: `github:Printee-Network/logo-raster#vX.Y.Z`.

Il file da stampare resta sempre l'**originale**: il PNG serve solo a posizionare la grafica e a
comporla sulla foto del prodotto.

## Uso

```ts
import {
  conSenzaSfondo, creaLogoRaster, logoInUso, logoSenzaSfondo, sostituisciLogo, type LogoCaricato,
} from "@printee-network/logo-raster";

const [stato, setStato] = useState<LogoCaricato | null>(null);

const logo = await creaLogoRaster(file, {
  latoLungo: 2000,
  pdf: { caricaPdfjs: () => import("pdfjs-dist/legacy/build/pdf.mjs"), worker: "/pdf.worker.min.mjs" },
});
setStato((attuale) => sostituisciLogo(attuale, logo));

// logo.sfondo: "assente" | "bianco" | "biancoSuBianco"
const pulito = await logoSenzaSfondo(logo);
setStato((attuale) => conSenzaSfondo(attuale, logo, pulito)); // scartato se intanto il logo è cambiato

const daMostrare = logoInUso(stato);
```

Senza l'opzione `pdf` i PDF falliscono con un messaggio che chiede un'immagine. Con `pdf`, l'app
installa `pdfjs-dist` e copia il worker in `public/` dal suo `postinstall`. Si usa la build `legacy` di
pdf.js, perché quella normale funziona solo sulle ultime versioni dei browser; il comando copia il worker
della stessa build:

```json
"postinstall": "copia-worker-pdf"
```

## Cosa c'è dentro

| Funzione | Cosa fa |
|---|---|
| `creaLogoRaster` | il file diventa un PNG con il lato lungo al massimo `latoLungo`, con lo stato dello sfondo |
| `logoSenzaSfondo` | lo stesso PNG senza il fondo bianco collegato ai bordi; quello di partenza resta valido |
| `sostituisciLogo`, `conSenzaSfondo`, `conSfondo`, `logoInUso`, `revocaLogo` | lo stato «logo + versione senza sfondo» per gli aggiornamenti di stato, con la revoca degli object URL |
| `statoSfondo` | `assente` (bordi trasparenti o colorati), `bianco` (si può togliere), `biancoSuBianco` (togliendolo non resterebbe quasi niente) |
| `togliFondoBianco`, `fondoBiancoDisegnato` | le regole sui pixel, pure |
| `isImmagine`, `isVettoriale`, `isLogoSupportato` | che file è, da nome e tipo |
| `ErroreLogo` | errore con un messaggio da mostrare a chi ha caricato il file |

## Lo sfondo

- **PDF e `.ai`** si disegnano su fondo trasparente: di solito il foglio non è disegnato e resta solo
  il logo, con i bordi esatti dei vettori. Un logo bianco resta bianco.
- **Fondo bianco disegnato** (un rettangolo sotto il logo, o un JPG con il fondo bianco): si riconosce
  dai bordi e si toglie il bianco collegato ai bordi. Il bianco chiuso dentro il logo resta; il
  contorno sfumato diventa semitrasparente, senza alone, mentre un logo chiaro resta pieno. Non si toglie da solo: un riquadro bianco
  può far parte della grafica, decide chi carica il logo.
- **Logo bianco su fondo bianco disegnato**: i pixel non bastano a separarli (`biancoSuBianco`).
  Serve il file senza fondo.
- **Il contorno** si ripulisce solo dove è davvero il colore del logo steso sul bianco, fino a 2 px dal
  fondo e con un interno piatto: un tratto di un altro colore (un contorno nero attorno a un giallo),
  un gradiente e il bianco chiuso dietro un contorno sottile restano come sono. I tratti stretti
  (sotto i 6 px circa, il testo piccolo), i pallini pieni sotto i 14 px e gli spigoli di forme ruotate
  non hanno sempre un interno piatto e possono tenere qualche pixel chiaro.
- **Foto o scansioni del logo dentro file vettoriali: non supportate.** Il vettoriale va generato
  nativamente.
- **Errori:** quelli che dipendono dal file (`ErroreLogo`) hanno un messaggio per chi l'ha caricato;
  gli altri (worker di pdf.js mancante, file che si rompe durante il disegno) risalgono così come sono
  e il loro testo non va mostrato.
- **Mentre si toglie lo sfondo** il comando va spento: vedi `stato.ts`.

## Repository pubblico

Questo repository è pubblico: serve a installarlo senza credenziali nei processi di build.
**Niente domini, URL, nomi di servizi interni o segreti**, né nel codice né nei commenti né nei test:
solo valori fittizi (`example.com`, `127.0.0.1`).
