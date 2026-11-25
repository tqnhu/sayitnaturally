import { generateText, Output } from "ai";
import { MODEL, SYSTEM, buildPrompt, coachReply, coachRequest } from "@/lib/coach";

// Calls the model through the Vercel AI Gateway (plain "provider/model" string).
// On Vercel the deployment authenticates with its OIDC token; locally set AI_GATEWAY_API_KEY.
export async function POST(req: Request) {
  const parsed = coachRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  try {
    const { output } = await generateText({
      model: MODEL,
      system: SYSTEM,
      prompt: buildPrompt(parsed.data),
      output: Output.object({ schema: coachReply }),
      maxOutputTokens: 900,
    });
    return Response.json(output);
  } catch (e) {
    console.error("coach failed", e instanceof Error ? e.message : e);
    return Response.json({ error: "Coaching is unavailable right now." }, { status: 502 });
  }
}
