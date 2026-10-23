import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/db", () => ({ prisma: {} }));
import { InvalidQuiz, validateSubmission } from "./guitarService";
import repertoire from "./repertoire.json";

const valid = () => ({ runId: "f1826582-b56c-4504-9710-32fb08995915", version: "v1", answers: ["shape", "blue", "dandelions", "snowman", "505"].map(songId => ({ songId, answerId: songId })) });
describe("quiz submission validation", () => {
  it("accepts ten distinct v3 answers while retaining five-question v1/v2 runs", () => {
    const answers = repertoire.versions.v3.slice(0, 10).map(songId => ({ songId, answerId: songId }));
    expect(validateSubmission({ ...valid(), version: "v3", answers }).answers).toHaveLength(10);
    expect(() => validateSubmission({ ...valid(), version: "v3" })).toThrow(InvalidQuiz);
    expect(() => validateSubmission({ ...valid(), version: "v3", answers: [...answers.slice(1), answers[1]] })).toThrow(InvalidQuiz);
    expect(() => validateSubmission({ ...valid(), version: "v2", answers })).toThrow(InvalidQuiz);
    expect(validateSubmission(valid()).answers).toHaveLength(5);
  });
  it("accepts all registered v2 questions and excludes metadata-only songs", () => {
    expect(new Set(repertoire.versions.v2).size).toBe(repertoire.versions.v2.length);
    for (const songId of repertoire.versions.v2) {
      const ids = [songId, ...repertoire.versions.v2.filter(id => id !== songId).slice(0, 4)];
      expect(validateSubmission({ ...valid(), version: "v2", answers: ids.map(id => ({ songId: id, answerId: id })) }).answers).toHaveLength(5);
      expect(repertoire.catalogue).toContain(songId);
    }
    expect(() => validateSubmission({ ...valid(), version: "v2", answers: [{ songId: "miracle", answerId: "miracle" }, ...valid().answers.slice(1)] })).toThrow(InvalidQuiz);
  });
  it("accepts a complete run and drops client-supplied scores and personal fields", () => {
    const input = validateSubmission({ ...valid(), score: 500, name: "Nobody" });
    expect(input.answers).toHaveLength(5);
    expect(input).not.toHaveProperty("score");
    expect(input).not.toHaveProperty("name");
    expect(validateSubmission({ ...valid(), answers: valid().answers.reverse() })).toEqual(input);
  });
  it.each([null, [], {}, { ...valid(), version: "unknown" }, { ...valid(), runId: "not-a-uuid" }, { ...valid(), answers: valid().answers.slice(1) }, { ...valid(), answers: Array(5).fill(valid().answers[0]) }, { ...valid(), answers: [...valid().answers.slice(1), { songId: "never-reviewed", answerId: "shape" }] }, { ...valid(), answers: [...valid().answers.slice(1), { songId: "shape", answerId: "made-up-song" }] }, { ...valid(), answers: [null, ...valid().answers.slice(1)] }])("rejects malformed, repeated or unknown questions: %j", input => {
    expect(() => validateSubmission(input)).toThrow(InvalidQuiz);
  });
});
