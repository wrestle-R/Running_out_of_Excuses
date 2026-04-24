import { jsonResponse, optionsResponse } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsResponse();
}

export function GET() {
  return jsonResponse({
    status: "OK",
    timestamp: new Date().toISOString(),
  });
}
