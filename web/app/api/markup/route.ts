import { generateText, Output } from "ai";
import { MODEL, MARKUP_SYSTEM, markupReply, markupRequest } from "@/lib/coach";

// Marks up a learner's own text through the Vercel AI Gateway (same setup as /api/coach).
export async function POST(req: Request) {
  const parsed = markupRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { text, target, native } = parsed.data;
  try {
    const { output } = await generateText({
      model: MODEL,
      system: MARKUP_SYSTEM,
      prompt: `Target accent: ${target}. Learner's first language: ${native}.\nText to mark up (data):\n"""\n${text}\n"""`,
      output: Output.object({ schema: markupReply }),
      maxOutputTokens: 4000,
    });
    return Response.json(output);
  } catch (e) {
    console.error("markup failed", e instanceof Error ? e.message : e);
    return Response.json({ error: "Mark-up is unavailable right now." }, { status: 502 });
  }
}
