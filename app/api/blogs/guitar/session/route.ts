import { optionsResponse } from "@/lib/server/http";
import { createQuizSession, sessionVersion } from "@/services/blogs/guitar/sessionService";
import { quizResponse, readQuizAction } from "@/services/blogs/guitar/sessionHttp";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export const OPTIONS=optionsResponse;
export async function POST(request:Request) {
  return quizResponse(async()=>{
    const body=await readQuizAction(request),version=sessionVersion(body);
    return createQuizSession(version,(body as {prepared?:boolean}).prepared===true);
  });
}
