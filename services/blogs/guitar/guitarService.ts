import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import repertoire from "./repertoire.json";

export type Answer = { songId: string; answerId: string };
export type Submission = { runId: string; version: string; answers: Answer[]; elapsedMs?: number };
export class InvalidQuiz extends Error {}
export class RunConflict extends Error {}

export function validateSubmission(value: unknown): Submission {
  if (!value || typeof value !== "object") throw new InvalidQuiz();
  const body = value as Record<string, unknown>;
  if (typeof body.runId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.runId)) throw new InvalidQuiz();
  if (typeof body.version !== "string" || !Object.hasOwn(repertoire.versions, body.version)) throw new InvalidQuiz();
  const timed = body.version === "v4";
  if (timed && (typeof body.elapsedMs !== "number" || !Number.isInteger(body.elapsedMs) || body.elapsedMs < 0 || body.elapsedMs > 86400000)) throw new InvalidQuiz();
  const eligible = repertoire.versions[body.version as keyof typeof repertoire.versions];
  const total = repertoire.questionCounts[body.version as keyof typeof repertoire.questionCounts];
  if (!Array.isArray(body.answers) || body.answers.length !== total) throw new InvalidQuiz();
  const answers: Answer[] = body.answers.map((answer: unknown) => {
    if (!answer || typeof answer !== "object") throw new InvalidQuiz();
    const item = answer as Record<string, unknown>;
    if (typeof item.songId !== "string" || !eligible.includes(item.songId) || typeof item.answerId !== "string" || !repertoire.catalogue.includes(item.answerId)) throw new InvalidQuiz();
    return { songId: item.songId, answerId: item.answerId };
  });
  if (new Set(answers.map(a => a.songId)).size !== total) throw new InvalidQuiz();
  answers.sort((a, b) => a.songId.localeCompare(b.songId));
  return { runId: body.runId.toLowerCase(), version: body.version, answers, ...(timed ? {elapsedMs:body.elapsedMs as number} : {}) };
}

type SavedRun = { version: string; total: number; answers: Answer[]; elapsedMs: number | null; percentile: number | null; previousRuns: number; benchmarkRuns: number };

export async function saveQuiz(input: Submission) {
  return prisma.$transaction(tx => saveQuizWithTransaction(tx, input), { maxWait:5000, timeout:20000 });
}

export async function saveQuizWithTransaction(tx: Prisma.TransactionClient, input: Submission) {
  const total = repertoire.questionCounts[input.version as keyof typeof repertoire.questionCounts];
  const score = input.answers.filter(a => a.songId === a.answerId).length;
  const timed = input.version === "v4";
  const elapsedMs = timed ? input.elapsedMs! : null;
  const response = (run: {percentile:number|null;previousRuns:number;benchmarkRuns:number}) => timed
    ? {percentile:run.percentile,previousRuns:run.previousRuns,benchmarkRuns:run.benchmarkRuns}
    : {percentile:run.percentile,previousRuns:run.previousRuns};
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(214774, 1)::text AS lock`;
    const existing = await tx.$queryRaw<SavedRun[]>`SELECT version, total, answers, elapsed_ms AS "elapsedMs", percentile, previous_runs AS "previousRuns", benchmark_runs AS "benchmarkRuns" FROM public.blog_guitar_leaderboard WHERE run_id = ${input.runId}::uuid`;
    if (existing.length) {
      const saved = existing[0];
      if (saved.version !== input.version || saved.total !== total || saved.elapsedMs !== elapsedMs || saved.answers.length !== input.answers.length || saved.answers.some((a, i) => a.songId !== input.answers[i].songId || a.answerId !== input.answers[i].answerId)) throw new RunConflict();
      return response(saved);
    }
    const [stats] = await tx.$queryRaw<{ total: number; real: number; samples: number; below: number; equal: number }[]>`
      WITH comparisons AS (
        SELECT score, elapsed_ms, false AS sample FROM public.blog_guitar_leaderboard WHERE version = ${input.version}
        UNION ALL
        SELECT score, elapsed_ms, true AS sample FROM public.blog_guitar_benchmarks WHERE version = ${input.version}
      )
      SELECT count(*)::int AS total,
        count(*) FILTER (WHERE NOT sample)::int AS real,
        count(*) FILTER (WHERE sample)::int AS samples,
        count(*) FILTER (WHERE score < ${score} OR (score = ${score} AND ${timed} AND elapsed_ms > ${elapsedMs}::integer))::int AS below,
        count(*) FILTER (WHERE score = ${score} AND (NOT ${timed} OR elapsed_ms = ${elapsedMs}::integer))::int AS equal
      FROM comparisons`;
    const percentile = stats.total ? Math.round(100 * (stats.below + stats.equal / 2) / stats.total) : null;
    await tx.$executeRaw`INSERT INTO public.blog_guitar_leaderboard (run_id, version, score, total, answers, elapsed_ms, percentile, previous_runs, benchmark_runs)
      VALUES (${input.runId}::uuid, ${input.version}, ${score}, ${total}, ${JSON.stringify(input.answers)}::jsonb, ${elapsedMs}, ${percentile}, ${stats.real}, ${stats.samples})`;
    return response({percentile,previousRuns:stats.real,benchmarkRuns:stats.samples});
}
