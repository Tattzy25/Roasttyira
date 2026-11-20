import { GoogleGenAI } from '@google/genai';

export const maxDuration = 60;

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    console.error('[API /api/generate-content] FATAL: GEMINI_API_KEY is missing from environment variables.');
    return Response.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 });
  }

  let body: any;
  try {
    body = await request.json();
    const ai = new GoogleGenAI({ apiKey });
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
    console.error('[API /api/generate-content] FAILURE:', {
      model: body?.model,
      status: error?.status,
      message: error?.message,
      stack: error?.stack,
      error,
    });
    return Response.json({ error: error?.message || 'Failed to generate content' }, { status: error?.status || 500 });
  }
}
