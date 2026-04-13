import { describe, expect, it } from "vitest";
import {
  getClosedIsolatedExecutionWorkspaceMessage,
  isClosedIsolatedExecutionWorkspace,
} from "./execution-workspace-guards.js";

describe("isClosedIsolatedExecutionWorkspace", () => {
  it("retourne false si le workspace est null", () => {
    expect(isClosedIsolatedExecutionWorkspace(null)).toBe(false);
  });

  it("retourne false si le workspace est undefined", () => {
    expect(isClosedIsolatedExecutionWorkspace(undefined)).toBe(false);
  });

  it("retourne false si le mode n'est pas isolated_workspace", () => {
    expect(
      isClosedIsolatedExecutionWorkspace({
        closedAt: new Date().toISOString(),
        mode: "shared_workspace",
        status: "active",
      }),
    ).toBe(false);
  });

  it("retourne true si le workspace est fermé (closedAt non null)", () => {
    expect(
      isClosedIsolatedExecutionWorkspace({
        closedAt: new Date().toISOString(),
        mode: "isolated_workspace",
        status: "active",
      }),
    ).toBe(true);
  });

  it("retourne true si le statut est 'archived'", () => {
    expect(
      isClosedIsolatedExecutionWorkspace({
        closedAt: null,
        mode: "isolated_workspace",
        status: "archived",
      }),
    ).toBe(true);
  });

  it("retourne true si le statut est 'cleanup_failed'", () => {
    expect(
      isClosedIsolatedExecutionWorkspace({
        closedAt: null,
        mode: "isolated_workspace",
        status: "cleanup_failed",
      }),
    ).toBe(true);
  });

  it("retourne false si le workspace est actif et non fermé", () => {
    expect(
      isClosedIsolatedExecutionWorkspace({
        closedAt: null,
        mode: "isolated_workspace",
        status: "active",
      }),
    ).toBe(false);
  });
});

describe("getClosedIsolatedExecutionWorkspaceMessage", () => {
  it("retourne un message contenant le nom du workspace", () => {
    const msg = getClosedIsolatedExecutionWorkspaceMessage({ name: "mon-workspace" });
    expect(msg).toContain("mon-workspace");
  });

  it("mentionne qu'il faut déplacer la tâche vers un workspace ouvert", () => {
    const msg = getClosedIsolatedExecutionWorkspaceMessage({ name: "ws-prod" });
    expect(msg.toLowerCase()).toMatch(/open workspace|workspace ouvert|move/i);
  });
});
