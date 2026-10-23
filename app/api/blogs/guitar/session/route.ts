import { optionsResponse } from "@/lib/server/http";
import { createQuizSession } from "@/services/blogs/guitar/sessionService";
import { quizResponse } from "@/services/blogs/guitar/sessionHttp";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export const OPTIONS=optionsResponse;
export async function POST() { return quizResponse(createQuizSession); }
