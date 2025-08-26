import fs from "node:fs";
import { OpenAI } from "openai";
import { TranscriptItem } from "./types";
import { spawn } from "node:child_process";
import { mkdtemp, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

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
  // Extract lightweight audio to improve stability, speed and avoid large uploads
  const audioPath = await extractAudio(filePath);
  const openai = getOpenAI();

  const res: WhisperVerboseJson = await withRetries(async () => {
    const stream = fs.createReadStream(audioPath);
    return (await openai.audio.transcriptions.create({
      file: stream,
      model: "whisper-1",
      response_format: "verbose_json",
      temperature: 0,
    } as Parameters<typeof openai.audio.transcriptions.create>[0])) as unknown as WhisperVerboseJson;
  }, 3);

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
    try { await unlink(audioPath); } catch {}
    return [
      {
        start: 0,
        end: 0,
        text: (res as unknown as { text?: string }).text || "",
      },
    ];
  }
  try { await unlink(audioPath); } catch {}
  return segments.map((s) => ({ start: s.start, end: s.end, text: s.text }));
}

type WhisperVerboseJson = {
  text?: string;
  segments?: Array<{ start: number; end: number; text: string }>;
};
export type { TranscriptItem };

async function extractAudio(inputPath: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "ayve-"));
  const out = join(dir, `${randomUUID()}.mp3`);
  const args = [
    "-y",
    "-i",
    inputPath,
    "-vn", // no video
    "-ac",
    "1", // mono
    "-ar",
    "16000", // 16kHz
    "-b:a",
    "64k", // low bitrate, adequate for speech
    out,
  ];
  await new Promise<void>((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("error", (err: NodeJS.ErrnoException) => {
      if (err?.code === "ENOENT") {
        return reject(
          new Error(
            "ffmpeg not found. Install it (e.g., 'brew install ffmpeg') and ensure it's on PATH."
          )
        );
      }
      reject(err);
    });
    proc.on("close", (code) => {
      if (code === 0) return resolve();
      reject(new Error(`ffmpeg (audio extract) failed (${code}): ${stderr}`));
    });
  });
  return out;
}

async function withRetries<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastErr = err;
      const e = err as { status?: number; response?: { status?: number }; code?: string; message?: string };
      const status = e?.status ?? e?.response?.status;
      const code = e?.code;
      const isTransient =
        code === "ECONNRESET" ||
        code === "ETIMEDOUT" ||
        (typeof status === "number" && status >= 500);
      // For 400, retry once if message hints at body/stream issues
      const message = String(e?.message || "");
      const maybeStreamIssue =
        message.includes("reading your request") || message.includes("body");
      const shouldRetry = isTransient || (status === 400 && i === 0 && maybeStreamIssue);
      if (!shouldRetry || i === attempts - 1) break;
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
