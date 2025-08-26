import { OpenAI } from "openai";
import { z } from "zod";
import { TranscriptItem, Timestamp } from "./types";

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("Missing OPENAI_API_KEY environment variable");
  }
  return new OpenAI({ apiKey: key });
}

const TimestampSchema = z.object({
  start: z.number().nonnegative(),
  end: z.number().positive(),
});
const TimestampArraySchema = z.array(TimestampSchema).min(1);

export async function queryLLM(
  transcript: TranscriptItem[],
  query: string
): Promise<Timestamp[]> {
  const transcriptPreview = transcript
    .slice(0, 200)
    .map((t) => `[${t.start.toFixed(2)}-${t.end.toFixed(2)}] ${t.text}`)
    .join("\n");

  const system = `You are a helpful video editor assistant. Given a transcript with timestamps and a user request, choose the most relevant short moments and return ONLY JSON: an array of objects with {start, end} in seconds. Keep total duration under ~90 seconds if possible.`;
  const user = `Transcript (partial):\n${transcriptPreview}\n\nUser request: ${query}\n\nReturn JSON only: [{"start": number, "end": number}, ...]`;

  const openai = getOpenAI();
  const resp = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.2,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  const content = resp.choices?.[0]?.message?.content || "[]";
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    // try to extract JSON substring
    const match = content.match(/\[[\s\S]*\]/);
    parsed = match ? JSON.parse(match[0]) : [];
  }

  const safe = TimestampArraySchema.safeParse(parsed);
  if (!safe.success) {
    throw new Error(`LLM returned invalid JSON: ${safe.error.message}`);
  }
  return safe.data;
}

export type { Timestamp } from "./types";
