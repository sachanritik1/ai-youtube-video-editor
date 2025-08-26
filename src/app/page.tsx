"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { ThemeToggle } from "@/components/theme-toggle";
import { Film, Scissors, Download, Mic } from "lucide-react";

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
  const stepOrder: Status[] = [
    "downloading",
    "transcribing",
    "clipping",
    "done",
  ];
  const stepIndex = (s: Status) => stepOrder.indexOf(s);
  const progress = Math.max(
    0,
    (stepIndex(status) / (stepOrder.length - 1)) * 100
  );

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
    <main className="min-h-screen w-full bg-[radial-gradient(1200px_600px_at_50%_-150px,theme(colors.primary/15%),transparent)] dark:bg-[radial-gradient(1200px_600px_at_50%_-150px,theme(colors.primary/7%),transparent)]">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <Film className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                AI YouTube Video Editor
              </h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Turn long videos into short, shareable edits.
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Content */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: Form */}
          <Card className="backdrop-blur supports-[backdrop-filter]:bg-card/80">
            <CardHeader>
              <CardTitle>Source & Query</CardTitle>
              <CardDescription>
                Paste a YouTube link and describe the edit you want.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label className="mb-1 block">YouTube URL</Label>
                  <Input
                    type="url"
                    required
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    aria-invalid={!youtubeUrl ? true : undefined}
                  />
                  <p className="text-xs text-muted-foreground">
                    Public videos work best.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="mb-1 block">Query</Label>
                  <Textarea
                    required
                    placeholder="e.g., make me an edit where people are talking about AI"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    rows={6}
                    aria-invalid={!query ? true : undefined}
                  />
                  <p className="text-xs text-muted-foreground">
                    Describe scenes you want. We’ll search the transcript for
                    them.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="submit"
                    disabled={
                      !youtubeUrl ||
                      !query ||
                      ["downloading", "transcribing", "clipping"].includes(
                        status
                      )
                    }
                  >
                    {["downloading", "transcribing", "clipping"].includes(
                      status
                    ) ? (
                      <span className="inline-flex items-center gap-2">
                        <Spinner /> Processing…
                      </span>
                    ) : (
                      <>
                        <Scissors className="size-4" /> Create Edit
                      </>
                    )}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    This can take a few minutes for longer videos.
                  </span>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Right: Progress & Result */}
          <Card className="backdrop-blur supports-[backdrop-filter]:bg-card/80">
            <CardHeader>
              <CardTitle>Progress</CardTitle>
              <CardDescription>
                We’ll download, transcribe, pick moments, and merge your edit.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Step badges */}
              <div className="mb-4 flex flex-wrap gap-2">
                {stepOrder.map((step) => {
                  const active = status === step;
                  const completed = stepIndex(step) < stepIndex(status);
                  const color = active
                    ? "primary"
                    : completed
                    ? "success"
                    : "muted";
                  const label = step.charAt(0).toUpperCase() + step.slice(1);
                  const Icon =
                    step === "downloading"
                      ? Download
                      : step === "transcribing"
                      ? Mic
                      : step === "clipping"
                      ? Scissors
                      : Film;
                  return (
                    <Badge key={step} color={color}>
                      {active && (
                        <span className="inline-block size-1.5 animate-pulse rounded-full bg-current" />
                      )}
                      <Icon className="size-3.5" /> {label}
                    </Badge>
                  );
                })}
                {status === "error" && <Badge color="destructive">Error</Badge>}
              </div>

              <Progress value={progress} />

              {error && (
                <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="mt-6">
                <div className="mb-2 text-sm font-medium">Result</div>
                {!videoUrl ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Your edited video will appear here when it’s ready.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <a
                      className="inline-flex items-center gap-2 text-primary underline-offset-4 hover:underline"
                      href={videoUrl ?? undefined}
                      download
                    >
                      <Download className="size-4" /> Download your edited video
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
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
