/**
 * Audio Utilities
 *
 * This module contains helper functions for processing and manipulating audio data.
 *
 * Use Cases:
 * - Converting base64 encoded audio strings received from APIs into playable Blob URLs.
 */
const base64ToUint8Array = (base64: string): Uint8Array<ArrayBuffer> => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(new ArrayBuffer(len));
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const createAudioUrlFromBase64 = (base64: string, mimeType: string): string => {
  try {
    const blob = new Blob([base64ToUint8Array(base64)], { type: mimeType });
    return URL.createObjectURL(blob);
  } catch {
    return "";
  }
};

export const createAudioUrlFromBase64Chunks = (chunks: string[], mimeType: string): string => {
  try {
    const byteArrays = chunks.filter(Boolean).map(base64ToUint8Array);
    if (byteArrays.length === 0) return "";
    const blob = new Blob(byteArrays, { type: mimeType });
    return URL.createObjectURL(blob);
  } catch {
    return "";
  }
};
