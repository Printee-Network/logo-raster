import { ErroreLogo } from "./errori";

/** Un canvas vuoto (trasparente) con il suo contesto 2D. */
export const nuovoCanvas = (larghezza: number, altezza: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = larghezza;
  canvas.height = altezza;
  const contesto = canvas.getContext("2d");
  if (!contesto) throw new ErroreLogo("Impossibile creare il canvas di disegno.");
  return { canvas, contesto };
};
