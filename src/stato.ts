import type { Logo, LogoRaster } from "./tipi";

/**
 * Il logo caricato e, se lo si è tolto, la sua versione senza sfondo: **uno stato solo**, così
 * l'anteprima non può mai mescolare due loghi. Le funzioni sono pensate per gli aggiornamenti di stato
 * (`setStato((attuale) => …)`): leggono lo stato del momento e revocano gli object URL che escono di
 * scena. Revocare due volte lo stesso URL non fa danni.
 *
 * Mentre si toglie lo sfondo il chiamante spegne il comando: un «ripristina» fra la richiesta e il
 * risultato verrebbe superato dal risultato stesso, perché il logo è ancora quello.
 */
export type LogoCaricato = { logo: Logo; senzaSfondo: LogoRaster | null };

/** Il PNG da mostrare e da comporre: senza sfondo se lo si è tolto. */
export const logoInUso = (stato: LogoCaricato | null): LogoRaster | null =>
  stato ? (stato.senzaSfondo ?? stato.logo) : null;

/** Libera gli object URL dello stato (alla chiusura, allo smontaggio). */
export const revocaLogo = (stato: LogoCaricato | null): void =>
  [stato?.logo, stato?.senzaSfondo].forEach((l) => l && URL.revokeObjectURL(l.url));

/** Un logo nuovo (o nessuno) al posto di quello attuale. */
export const sostituisciLogo = (attuale: LogoCaricato | null, nuovo: Logo | null): LogoCaricato | null => {
  revocaLogo(attuale);
  return nuovo ? { logo: nuovo, senzaSfondo: null } : null;
};

/**
 * La versione senza sfondo, arrivata per il logo `diPartenza`. Se intanto il logo è cambiato (o è
 * stato tolto), arriva tardi: si scarta e si revoca.
 */
export const conSenzaSfondo = (
  attuale: LogoCaricato | null,
  diPartenza: Logo,
  pulito: LogoRaster,
): LogoCaricato | null => {
  if (attuale?.logo !== diPartenza) {
    URL.revokeObjectURL(pulito.url);
    return attuale;
  }
  if (attuale.senzaSfondo && attuale.senzaSfondo !== pulito) URL.revokeObjectURL(attuale.senzaSfondo.url);
  return { ...attuale, senzaSfondo: pulito };
};

/** Si torna al logo con lo sfondo. */
export const conSfondo = (attuale: LogoCaricato | null): LogoCaricato | null => {
  if (attuale?.senzaSfondo) URL.revokeObjectURL(attuale.senzaSfondo.url);
  return attuale && { ...attuale, senzaSfondo: null };
};
