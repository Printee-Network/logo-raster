import { isImmagine, isLogoSupportato, isVettoriale } from "./formati";

const file = (name: string, type = "") => ({ name, type });

describe("formati", () => {
  it("riconosce i vettoriali anche dall'estensione, col tipo vuoto o postscript", () => {
    expect(isVettoriale(file("logo.pdf", "application/pdf"))).toBe(true);
    expect(isVettoriale(file("logo.AI"))).toBe(true);
    expect(isVettoriale(file("logo.ai", "application/postscript"))).toBe(true);
    expect(isVettoriale(file("senza-estensione", "application/pdf"))).toBe(true);
  });

  it("un'immagine non è un vettoriale, anche se si chiama .pdf", () => {
    expect(isVettoriale(file("logo.svg", "image/svg+xml"))).toBe(false);
    expect(isVettoriale(file("strano.pdf", "image/png"))).toBe(false);
    expect(isImmagine(file("logo.png", "image/png"))).toBe(true);
  });

  it("il resto non è supportato", () => {
    expect(isLogoSupportato(file("logo.docx", "application/vnd.openxmlformats"))).toBe(false);
    expect(isLogoSupportato(file("logo.jpg", "image/jpeg"))).toBe(true);
    expect(isLogoSupportato(file("logo.ai"))).toBe(true);
  });
});
