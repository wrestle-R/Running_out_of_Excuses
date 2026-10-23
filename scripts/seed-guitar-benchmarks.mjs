import { PrismaClient } from '@prisma/client';
// Repeatable sample benchmarks, never fictional human accounts or completed runs.
const version = 'v4';
let state = 20261023;
const random = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296; };
const samples = Array.from({length:200}, (_, i) => {
  const score = Array.from({length:10}, () => random() < .55 ? 1 : 0).reduce((a,b)=>a+b,0);
  return { sample_id:i+1, score, elapsed_ms:Math.round(18000+(10-score)*4000+random()*60000) };
});
const db = new PrismaClient({log:[]});
try {
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(214774, 1)::text`;
    await tx.$executeRaw`DELETE FROM public.blog_guitar_benchmarks WHERE version=${version}`;
    await tx.$executeRaw`INSERT INTO public.blog_guitar_benchmarks (version,sample_id,score,elapsed_ms)
      SELECT ${version},sample_id,score,elapsed_ms FROM jsonb_to_recordset(${JSON.stringify(samples)}::jsonb)
      AS samples(sample_id smallint,score smallint,elapsed_ms integer)`;
  },{timeout:30000});
  console.log(`Saved ${samples.length} labelled sample benchmarks for ${version}; real quiz runs retained.`);
} finally { await db.$disconnect(); }
