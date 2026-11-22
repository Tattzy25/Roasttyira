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
  if (!unwrapped || unwrapped.startsWith('{')) {
    return 'Generation failed. Please try again.';
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

    const response = await ai.models.generateContent(body);

    return Response.json({
      candidates: response?.candidates,
      promptFeedback: response?.promptFeedback,
      usageMetadata: response?.usageMetadata,
      modelVersion: response?.modelVersion,
      responseId: response?.responseId,
      text: response?.text,
      functionCalls: response?.functionCalls,
      data: response?.data,
    });
  } catch (error: any) {
    return Response.json(
      { error: toCustomerSafeError(error) },
      { status: error?.status || 500 }
    );
  }
}
