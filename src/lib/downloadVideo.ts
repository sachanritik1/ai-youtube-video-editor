import { spawn } from "node:child_process";
import { mkdtemp, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export async function downloadVideo(url: string): Promise<string> {
  const tempRoot = await mkdtemp(join(tmpdir(), "yt-"));
  const outPath = join(tempRoot, `${randomUUID()}.mp4`);
  const ytDlp = await resolveYtDlpPath();

  await new Promise<void>((resolve, reject) => {
    const args = [
      "-f",
      "bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4",
      "--no-check-certificate",
      "--newline",
      "-o",
      outPath,
      url,
    ];
    const proc = spawn(ytDlp, args, { stdio: ["ignore", "pipe", "pipe"] });

    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("error", (err: NodeJS.ErrnoException) => {
      if (err?.code === "ENOENT") {
        return reject(
          new Error(
            `yt-dlp not found. Install it (e.g., 'brew install yt-dlp') or set YT_DLP_PATH to the binary. Original error: ${err.message}`
          )
        );
      }
      reject(err);
    });
    proc.on("close", (code) => {
      if (code === 0) return resolve();
      reject(new Error(`yt-dlp failed (${code}): ${stderr}`));
    });
  });

  return outPath;
}

async function resolveYtDlpPath(): Promise<string> {
  // Priority: explicit env var
  const envPath = process.env.YT_DLP_PATH;
  if (envPath && (await canExecute(envPath))) return envPath;

  // Common Homebrew locations on macOS (ARM and Intel)
  const candidates = [
    "/opt/homebrew/bin/yt-dlp",
    "/usr/local/bin/yt-dlp",
    "/usr/bin/yt-dlp",
    "yt-dlp", // rely on PATH as a last resort
  ];
  for (const p of candidates) {
    if (await canExecute(p)) return p;
  }
  // If none are executable, still return the command name so spawn triggers an ENOENT
  return "yt-dlp";
}

async function canExecute(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
