import { randomInt, randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { InvalidQuiz, RunConflict, saveQuizWithTransaction, type Answer } from "./guitarService";
import repertoire from "./repertoire.json";
import catalogue from "./song-catalogue.json";

const VERSION = "v4", TOTAL = 10;
type Comparison = {percentile:number|null;previousRuns:number;benchmarkRuns?:number};
type Session = {id:string;version:string;questions:string[];options:string[][];questionIndex:number;answers:Answer[];answeredAt:Date|null;elapsedMs:number;questionMs:number;result:Comparison|null};
const transactionOptions = {maxWait:5000,timeout:20000};
const shuffle = <T>(items:readonly T[]) => {
  const result=[...items];
  for(let i=result.length-1;i>0;i--){const j=randomInt(i+1);[result[i],result[j]]=[result[j],result[i]];}
  return result;
};
const publicQuestion = (s:Pick<Session,"questions"|"options"|"questionIndex">) => ({number:s.questionIndex+1,total:TOTAL,songId:s.questions[s.questionIndex],options:s.options[s.questionIndex]});
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export class SessionUnavailable extends Error {}
export function validateSessionAction(runId:string,value:unknown,answer=false) {
  if(!uuid.test(runId)||!value||typeof value!=="object")throw new InvalidQuiz();
  const body=value as Record<string,unknown>;
  // No client clocks, question pools, scores or progress are accepted.
  const allowed=answer?["questionNumber","answerId"]:["questionNumber"];
  if(Object.keys(body).some(key=>!allowed.includes(key))||!Number.isInteger(body.questionNumber)||(body.questionNumber as number)<1||(body.questionNumber as number)>TOTAL)throw new InvalidQuiz();
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
  return {songId:session.questions[index],correct:answers[index].songId===answers[index].answerId,score,complete:index===TOTAL-1,result:index===TOTAL-1?result:null};
}
const titles=new Map(catalogue.map(song=>[song.id,song.title.toLowerCase().replace(/[’']/g,"").replace(/\s*[([].*$/,"").replace(/\s*-\s*(original|acoustic|live|remix).*$/,"").trim()]));
export function makeQuizOptions(id:string) {
  const related=repertoire.confusers[id as keyof typeof repertoire.confusers]||[];
  const candidates=[...shuffle(related),...shuffle(repertoire.catalogue.filter(other=>other!==id&&!related.includes(other)))];
  const seen=new Set([titles.get(id)]);
  const distinct=candidates.filter(other=>{const title=titles.get(other);if(seen.has(title))return false;seen.add(title);return true;});
  return shuffle([id,...distinct.slice(0,3)]);
}
export async function createQuizSession() {
  const questions=shuffle(repertoire.versions.v4).slice(0,TOTAL);
  const options=questions.map(makeQuizOptions);
  const id=randomUUID();
  await prisma.$executeRaw`INSERT INTO public.blog_guitar_sessions (id,version,questions,options)
    VALUES (${id}::uuid,${VERSION},${JSON.stringify(questions)}::jsonb,${JSON.stringify(options)}::jsonb)`;
  return {runId:id,version:VERSION,question:publicQuestion({questions,options,questionIndex:0})};
}
export async function recordQuizAnswer(id:string,questionNumber:number,answerId:string) {
  return prisma.$transaction(async tx=>{
    const session=await lockedSession(tx,id),index=questionNumber-1;
    if(index<session.answers.length){
      if(session.answers[index].answerId!==answerId)throw new RunConflict();
      return feedback(session,index,session.answers);
    }
    if(index!==session.questionIndex||session.answeredAt||!session.options[index].includes(answerId))throw new InvalidQuiz();
    const answers=[...session.answers,{songId:session.questions[index],answerId}];
    const elapsedMs=Math.min(86400000,session.elapsedMs+session.questionMs);
    const complete=answers.length===TOTAL;
    const result=complete?await saveQuizWithTransaction(tx,{runId:id,version:session.version,answers:[...answers].sort((a,b)=>a.songId.localeCompare(b.songId)),elapsedMs}):null;
    await tx.$executeRaw`UPDATE public.blog_guitar_sessions SET answers=${JSON.stringify(answers)}::jsonb,
      elapsed_ms=${elapsedMs},answered_at=clock_timestamp(),result=${result?JSON.stringify(result):null}::jsonb,
      completed_at=CASE WHEN ${complete} THEN clock_timestamp() ELSE NULL END WHERE id=${id}::uuid`;
    return feedback(session,index,answers,result);
  },transactionOptions);
}
export async function nextQuizQuestion(id:string,questionNumber:number) {
  return prisma.$transaction(async tx=>{
    const session=await lockedSession(tx,id);
    // A retried next request must return the same question without resetting its clock.
    if(session.questionIndex===questionNumber&&session.answers.length===questionNumber)return {question:publicQuestion(session)};
    if(questionNumber>=TOTAL||session.questionIndex!==questionNumber-1||session.answers.length!==questionNumber||!session.answeredAt)throw new InvalidQuiz();
    await tx.$executeRaw`UPDATE public.blog_guitar_sessions SET question_index=question_index+1,
      question_started_at=clock_timestamp(),answered_at=NULL WHERE id=${id}::uuid`;
    session.questionIndex++;
    return {question:publicQuestion(session)};
  },transactionOptions);
}
