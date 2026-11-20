/**
 * General Helpers
 *
 * This module contains general utility functions used across the application.
 *
 * Use Cases:
 * - Selecting random items from arrays for prompt generation.
 */
export const getRandomItem = <T>(arr: T[]): T => {
  return arr[Math.floor(Math.random() * arr.length)];
};
