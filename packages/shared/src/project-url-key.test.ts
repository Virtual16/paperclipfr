import { describe, expect, it } from "vitest";
import {
  deriveProjectUrlKey,
  hasNonAsciiContent,
  normalizeProjectUrlKey,
} from "./project-url-key.js";

describe("normalizeProjectUrlKey", () => {
  it("retourne null si la valeur n'est pas une chaîne", () => {
    expect(normalizeProjectUrlKey(null)).toBeNull();
    expect(normalizeProjectUrlKey(undefined)).toBeNull();
  });

  it("retourne null pour une chaîne vide ou ne contenant que des espaces", () => {
    expect(normalizeProjectUrlKey("")).toBeNull();
    expect(normalizeProjectUrlKey("   ")).toBeNull();
  });

  it("met en minuscule et remplace les séparateurs par des tirets", () => {
    expect(normalizeProjectUrlKey("Mon Super Projet")).toBe("mon-super-projet");
  });

  it("supprime les tirets en début et fin de chaîne", () => {
    expect(normalizeProjectUrlKey("  -mon-projet-  ")).toBe("mon-projet");
  });

  it("remplace les caractères non alphanumériques par des tirets", () => {
    expect(normalizeProjectUrlKey("projet@test!v2")).toBe("projet-test-v2");
  });

  it("conserve les chiffres et les lettres minuscules", () => {
    expect(normalizeProjectUrlKey("projet-alpha-v3")).toBe("projet-alpha-v3");
  });
});

describe("hasNonAsciiContent", () => {
  it("retourne false pour null ou undefined", () => {
    expect(hasNonAsciiContent(null)).toBe(false);
    expect(hasNonAsciiContent(undefined)).toBe(false);
  });

  it("retourne false pour une chaîne ASCII", () => {
    expect(hasNonAsciiContent("hello-world")).toBe(false);
  });

  it("retourne true pour une chaîne contenant des caractères non-ASCII", () => {
    expect(hasNonAsciiContent("café")).toBe(true);
    expect(hasNonAsciiContent("Ångström")).toBe(true);
    expect(hasNonAsciiContent("日本語")).toBe(true);
  });
});

describe("deriveProjectUrlKey", () => {
  it("utilise le nom principal s'il est ASCII valide", () => {
    expect(deriveProjectUrlKey("Mon Projet")).toBe("mon-projet");
  });

  it("utilise le fallback UUID si le nom est null", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    expect(deriveProjectUrlKey(null, uuid)).toBe("550e8400");
  });

  it("retourne 'project' si les deux sont invalides", () => {
    expect(deriveProjectUrlKey(null, null)).toBe("project");
    expect(deriveProjectUrlKey("", "")).toBe("project");
  });

  it("pour un nom non-ASCII, ajoute un suffixe UUID court si disponible", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    const result = deriveProjectUrlKey("café", uuid);
    // Le préfixe normalisé 'caf' doit être suivi du short ID
    expect(result).toMatch(/^caf.*550e8400$/);
  });

  it("pour un nom entièrement non-ASCII sans base, utilise le short ID seul", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    const result = deriveProjectUrlKey("日本語", uuid);
    expect(result).toBe("550e8400");
  });

  it("préfère le nom principal à un fallback valide", () => {
    expect(deriveProjectUrlKey("principal", "fallback")).toBe("principal");
  });

  it("utilise le fallback normalisé si le nom est vide", () => {
    expect(deriveProjectUrlKey("", "mon-fallback")).toBe("mon-fallback");
  });
});
