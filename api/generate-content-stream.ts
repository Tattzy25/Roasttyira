import { GoogleGenAI } from '@google/genai';

export const maxDuration = 60;

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    console.error('[API /api/generate-content-stream] FATAL: GEMINI_API_KEY is missing from environment variables.');
    return Response.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 });
  }

  let body: any;
  try {
    body = await request.json();
    const ai = new GoogleGenAI({ apiKey });
    const genStream = await ai.models.generateContentStream(body);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of genStream) {
            const line =
              JSON.stringify({
                candidates: chunk?.candidates,
                promptFeedback: chunk?.promptFeedback,
                usageMetadata: chunk?.usageMetadata,
                modelVersion: chunk?.modelVersion,
                responseId: chunk?.responseId,
                text: chunk?.text,
              }) + '\n';
            controller.enqueue(encoder.encode(line));
          }
          controller.close();
        } catch (err: any) {
          console.error('[API /api/generate-content-stream] STREAM CHUNK FAILURE:', {
            model: body?.model,
            status: err?.status,
            message: err?.message,
            stack: err?.stack,
            err,
          });
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: any) {
    console.error('[API /api/generate-content-stream] FAILURE:', {
      model: body?.model,
      status: error?.status,
      message: error?.message,
      stack: error?.stack,
      error,
    });
    return Response.json({ error: error?.message || 'Failed to stream content' }, { status: error?.status || 500 });
  }
}
