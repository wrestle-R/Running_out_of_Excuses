import { jsonResponse, optionsResponse } from "@/lib/server/http";
import { InvalidQuiz, RunConflict, saveQuiz, validateSubmission } from "@/services/blogs/guitar/guitarService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const OPTIONS = optionsResponse;

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  try {
    if (Number(request.headers.get("content-length")) > 4096) return jsonResponse({ error: "Quiz result too large" }, { status: 413, headers });
    // Bound streamed bodies too; Content-Length is optional and untrusted.
    const reader = request.body?.getReader();
    if (!reader) throw new InvalidQuiz();
    let text = "", bytes = 0;
    const decoder = new TextDecoder();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 4096) { await reader.cancel(); return jsonResponse({ error: "Quiz result too large" }, { status: 413, headers }); }
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();
    } finally { reader.releaseLock(); }
    const input = validateSubmission(JSON.parse(text));
    return jsonResponse(await saveQuiz(input), { headers });
  } catch (error) {
    if (error instanceof InvalidQuiz || error instanceof SyntaxError) return jsonResponse({ error: "Invalid quiz result" }, { status: 400, headers });
    if (error instanceof RunConflict) return jsonResponse({ error: "This run was already saved with different answers" }, { status: 409, headers });
    // Do not log connection strings or request bodies.
    console.error("Guitar quiz result could not be saved");
    return jsonResponse({ error: "Could not save quiz result. Please try again." }, { status: 503, headers });
  }
}
