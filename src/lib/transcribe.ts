import fs from "node:fs";
import { OpenAI } from "openai";
import { TranscriptItem } from "./types";

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("Missing OPENAI_API_KEY environment variable");
  }
  return new OpenAI({ apiKey: key });
}

export async function transcribeAudio(
  filePath: string
): Promise<TranscriptItem[]> {
  // Whisper will accept the whole mp4
  const file = fs.createReadStream(filePath);
  const openai = getOpenAI();
  const res = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    // Enable timestamped segments
    response_format: "verbose_json",
    temperature: 0,
  } as unknown as Parameters<typeof openai.audio.transcriptions.create>[0]);

  // The OpenAI SDK types don't expose verbose_json segments strongly; coerce at runtime
  const segments = (
    res as unknown as {
      segments?: { start: number; end: number; text: string }[];
    }
  )?.segments as
    | Array<{
        start: number;
        end: number;
        text: string;
      }>
    | undefined;

  if (!segments || segments.length === 0) {
    // fallback: single chunk
    return [
      {
        start: 0,
        end: 0,
        text: (res as unknown as { text?: string }).text || "",
      },
    ];
  }

  return segments.map((s) => ({ start: s.start, end: s.end, text: s.text }));
}

export type { TranscriptItem };
