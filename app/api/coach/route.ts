import { createHash } from "node:crypto";
import { generateCoachAnswer, readCoachQuestion, runCoachPilot } from "@/lib/coach-ai";
import { db } from "@/lib/db";
import { getSessionApiKey } from "@/lib/session";

export const runtime = "nodejs";

function reply(answer: string | null, status = 200) {
  return Response.json({ answer }, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_COACH_MODEL;
  const origin = process.env.COACH_AI_ORIGIN;
  const endsAt = Date.parse(process.env.COACH_AI_ENDS_AT ?? "");
  const limit = Number(process.env.COACH_AI_MAX_REQUESTS);
  if (process.env.COACH_AI_ENABLED !== "true" || !apiKey || !model || !origin ||
      !Number.isFinite(endsAt) || Date.now() >= endsAt ||
      !Number.isSafeInteger(limit) || limit <= 0) return reply(null);
  if (request.headers.get("origin") !== origin) return reply(null, 403);

  let sessionKey: string | null;
  try {
    sessionKey = await getSessionApiKey();
  } catch {
    return reply(null, 503);
  }
  if (!sessionKey) return reply(null, 401);
  const sessionHash = createHash("sha256").update(sessionKey).digest("hex");
  if (sessionHash !== process.env.COACH_AI_HEVY_KEY_SHA256) return reply(null, 403);

  let input;
  try {
    input = await readCoachQuestion(request);
  } catch {
    return reply(null, 400);
  }

  const answer = await runCoachPilot(async () => {
    const rows = await db().query(`
      UPDATE coach_ai_pilot
      SET used = used + 1
      WHERE id = 1 AND used < $1 AND CURRENT_TIMESTAMP < $2::timestamptz
      RETURNING used
    `, [limit, new Date(endsAt).toISOString()], {
      fetchOptions: { signal: AbortSignal.any([request.signal, AbortSignal.timeout(1000)]) },
    });
    return !request.signal.aborted && Date.now() < endsAt && Array.isArray(rows) && rows.length === 1;
  }, () => generateCoachAnswer(input, { apiKey, model }));
  return reply(answer);
}
