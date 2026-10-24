import { randomInt, randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { InvalidQuiz, RunConflict, saveQuizWithTransaction, type Answer } from "./guitarService";
import repertoire from "./repertoire.json";
import catalogue from "./song-catalogue.json";

export const SESSION_TOTALS = {v4:10,v5:7} as const;
export function sessionVersion(value:unknown):keyof typeof SESSION_TOTALS {
  if(!value||typeof value!=="object"||Array.isArray(value))throw new InvalidQuiz();
  const body=value as Record<string,unknown>;
  if(Object.keys(body).some(key=>key!=="version"))throw new InvalidQuiz();
  const version=body.version??"v4";
  if(version!=="v4"&&version!=="v5")throw new InvalidQuiz();
  return version;
}
type Comparison = {percentile:number|null;previousRuns:number;benchmarkRuns?:number};
type Session = {id:string;version:string;questions:string[];options:string[][];questionIndex:number;answers:Answer[];answeredAt:Date|null;elapsedMs:number;questionMs:number;result:Comparison|null};
const transactionOptions = {maxWait:5000,timeout:20000};
const shuffle = <T>(items:readonly T[]) => {
  const result=[...items];
  for(let i=result.length-1;i>0;i--){const j=randomInt(i+1);[result[i],result[j]]=[result[j],result[i]];}
  return result;
};
const publicQuestion = (s:Pick<Session,"questions"|"options"|"questionIndex">) => ({number:s.questionIndex+1,total:s.questions.length,songId:s.questions[s.questionIndex],options:s.options[s.questionIndex]});
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export class SessionUnavailable extends Error {}
export function validateSessionAction(runId:string,value:unknown,answer=false) {
  if(!uuid.test(runId)||!value||typeof value!=="object")throw new InvalidQuiz();
  const body=value as Record<string,unknown>;
  // No client clocks, question pools, scores or progress are accepted.
  const allowed=answer?["questionNumber","answerId"]:["questionNumber"];
  if(Object.keys(body).some(key=>!allowed.includes(key))||!Number.isInteger(body.questionNumber)||(body.questionNumber as number)<1||(body.questionNumber as number)>10)throw new InvalidQuiz();
  if(answer&&typeof body.answerId!=="string")throw new InvalidQuiz();
  return {questionNumber:body.questionNumber as number,answerId:body.answerId as string|undefined};
}
async function lockedSession(tx:Prisma.TransactionClient,id:string) {
  const [session]=await tx.$queryRaw<Session[]>`SELECT id,version,questions,options,question_index AS "questionIndex",answers,
    answered_at AS "answeredAt",elapsed_ms AS "elapsedMs",result,
    GREATEST(0,FLOOR(EXTRACT(EPOCH FROM(clock_timestamp()-question_started_at))*1000))::integer AS "questionMs"
    FROM public.blog_guitar_sessions WHERE id=${id}::uuid AND created_at>clock_timestamp()-interval '24 hours' FOR UPDATE`;
  if(!session)throw new SessionUnavailable();
  return session;
}
function feedback(session:Session,index:number,answers:Answer[],result:Comparison|null=session.result) {
  const score=answers.slice(0,index+1).filter(a=>a.songId===a.answerId).length;
  return {songId:session.questions[index],correct:answers[index].songId===answers[index].answerId,score,complete:index===session.questions.length-1,result:index===session.questions.length-1?result:null};
}
const titles=new Map(catalogue.map(song=>[song.id,song.title.toLowerCase().replace(/[’']/g,"").replace(/\s*[([].*$/,"").replace(/\s*-\s*(original|acoustic|live|remix).*$/,"").trim()]));
export function makeQuizOptions(id:string) {
  const related=repertoire.confusers[id as keyof typeof repertoire.confusers]||[];
  const candidates=[...shuffle(related),...shuffle(repertoire.catalogue.filter(other=>other!==id&&!related.includes(other)))];
  const seen=new Set([titles.get(id)]);
  const distinct=candidates.filter(other=>{const title=titles.get(other);if(seen.has(title))return false;seen.add(title);return true;});
  return shuffle([id,...distinct.slice(0,3)]);
}
export async function createQuizSession(version:keyof typeof SESSION_TOTALS="v4") {
  const questions=shuffle(repertoire.versions[version]).slice(0,SESSION_TOTALS[version]);
  const options=questions.map(makeQuizOptions);
  const id=randomUUID();
  await prisma.$executeRaw`INSERT INTO public.blog_guitar_sessions (id,version,questions,options)
    VALUES (${id}::uuid,${version},${JSON.stringify(questions)}::jsonb,${JSON.stringify(options)}::jsonb)`;
  return {runId:id,version,question:publicQuestion({questions,options,questionIndex:0})};
}
async function finishQuizAnswer(id:string,questionNumber:number,answerId:string) {
  return prisma.$transaction(async tx=>{
    const session=await lockedSession(tx,id),index=questionNumber-1;
    if(index<session.answers.length){
      if(session.answers[index].answerId!==answerId)throw new RunConflict();
      return feedback(session,index,session.answers);
    }
    if(index!==session.questionIndex||session.answeredAt||!session.options[index].includes(answerId))throw new InvalidQuiz();
    const answers=[...session.answers,{songId:session.questions[index],answerId}];
    const elapsedMs=Math.min(86400000,session.elapsedMs+session.questionMs);
    const complete=answers.length===session.questions.length;
    const result=complete?await saveQuizWithTransaction(tx,{runId:id,version:session.version,answers:[...answers].sort((a,b)=>a.songId.localeCompare(b.songId)),elapsedMs}):null;
    await tx.$executeRaw`UPDATE public.blog_guitar_sessions SET answers=${JSON.stringify(answers)}::jsonb,
      elapsed_ms=${elapsedMs},answered_at=clock_timestamp(),result=${result?JSON.stringify(result):null}::jsonb,
      completed_at=CASE WHEN ${complete} THEN clock_timestamp() ELSE NULL END WHERE id=${id}::uuid`;
    return feedback(session,index,answers,result);
  },transactionOptions);
}
// A single atomic statement handles normal answers and retries, avoiding a
// transaction's network round trips. The final answer still commits its result
// and session together in finishQuizAnswer.
export async function recordQuizAnswer(id:string,questionNumber:number,answerId:string) {
  const index=questionNumber-1;
  const [session]=await prisma.$queryRaw<Session[]>`
    WITH locked AS MATERIALIZED (
      SELECT * FROM public.blog_guitar_sessions
      WHERE id=${id}::uuid AND created_at>clock_timestamp()-interval '24 hours' FOR UPDATE
    ), updated AS (
      UPDATE public.blog_guitar_sessions s SET
        answers=l.answers||jsonb_build_array(jsonb_build_object('songId',l.questions->>${index}::integer,'answerId',${answerId}::text)),
        elapsed_ms=LEAST(86400000,l.elapsed_ms+GREATEST(0,FLOOR(EXTRACT(EPOCH FROM(clock_timestamp()-l.question_started_at))*1000))::integer),
        answered_at=clock_timestamp()
      FROM locked l WHERE s.id=l.id AND l.question_index=${index} AND l.answered_at IS NULL
        AND jsonb_array_length(l.answers)=${index} AND ${index}<jsonb_array_length(l.questions)-1
        AND (l.options->${index}::integer) ? ${answerId}
      RETURNING s.*
    ), snapshot AS (SELECT * FROM updated UNION ALL SELECT * FROM locked WHERE NOT EXISTS(SELECT 1 FROM updated))
    SELECT id,version,questions,options,question_index AS "questionIndex",answers,
      answered_at AS "answeredAt",elapsed_ms AS "elapsedMs",result,0 AS "questionMs" FROM snapshot`;
  if(!session)throw new SessionUnavailable();
  if(index<session.answers.length){
    if(session.answers[index].answerId!==answerId)throw new RunConflict();
    return feedback(session,index,session.answers);
  }
  if(index!==session.questionIndex||session.answeredAt||!session.options[index]?.includes(answerId))throw new InvalidQuiz();
  if(index!==session.questions.length-1)throw new InvalidQuiz();
  return finishQuizAnswer(id,questionNumber,answerId);
}
export async function nextQuizQuestion(id:string,questionNumber:number) {
  const [session]=await prisma.$queryRaw<Session[]>`
    WITH locked AS MATERIALIZED (
      SELECT * FROM public.blog_guitar_sessions
      WHERE id=${id}::uuid AND created_at>clock_timestamp()-interval '24 hours' FOR UPDATE
    ), updated AS (
      UPDATE public.blog_guitar_sessions s SET question_index=l.question_index+1,
        question_started_at=clock_timestamp(),answered_at=NULL
      FROM locked l WHERE s.id=l.id AND ${questionNumber}<jsonb_array_length(l.questions)
        AND l.question_index=${questionNumber}-1 AND jsonb_array_length(l.answers)=${questionNumber}
        AND l.answered_at IS NOT NULL
      RETURNING s.*
    ), snapshot AS (SELECT * FROM updated UNION ALL SELECT * FROM locked WHERE NOT EXISTS(SELECT 1 FROM updated))
    SELECT id,version,questions,options,question_index AS "questionIndex",answers,
      answered_at AS "answeredAt",elapsed_ms AS "elapsedMs",result,0 AS "questionMs" FROM snapshot`;
  if(!session)throw new SessionUnavailable();
  if(session.questionIndex!==questionNumber||session.answers.length!==questionNumber)throw new InvalidQuiz();
  return {question:publicQuestion(session)};
}
