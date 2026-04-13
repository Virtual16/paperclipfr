import { describe, expect, it } from "vitest";
import {
  REDACTED_HOME_PATH_USER,
  redactHomePathUserSegments,
  redactHomePathUserSegmentsInValue,
  redactTranscriptEntryPaths,
} from "./log-redaction.js";

describe("redactHomePathUserSegments", () => {
  it("rédige le segment utilisateur dans les chemins Unix /Users/", () => {
    // "johndoe" = 7 chars → "j" + 6 étoiles
    const result = redactHomePathUserSegments("/Users/johndoe/projects/app");
    expect(result).toBe("/Users/j******/projects/app");
  });

  it("rédige le segment utilisateur dans les chemins Unix /home/", () => {
    const result = redactHomePathUserSegments("/home/alice/code");
    expect(result).toBe("/home/a****/code");
  });

  it("rédige le segment utilisateur dans les chemins Windows", () => {
    // "Bob" = 3 chars → "B" + 2 étoiles, séparateur Windows préservé
    const result = redactHomePathUserSegments("C:\\Users\\Bob\\Documents");
    expect(result).toBe("C:\\Users\\B**\\Documents");
  });

  it("ne modifie pas les chaînes sans chemins personnels", () => {
    const text = "/var/log/app.log";
    expect(redactHomePathUserSegments(text)).toBe(text);
  });

  it("gère plusieurs occurrences dans le même texte", () => {
    const result = redactHomePathUserSegments(
      "Chemin 1: /Users/alice/a et chemin 2: /home/bob/b",
    );
    expect(result).toContain("/Users/a****/a");
    expect(result).toContain("/home/b**/b");
  });

  it("ne modifie pas si l'option enabled est false", () => {
    const text = "/Users/johndoe/projects";
    expect(redactHomePathUserSegments(text, { enabled: false })).toBe(text);
  });

  it("rédige si l'option enabled est true ou absente", () => {
    const text = "/Users/johndoe/projects";
    expect(redactHomePathUserSegments(text, { enabled: true })).not.toBe(text);
    expect(redactHomePathUserSegments(text)).not.toBe(text);
  });

  it("masque un segment de 1 caractère avec au moins une étoile", () => {
    // "a" = 1 char → "a" + max(1, 0) étoiles = "a*"
    const result = redactHomePathUserSegments("/home/a/docs");
    expect(result).toBe("/home/a*/docs");
  });
});

describe("redactHomePathUserSegmentsInValue", () => {
  it("rédige les chaînes directement", () => {
    const result = redactHomePathUserSegmentsInValue("/Users/johndoe/file.txt");
    expect(result).toContain("/Users/j");
    expect(result).not.toContain("johndoe");
  });

  it("rédige récursivement dans les tableaux", () => {
    const result = redactHomePathUserSegmentsInValue([
      "/Users/alice/a",
      "/home/bob/b",
      "rien à rédiger",
    ]);
    expect(result[0]).not.toContain("alice");
    expect(result[1]).not.toContain("bob");
    expect(result[2]).toBe("rien à rédiger");
  });

  it("rédige récursivement dans les objets", () => {
    const result = redactHomePathUserSegmentsInValue({
      chemin: "/Users/charlie/workspace",
      autre: 42,
    });
    expect((result as Record<string, unknown>).chemin).not.toContain("charlie");
    expect((result as Record<string, unknown>).autre).toBe(42);
  });

  it("préserve les valeurs non-string et non-objet", () => {
    expect(redactHomePathUserSegmentsInValue(42)).toBe(42);
    expect(redactHomePathUserSegmentsInValue(true)).toBe(true);
    expect(redactHomePathUserSegmentsInValue(null)).toBeNull();
  });
});

describe("redactTranscriptEntryPaths", () => {
  it("rédige le champ text pour les entrées de type 'assistant'", () => {
    const entry = { kind: "assistant" as const, text: "Fichier: /Users/johndoe/app.ts" };
    const result = redactTranscriptEntryPaths(entry);
    expect(result.kind).toBe("assistant");
    expect((result as typeof entry).text).not.toContain("johndoe");
  });

  it("rédige le champ text pour les entrées de type 'user'", () => {
    const entry = { kind: "user" as const, text: "/home/alice/docs/readme.md" };
    const result = redactTranscriptEntryPaths(entry);
    expect((result as typeof entry).text).not.toContain("alice");
  });

  it("rédige les champs name et input pour les entrées de type 'tool_call'", () => {
    const entry = {
      kind: "tool_call" as const,
      name: "/Users/bob/tool",
      input: { path: "/Users/bob/file.txt" },
    };
    const result = redactTranscriptEntryPaths(entry);
    const r = result as typeof entry;
    expect(r.name).not.toContain("bob");
    expect((r.input as Record<string, unknown>).path).not.toContain("bob");
  });

  it("rédige le champ content pour les entrées de type 'tool_result'", () => {
    const entry = { kind: "tool_result" as const, content: "/home/alice/output.log" };
    const result = redactTranscriptEntryPaths(entry);
    expect((result as typeof entry).content).not.toContain("alice");
  });

  it("rédige les champs model et sessionId pour les entrées de type 'init'", () => {
    const entry = {
      kind: "init" as const,
      model: "/Users/charlie/model",
      sessionId: "/Users/charlie/session-123",
    };
    const result = redactTranscriptEntryPaths(entry);
    const r = result as typeof entry;
    expect(r.model).not.toContain("charlie");
    expect(r.sessionId).not.toContain("charlie");
  });

  it("rédige les champs text, subtype et errors pour les entrées de type 'result'", () => {
    const entry = {
      kind: "result" as const,
      text: "/Users/dave/output",
      subtype: "/home/dave/sub",
      errors: ["/home/dave/error.log"],
    };
    const result = redactTranscriptEntryPaths(entry);
    const r = result as typeof entry;
    expect(r.text).not.toContain("dave");
    expect(r.subtype).not.toContain("dave");
    expect(r.errors[0]).not.toContain("dave");
  });

  it("retourne l'entrée telle quelle pour un type inconnu", () => {
    // Un type non reconnu doit être retourné sans modification
    const entry = { kind: "unknown_kind" as "assistant", text: "/Users/eve/data" };
    const result = redactTranscriptEntryPaths(entry);
    expect(result).toEqual(entry);
  });
});
