import { describe, expect, it } from "vitest";
import { deriveAgentUrlKey, isUuidLike, normalizeAgentUrlKey } from "./agent-url-key.js";

describe("isUuidLike", () => {
  it("retourne true pour un UUID v4 valide", () => {
    expect(isUuidLike("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("retourne true pour un UUID v1 valide", () => {
    expect(isUuidLike("110e8400-e29b-11d4-a716-446655440000")).toBe(true);
  });

  it("retourne true pour un UUID avec des espaces en début/fin", () => {
    expect(isUuidLike("  550e8400-e29b-41d4-a716-446655440000  ")).toBe(true);
  });

  it("retourne false pour null", () => {
    expect(isUuidLike(null)).toBe(false);
  });

  it("retourne false pour undefined", () => {
    expect(isUuidLike(undefined)).toBe(false);
  });

  it("retourne false pour une chaîne vide", () => {
    expect(isUuidLike("")).toBe(false);
  });

  it("retourne false pour un texte quelconque", () => {
    expect(isUuidLike("mon-agent")).toBe(false);
  });

  it("retourne false pour un UUID malformé", () => {
    expect(isUuidLike("550e8400-e29b-41d4-a716-44665544000Z")).toBe(false);
  });
});

describe("normalizeAgentUrlKey", () => {
  it("retourne null si la valeur n'est pas une chaîne", () => {
    expect(normalizeAgentUrlKey(null)).toBeNull();
    expect(normalizeAgentUrlKey(undefined)).toBeNull();
  });

  it("retourne null pour une chaîne vide ou ne contenant que des espaces", () => {
    expect(normalizeAgentUrlKey("")).toBeNull();
    expect(normalizeAgentUrlKey("   ")).toBeNull();
  });

  it("met en minuscule et remplace les séparateurs par des tirets", () => {
    expect(normalizeAgentUrlKey("Mon Super Agent")).toBe("mon-super-agent");
  });

  it("supprime les tirets en début et fin de chaîne", () => {
    expect(normalizeAgentUrlKey("  -mon-agent-  ")).toBe("mon-agent");
  });

  it("remplace les caractères spéciaux par des tirets", () => {
    expect(normalizeAgentUrlKey("agent@test!123")).toBe("agent-test-123");
  });

  it("conserve les chiffres", () => {
    expect(normalizeAgentUrlKey("agent-007")).toBe("agent-007");
  });
});

describe("deriveAgentUrlKey", () => {
  it("utilise le nom principal s'il est valide", () => {
    expect(deriveAgentUrlKey("Mon Agent")).toBe("mon-agent");
  });

  it("utilise le fallback si le nom principal est null", () => {
    expect(deriveAgentUrlKey(null, "fallback-agent")).toBe("fallback-agent");
  });

  it("utilise le fallback si le nom principal est vide", () => {
    expect(deriveAgentUrlKey("", "backup")).toBe("backup");
  });

  it("retourne 'agent' si les deux valeurs sont invalides", () => {
    expect(deriveAgentUrlKey(null, null)).toBe("agent");
    expect(deriveAgentUrlKey("", "")).toBe("agent");
  });

  it("donne la priorité au nom principal sur le fallback", () => {
    expect(deriveAgentUrlKey("principal", "fallback")).toBe("principal");
  });
});
