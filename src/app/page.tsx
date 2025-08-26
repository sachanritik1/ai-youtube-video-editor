"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Status =
  | "idle"
  | "downloading"
  | "transcribing"
  | "clipping"
  | "done"
  | "error";

export default function Home() {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // status label map kept for potential future UI display
  // const statusLabel = useMemo(() => ({
  //   idle: "Idle",
  //   downloading: "Downloading video…",
  //   transcribing: "Transcribing audio…",
  //   clipping: "Clipping & merging…",
  //   done: "Done",
  //   error: "Error",
  // }[status]), [status]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setVideoUrl(null);
    setStatus("downloading");

    const timers: NodeJS.Timeout[] = [];
    timers.push(setTimeout(() => setStatus("transcribing"), 2500));
    timers.push(setTimeout(() => setStatus("clipping"), 7000));

    try {
      const res = await fetch("/api/process-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtubeUrl, query }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Processing failed");
      }
      setVideoUrl(data.videoUrl);
      setStatus("done");
    } catch (err: unknown) {
      let message = "Unknown error";
      if (err && typeof err === "object" && "message" in err) {
        const m = (err as { message?: unknown }).message;
        message = typeof m === "string" ? m : JSON.stringify(m);
      }
      setError(message);
      setStatus("error");
    } finally {
      timers.forEach(clearTimeout);
    }
  }

  return (
    <main className="min-h-screen w-full">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            AI YouTube Video Editor
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Paste a YouTube link and describe the edit you want. The server will
            download, transcribe, find relevant moments, and return a merged
            clip.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Form Card */}
          <section className="rounded-xl border bg-card text-card-foreground shadow-sm">
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <Label className="mb-1 block">YouTube URL</Label>
                  <Input
                    type="url"
                    required
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Public videos work best.
                  </p>
                </div>
                <div>
                  <Label className="mb-1 block">Query</Label>
                  <Textarea
                    required
                    placeholder="e.g., make me an edit where people are talking about AI"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    rows={6}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Describe scenes you want. We’ll search the transcript for
                    them.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    type="submit"
                    disabled={
                      !youtubeUrl ||
                      !query ||
                      status === "downloading" ||
                      status === "transcribing" ||
                      status === "clipping"
                    }
                  >
                    {status === "downloading" ||
                    status === "transcribing" ||
                    status === "clipping" ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Processing…
                      </span>
                    ) : (
                      "Create Edit"
                    )}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    This can take a few minutes for longer videos.
                  </span>
                </div>
              </form>
            </div>
          </section>

          {/* Status + Result Card */}
          <section className="rounded-xl border bg-card text-card-foreground shadow-sm">
            <div className="p-6 space-y-4">
              <div>
                <div className="text-sm font-medium">Status</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(
                    [
                      "downloading",
                      "transcribing",
                      "clipping",
                      "done",
                    ] as Status[]
                  ).map((step) => {
                    const active = status === step;
                    const completed =
                      (step === "transcribing" &&
                        (status === "clipping" || status === "done")) ||
                      (step === "downloading" &&
                        status !== "idle" &&
                        status !== "error");
                    const classes = active
                      ? "border-primary bg-primary/10 text-primary"
                      : completed
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-muted bg-muted text-muted-foreground";
                    const label = step.charAt(0).toUpperCase() + step.slice(1);
                    return (
                      <span
                        key={step}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${classes}`}
                      >
                        {active && (
                          <span className="inline-block size-1.5 animate-pulse rounded-full bg-current" />
                        )}
                        {label}
                      </span>
                    );
                  })}
                  {status === "error" && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1 text-xs text-destructive">
                      Error
                    </span>
                  )}
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div>
                <div className="text-sm font-medium">Result</div>
                {!videoUrl ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Your edited video will appear here when it’s ready.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    <a
                      className="text-primary underline-offset-4 hover:underline"
                      href={videoUrl ?? undefined}
                      download
                    >
                      Download your edited video
                    </a>
                    <div className="overflow-hidden rounded-lg border">
                      <video
                        src={videoUrl ?? undefined}
                        controls
                        className="h-auto w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
