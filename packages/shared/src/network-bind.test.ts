import { describe, expect, it } from "vitest";
import {
  inferBindModeFromHost,
  isAllInterfacesHost,
  isLoopbackHost,
  resolveRuntimeBind,
  validateConfiguredBindMode,
} from "./network-bind.js";

describe("isLoopbackHost", () => {
  it("retourne true pour 127.0.0.1", () => {
    expect(isLoopbackHost("127.0.0.1")).toBe(true);
  });

  it("retourne true pour localhost", () => {
    expect(isLoopbackHost("localhost")).toBe(true);
  });

  it("retourne true pour ::1", () => {
    expect(isLoopbackHost("::1")).toBe(true);
  });

  it("retourne true pour les valeurs avec des espaces", () => {
    expect(isLoopbackHost("  127.0.0.1  ")).toBe(true);
    expect(isLoopbackHost("  LOCALHOST  ")).toBe(true);
  });

  it("retourne false pour null ou undefined", () => {
    expect(isLoopbackHost(null)).toBe(false);
    expect(isLoopbackHost(undefined)).toBe(false);
  });

  it("retourne false pour une chaîne vide", () => {
    expect(isLoopbackHost("")).toBe(false);
  });

  it("retourne false pour une IP publique", () => {
    expect(isLoopbackHost("192.168.1.1")).toBe(false);
    expect(isLoopbackHost("0.0.0.0")).toBe(false);
  });
});

describe("isAllInterfacesHost", () => {
  it("retourne true pour 0.0.0.0", () => {
    expect(isAllInterfacesHost("0.0.0.0")).toBe(true);
  });

  it("retourne true pour ::", () => {
    expect(isAllInterfacesHost("::")).toBe(true);
  });

  it("retourne false pour null ou undefined", () => {
    expect(isAllInterfacesHost(null)).toBe(false);
    expect(isAllInterfacesHost(undefined)).toBe(false);
  });

  it("retourne false pour une IP loopback", () => {
    expect(isAllInterfacesHost("127.0.0.1")).toBe(false);
  });

  it("retourne false pour une IP privée", () => {
    expect(isAllInterfacesHost("192.168.0.1")).toBe(false);
  });
});

describe("inferBindModeFromHost", () => {
  it("retourne 'loopback' pour null ou undefined", () => {
    expect(inferBindModeFromHost(null)).toBe("loopback");
    expect(inferBindModeFromHost(undefined)).toBe("loopback");
  });

  it("retourne 'loopback' pour 127.0.0.1", () => {
    expect(inferBindModeFromHost("127.0.0.1")).toBe("loopback");
  });

  it("retourne 'loopback' pour localhost", () => {
    expect(inferBindModeFromHost("localhost")).toBe("loopback");
  });

  it("retourne 'lan' pour 0.0.0.0", () => {
    expect(inferBindModeFromHost("0.0.0.0")).toBe("lan");
  });

  it("retourne 'lan' pour ::", () => {
    expect(inferBindModeFromHost("::")).toBe("lan");
  });

  it("retourne 'tailnet' si le host correspond au tailnetBindHost", () => {
    expect(inferBindModeFromHost("100.64.0.1", { tailnetBindHost: "100.64.0.1" })).toBe("tailnet");
  });

  it("retourne 'custom' pour une IP non reconnue", () => {
    expect(inferBindModeFromHost("10.0.0.1")).toBe("custom");
  });

  it("retourne 'custom' pour un hostname personnalisé", () => {
    expect(inferBindModeFromHost("mon-serveur.local")).toBe("custom");
  });
});

describe("validateConfiguredBindMode", () => {
  it("retourne une erreur si local_trusted n'utilise pas loopback", () => {
    const errors = validateConfiguredBindMode({
      deploymentMode: "local_trusted",
      deploymentExposure: "private",
      bind: "lan",
    });
    expect(errors).toContain("local_trusted requires server.bind=loopback");
  });

  it("ne retourne aucune erreur si local_trusted utilise loopback", () => {
    const errors = validateConfiguredBindMode({
      deploymentMode: "local_trusted",
      deploymentExposure: "private",
      bind: "loopback",
    });
    expect(errors).toHaveLength(0);
  });

  it("retourne une erreur si bind=custom sans customBindHost valide", () => {
    const errors = validateConfiguredBindMode({
      deploymentMode: "authenticated",
      deploymentExposure: "private",
      bind: "custom",
    });
    expect(errors).toContain("server.customBindHost is required when server.bind=custom");
  });

  it("ne retourne aucune erreur si bind=custom avec customBindHost valide", () => {
    const errors = validateConfiguredBindMode({
      deploymentMode: "authenticated",
      deploymentExposure: "private",
      bind: "custom",
      customBindHost: "10.0.0.5",
    });
    expect(errors).toHaveLength(0);
  });

  it("retourne une erreur pour tailnet avec deployment public/authenticated", () => {
    const errors = validateConfiguredBindMode({
      deploymentMode: "authenticated",
      deploymentExposure: "public",
      bind: "tailnet",
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/tailnet/);
  });

  it("accepte tailnet pour un déploiement authenticated/private", () => {
    const errors = validateConfiguredBindMode({
      deploymentMode: "authenticated",
      deploymentExposure: "private",
      bind: "tailnet",
    });
    expect(errors).toHaveLength(0);
  });
});

describe("resolveRuntimeBind", () => {
  it("résout le mode loopback avec l'IP 127.0.0.1", () => {
    const result = resolveRuntimeBind({ bind: "loopback" });
    expect(result.bind).toBe("loopback");
    expect(result.host).toBe("127.0.0.1");
    expect(result.errors).toHaveLength(0);
  });

  it("résout le mode lan avec l'IP 0.0.0.0", () => {
    const result = resolveRuntimeBind({ bind: "lan" });
    expect(result.bind).toBe("lan");
    expect(result.host).toBe("0.0.0.0");
    expect(result.errors).toHaveLength(0);
  });

  it("résout le mode custom avec un customBindHost valide", () => {
    const result = resolveRuntimeBind({ bind: "custom", customBindHost: "10.0.0.5" });
    expect(result.bind).toBe("custom");
    expect(result.host).toBe("10.0.0.5");
    expect(result.errors).toHaveLength(0);
  });

  it("retourne une erreur pour custom sans customBindHost", () => {
    const result = resolveRuntimeBind({ bind: "custom" });
    expect(result.bind).toBe("custom");
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("résout le mode tailnet avec le tailnetBindHost", () => {
    const result = resolveRuntimeBind({ bind: "tailnet", tailnetBindHost: "100.64.0.1" });
    expect(result.bind).toBe("tailnet");
    expect(result.host).toBe("100.64.0.1");
    expect(result.errors).toHaveLength(0);
  });

  it("retourne une erreur pour tailnet sans tailnetBindHost", () => {
    const result = resolveRuntimeBind({ bind: "tailnet" });
    expect(result.bind).toBe("tailnet");
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("infère le mode bind depuis l'host si bind est absent", () => {
    const result = resolveRuntimeBind({ host: "127.0.0.1" });
    expect(result.bind).toBe("loopback");
    expect(result.host).toBe("127.0.0.1");
  });
});
