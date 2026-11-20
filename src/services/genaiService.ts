/**
 * GenAI Service
 *
 * This module encapsulates all interactions with the Google GenAI SDK.
 * It provides functions for generating song titles, cover art, and the actual audio tracks.
 *
 * Use Cases:
 * - Requesting a short, evocative title based on music prompts and lyrics.
 * - Generating square cover art images based on the song's atmosphere.
 * - Streaming audio generation from the Lyria models.
 */
import { GoogleGenAI } from "../../genaiProxy";
import { CONFIG } from '../config';

export const parseModelOutput = (text: string): { lyrics: string, metadata: string } => {
  const metaMarkers = /Caption:|Instruments:|Metadata:|Structure:|Description:|Mood:|mosic:|bpm:/i;
  const match = text.search(metaMarkers);
  if (match !== -1) return { lyrics: text.substring(0, match).trim(), metadata: text.substring(match).trim() };
  return { lyrics: text, metadata: '' };
};

export const generateSongTitle = async (musicPrompt: string, lyricContext: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: "server-side" });
    const prompt = `Based on this music prompt: "${musicPrompt}" and these lyrics: "${lyricContext.substring(0, 500)}", generate a catchy, evocative, short song title (3 words max). Return ONLY the title string, no quotes or extra text.`;
    const response = await ai.models.generateContent({
      model: CONFIG.TEXT_MODEL,
      contents: prompt,
    });
    return response.text?.trim() || "Untitled Track";
  } catch {
    return "Lyria Composition";
  }
};

export const generateCoverArt = async (musicPrompt: string, lyricContext: string, title?: string): Promise<string | null> => {
  const imagePrompt = `A high-quality, professional square song cover for a music track titled "${title || 'Music'}". Atmosphere: ${musicPrompt}. Context: ${ lyricContext.substring(0, 200) }. Abstract, cinematic aesthetic. IMPORTANT: Ignore any mention of BPM or musical scale in the prompt; do NOT print any numbers, BPM, or scale text on the image.`;
  try {
    const imgGenAi = new GoogleGenAI({ apiKey: "server-side" });
    const config = { imageConfig: { aspectRatio: "1:1" } };
    const contents = { parts: [{ text: imagePrompt }] };
    const imageResponse = await imgGenAi.models.generateContent({
      model: CONFIG.IMAGE_MODEL,
      contents,
      config
    });

    let base64Image = null;
    if (imageResponse.candidates?.[0]?.content?.parts) {
      for (const part of imageResponse.candidates[0].content.parts) {
        if (part.inlineData) {
          base64Image = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }
    }
    return base64Image;
  } catch {
    return null;
  }
};
