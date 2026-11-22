import { GoogleGenAI } from '@google/genai';

export const maxDuration = 60;

function unwrapErrorMessage(raw: unknown): string {
  let current = typeof raw === 'string' ? raw : (raw as any)?.message || '';
  for (let i = 0; i < 4; i++) {
    const trimmed = String(current || '').trim();
    if (!trimmed.startsWith('{')) break;
    try {
      const parsed = JSON.parse(trimmed);
      const next =
        parsed?.error?.message ??
        (typeof parsed?.error === 'string' ? parsed.error : undefined) ??
        parsed?.message;
      if (typeof next === 'string' && next.trim()) {
        current = next;
      } else {
        break;
      }
    } catch {
      break;
    }
  }
  return String(current || '').trim();
}

function toCustomerSafeError(error: any): string {
  const unwrapped = unwrapErrorMessage(error);
  const status = Number(error?.status) || 0;
  const lower = unwrapped.toLowerCase();

  if (status === 429 || lower.includes('quota') || lower.includes('resource_exhausted')) {
    return 'High demand right now — please try again in a moment.';
  }
  if (
    status === 404 ||
    lower.includes('not_found') ||
    lower.includes('modelservice') ||
    lower.includes('is not found for api version')
  ) {
    return 'The music engine is temporarily unavailable. Please try again shortly.';
  }
  if (status === 503 || lower.includes('unavailable') || lower.includes('overloaded')) {
    return 'The music engine is busy right now — please retry in a few seconds.';
  }
  if (lower.includes('safety') || lower.includes('prohibited') || lower.includes('blocked')) {
    return 'That prompt could not be generated due to content guidelines. Try adjusting your wording.';
  }
  if (!unwrapped || unwrapped.startsWith('{')) {
    return 'Song generation failed. Please try again.';
  }
  return unwrapped;
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'Music service is not configured.' }, { status: 500 });
  }

  let body: any;
  try {
    body = await request.json();

    const ai = new GoogleGenAI({
      apiKey,
      apiVersion: 'v1beta',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

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
    return Response.json(
      { error: toCustomerSafeError(error) },
      { status: error?.status || 500 }
    );
  }
}
