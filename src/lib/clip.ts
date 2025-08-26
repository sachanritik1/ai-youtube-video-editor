import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { Timestamp } from "./types";

const OUTPUT_DIR = resolve(process.cwd(), "public", "outputs");

export async function clipVideo(
  inputPath: string,
  timestamps: Timestamp[]
): Promise<string> {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const uid = randomUUID();
  const outputPath = join(OUTPUT_DIR, `${uid}.mp4`);

  if (!timestamps?.length) {
    throw new Error("No timestamps provided by LLM");
  }

  const parts: string[] = [];
  timestamps.forEach((t, i) => {
    const s = Math.max(0, t.start);
    const e = Math.max(s + 0.1, t.end);
    parts.push(
      `[0:v]trim=start=${s.toFixed(3)}:end=${e.toFixed(
        3
      )},setpts=PTS-STARTPTS[v${i}]`,
      `[0:a]atrim=start=${s.toFixed(3)}:end=${e.toFixed(
        3
      )},asetpts=PTS-STARTPTS[a${i}]`
    );
  });
  const concatInputs = timestamps.map((_, i) => `[v${i}][a${i}]`).join("");
  const filter = `${parts.join(";")};${concatInputs}concat=n=${
    timestamps.length
  }:v=1:a=1[outv][outa]`;

  const args = [
    "-y",
    "-i",
    inputPath,
    "-filter_complex",
    filter,
    "-map",
    "[outv]",
    "-map",
    "[outa]",
    "-c:v",
    "libx264",
    "-c:a",
    "aac",
    "-movflags",
    "+faststart",
    outputPath,
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
      reject(new Error(`ffmpeg failed (${code}): ${stderr}`));
    });
  });

  const publicUrl = `/outputs/${uid}.mp4`;
  return publicUrl;
}
