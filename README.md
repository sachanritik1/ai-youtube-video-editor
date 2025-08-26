# AI YouTube Video Editor (Next.js 15 + TypeScript)

Create short edits from YouTube videos by describing what you want. The server:

- Downloads the source video with yt-dlp
- Transcribes audio with OpenAI Whisper
- Finds relevant moments via GPT-4o-mini (JSON-constrained)
- Clips and merges with ffmpeg
- Serves the final MP4 from `public/outputs`

UI is built with Tailwind CSS and shadcn/ui components.

## Prerequisites (macOS)

- Node.js 18+
- Homebrew (recommended)
- yt-dlp and ffmpeg available on PATH

```zsh
brew install yt-dlp ffmpeg
which yt-dlp
which ffmpeg
```

If yt-dlp is installed in a non-standard location (e.g. Apple Silicon under `/opt/homebrew/bin`), you can set `YT_DLP_PATH` in `.env.local`.

## Setup

```zsh
npm install
echo 'OPENAI_API_KEY=YOUR_KEY' >> .env.local
# optional overrides
echo 'OPENAI_MODEL=gpt-4o-mini' >> .env.local
echo 'YT_DLP_PATH=$(which yt-dlp)' >> .env.local  # only if PATH issues

npm run dev
```

Open <http://localhost:3000> and:

1) Paste a YouTube URL
2) Describe the edit/query
3) Submit and wait; download or preview the result when ready

Outputs are written to `public/outputs` and served as `/outputs/<id>.mp4`.

## API

POST `/api/process-video`

Request body:

```json
{ "youtubeUrl": "https://www.youtube.com/watch?v=...", "query": "your description" }
```

Response body (on success):

```json
{ "videoUrl": "/outputs/<uuid>.mp4" }
```

Errors return `{ "error": string }` with HTTP 400.

## Environment variables

- `OPENAI_API_KEY` (required)
- `OPENAI_MODEL` (optional, defaults to `gpt-4o-mini`)
- `YT_DLP_PATH` (optional; path to yt-dlp binary if not on PATH)

## Troubleshooting

- Error: `spawn yt-dlp ENOENT`
  - Install yt-dlp: `brew install yt-dlp`
  - Ensure it’s on PATH: `which yt-dlp`
  - Or set `.env.local`: `YT_DLP_PATH=/opt/homebrew/bin/yt-dlp`

- Error: `ffmpeg not found`
  - Install ffmpeg: `brew install ffmpeg`
  - Ensure it’s on PATH: `which ffmpeg`

- Error: OpenAI key missing or `401 Unauthorized`
  - Set `OPENAI_API_KEY` in `.env.local` and restart dev server

## Notes on deployment

This app requires system binaries (yt-dlp, ffmpeg). Typical serverless environments don’t provide these. Recommended options:

- Deploy to a Node/VPS host where you can install binaries
- Use Docker with ffmpeg/yt-dlp included in the image
- For Vercel, use a self-hosted backend or supply static binaries (advanced)

The API route uses `export const runtime = "nodejs"` and `force-dynamic`.

## Tech Stack

- Next.js 15 (App Router), React, TypeScript
- Tailwind CSS, shadcn/ui
- OpenAI SDK (Whisper + GPT-4o-mini)
- zod for input/JSON validation
- yt-dlp + ffmpeg via child_process
