import { optionsResponse } from "@/lib/server/http";
import { recordQuizAnswer,validateSessionAction } from "@/services/blogs/guitar/sessionService";
import { readQuizAction,quizResponse } from "@/services/blogs/guitar/sessionHttp";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export const OPTIONS=optionsResponse;
export async function POST(request:Request,{params}:{params:Promise<{runId:string}>}) {
  return quizResponse(async()=>{const{runId}=await params;const action=validateSessionAction(runId,await readQuizAction(request),true);return recordQuizAnswer(runId,action.questionNumber,action.answerId!);});
}
