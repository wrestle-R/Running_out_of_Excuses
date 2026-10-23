import { prisma } from "@/lib/db";
import repertoire from "./repertoire.json";

export type Answer = { songId: string; answerId: string };
export type Submission = { runId: string; version: string; answers: Answer[] };
export class InvalidQuiz extends Error {}
export class RunConflict extends Error {}

export function validateSubmission(value: unknown): Submission {
  if (!value || typeof value !== "object") throw new InvalidQuiz();
  const body = value as Record<string, unknown>;
  if (typeof body.runId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.runId)) throw new InvalidQuiz();
  if (typeof body.version !== "string" || !Object.hasOwn(repertoire.versions, body.version)) throw new InvalidQuiz();
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
  // Canonical order makes retries independent of question ordering.
  answers.sort((a, b) => a.songId.localeCompare(b.songId));
  return { runId: body.runId.toLowerCase(), version: body.version, answers };
}

type SavedRun = { version: string; total: number; answers: Answer[]; percentile: number | null; previousRuns: number };

export async function saveQuiz(input: Submission) {
  const total = repertoire.questionCounts[input.version as keyof typeof repertoire.questionCounts];
  const score = input.answers.filter(a => a.songId === a.answerId).length;
  return prisma.$transaction(async tx => {
    // Serialize the comparison and insertion across processes, not just this server.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(214774, 1)::text AS lock`;
    const existing = await tx.$queryRaw<SavedRun[]>`SELECT version, total, answers, percentile, previous_runs AS "previousRuns" FROM public.blog_guitar_leaderboard WHERE run_id = ${input.runId}::uuid`;
    if (existing.length) {
      const saved = existing[0];
      if (saved.version !== input.version || saved.total !== total || saved.answers.length !== input.answers.length || saved.answers.some((a, i) => a.songId !== input.answers[i].songId || a.answerId !== input.answers[i].answerId)) throw new RunConflict();
      return { percentile: saved.percentile, previousRuns: saved.previousRuns };
    }
    const [stats] = await tx.$queryRaw<{ total: number; below: number; equal: number }[]>`
      SELECT count(*)::int AS total,
        count(*) FILTER (WHERE score < ${score})::int AS below,
        count(*) FILTER (WHERE score = ${score})::int AS equal
      FROM public.blog_guitar_leaderboard WHERE version = ${input.version}`;
    const percentile = stats.total ? Math.round(100 * (stats.below + stats.equal / 2) / stats.total) : null;
    await tx.$executeRaw`INSERT INTO public.blog_guitar_leaderboard (run_id, version, score, total, answers, percentile, previous_runs)
      VALUES (${input.runId}::uuid, ${input.version}, ${score}, ${total}, ${JSON.stringify(input.answers)}::jsonb, ${percentile}, ${stats.total})`;
    return { percentile, previousRuns: stats.total };
  }, { maxWait: 5000, timeout: 20000 });
}
