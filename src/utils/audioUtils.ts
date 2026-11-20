/**
 * Audio Utilities
 *
 * This module contains helper functions for processing and manipulating audio data.
 *
 * Use Cases:
 * - Converting base64 encoded audio strings received from APIs into playable Blob URLs.
 */
export const createAudioUrlFromBase64 = (base64: string, mimeType: string): string => {
  try {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType });
    return URL.createObjectURL(blob);
  } catch {
    return "";
  }
};
