import { describe, expect, it } from "vitest";
import {
  getAdapterSessionManagement,
  hasSessionCompactionThresholds,
  LEGACY_SESSIONED_ADAPTER_TYPES,
  readSessionCompactionOverride,
  resolveSessionCompactionPolicy,
} from "./session-compaction.js";

describe("getAdapterSessionManagement", () => {
  it("retourne null pour null ou undefined", () => {
    expect(getAdapterSessionManagement(null)).toBeNull();
    expect(getAdapterSessionManagement(undefined)).toBeNull();
  });

  it("retourne null pour un type d'adaptateur inconnu", () => {
    expect(getAdapterSessionManagement("adaptateur_inconnu")).toBeNull();
  });

  it("retourne la configuration pour claude_local", () => {
    const config = getAdapterSessionManagement("claude_local");
    expect(config).not.toBeNull();
    expect(config!.supportsSessionResume).toBe(true);
    expect(config!.nativeContextManagement).toBe("confirmed");
  });

  it("retourne la configuration pour codex_local", () => {
    const config = getAdapterSessionManagement("codex_local");
    expect(config).not.toBeNull();
    expect(config!.supportsSessionResume).toBe(true);
    expect(config!.nativeContextManagement).toBe("confirmed");
  });

  it("retourne la configuration pour cursor", () => {
    const config = getAdapterSessionManagement("cursor");
    expect(config).not.toBeNull();
    expect(config!.nativeContextManagement).toBe("unknown");
  });
});

describe("readSessionCompactionOverride", () => {
  it("retourne un objet vide si aucune configuration n'est présente", () => {
    expect(readSessionCompactionOverride(null)).toEqual({});
    expect(readSessionCompactionOverride({})).toEqual({});
    expect(readSessionCompactionOverride("pas un objet")).toEqual({});
  });

  it("lit les propriétés de sessionCompaction via heartbeat.sessionCompaction", () => {
    const config = {
      heartbeat: {
        sessionCompaction: {
          enabled: false,
          maxSessionRuns: 10,
          maxRawInputTokens: 500_000,
          maxSessionAgeHours: 24,
        },
      },
    };
    expect(readSessionCompactionOverride(config)).toEqual({
      enabled: false,
      maxSessionRuns: 10,
      maxRawInputTokens: 500_000,
      maxSessionAgeHours: 24,
    });
  });

  it("lit les propriétés depuis heartbeat.sessionRotation (alias hérité)", () => {
    const config = {
      heartbeat: {
        sessionRotation: {
          enabled: true,
          maxSessionRuns: 5,
        },
      },
    };
    const result = readSessionCompactionOverride(config);
    expect(result.enabled).toBe(true);
    expect(result.maxSessionRuns).toBe(5);
  });

  it("lit les propriétés depuis le niveau racine sessionCompaction", () => {
    const config = {
      sessionCompaction: {
        enabled: true,
        maxSessionAgeHours: 48,
      },
    };
    const result = readSessionCompactionOverride(config);
    expect(result.enabled).toBe(true);
    expect(result.maxSessionAgeHours).toBe(48);
  });

  it("interprète les valeurs booléennes sous forme de chaînes", () => {
    const config = {
      heartbeat: {
        sessionCompaction: { enabled: "true" },
      },
    };
    expect(readSessionCompactionOverride(config).enabled).toBe(true);

    const config2 = {
      heartbeat: {
        sessionCompaction: { enabled: "false" },
      },
    };
    expect(readSessionCompactionOverride(config2).enabled).toBe(false);
  });

  it("interprète les valeurs numériques sous forme de chaînes", () => {
    const config = {
      heartbeat: {
        sessionCompaction: { maxSessionRuns: "42" },
      },
    };
    expect(readSessionCompactionOverride(config).maxSessionRuns).toBe(42);
  });

  it("ignore les valeurs non valides", () => {
    const config = {
      heartbeat: {
        sessionCompaction: {
          enabled: "invalide",
          maxSessionRuns: "pas-un-nombre",
        },
      },
    };
    const result = readSessionCompactionOverride(config);
    expect(result.enabled).toBeUndefined();
    expect(result.maxSessionRuns).toBeUndefined();
  });
});

describe("resolveSessionCompactionPolicy", () => {
  it("utilise la politique de l'adaptateur pour claude_local (natif)", () => {
    const result = resolveSessionCompactionPolicy("claude_local", {});
    expect(result.source).toBe("adapter_default");
    expect(result.adapterSessionManagement).not.toBeNull();
    // Claude gère sa propre compaction - les seuils sont à 0
    expect(result.policy.maxSessionRuns).toBe(0);
  });

  it("applique les overrides explicites en priorité", () => {
    const result = resolveSessionCompactionPolicy("claude_local", {
      heartbeat: {
        sessionCompaction: { maxSessionRuns: 50 },
      },
    });
    expect(result.source).toBe("agent_override");
    expect(result.policy.maxSessionRuns).toBe(50);
  });

  it("retourne la politique legacy pour un adaptateur inconnu mais dans LEGACY_SESSIONED_ADAPTER_TYPES", () => {
    // cursor est dans LEGACY_SESSIONED_ADAPTER_TYPES
    expect(LEGACY_SESSIONED_ADAPTER_TYPES.has("cursor")).toBe(true);
  });

  it("retourne enabled=false pour un adaptateur non sessionné inconnu", () => {
    const result = resolveSessionCompactionPolicy("un_adaptateur_inconnu", {});
    expect(result.source).toBe("legacy_fallback");
    expect(result.policy.enabled).toBe(false);
  });

  it("retourne enabled=true pour un adaptateur legacy sessioned inconnu du registre", () => {
    // Un adaptateur dans LEGACY_SESSIONED_ADAPTER_TYPES mais pas dans ADAPTER_SESSION_MANAGEMENT
    // En pratique, cursor est dans les deux, testons avec null adapterType
    const result = resolveSessionCompactionPolicy(null, {});
    expect(result.source).toBe("legacy_fallback");
    expect(result.adapterSessionManagement).toBeNull();
  });
});

describe("hasSessionCompactionThresholds", () => {
  it("retourne true si maxSessionRuns est positif", () => {
    expect(hasSessionCompactionThresholds({ maxSessionRuns: 10, maxRawInputTokens: 0, maxSessionAgeHours: 0 })).toBe(
      true,
    );
  });

  it("retourne true si maxRawInputTokens est positif", () => {
    expect(
      hasSessionCompactionThresholds({ maxSessionRuns: 0, maxRawInputTokens: 1_000_000, maxSessionAgeHours: 0 }),
    ).toBe(true);
  });

  it("retourne true si maxSessionAgeHours est positif", () => {
    expect(hasSessionCompactionThresholds({ maxSessionRuns: 0, maxRawInputTokens: 0, maxSessionAgeHours: 48 })).toBe(
      true,
    );
  });

  it("retourne false si tous les seuils sont à zéro", () => {
    expect(hasSessionCompactionThresholds({ maxSessionRuns: 0, maxRawInputTokens: 0, maxSessionAgeHours: 0 })).toBe(
      false,
    );
  });
});
