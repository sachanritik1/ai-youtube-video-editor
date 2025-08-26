import { NextRequest } from "next/server";
import { z } from "zod";
import { downloadVideo } from "@/lib/downloadVideo";
import { transcribeAudio } from "@/lib/transcribe";
import { queryLLM } from "@/lib/llm";
import { clipVideo } from "@/lib/clip";
import type { TranscriptItem, Timestamp } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const InputSchema = z.object({
  youtubeUrl: z.string().url(),
  query: z.string().min(3),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { youtubeUrl, query } = InputSchema.parse(body);

    // Step 1: Download video
    const inputPath = await downloadVideo(youtubeUrl);

    // Step 2: Transcribe
    const transcript: TranscriptItem[] = await transcribeAudio(inputPath);

    // Step 3: Ask LLM for timestamps
    const timestamps: Timestamp[] = await queryLLM(transcript, query);

    // Step 4: Clip and merge
    const outputUrl = await clipVideo(inputPath, timestamps);

    return new Response(JSON.stringify({ videoUrl: outputUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("/api/process-video error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
