/**
 * Event Code Generation Utility
 * Generates unique, human-readable event codes
 * 
 * Rules:
 * - 5 characters long
 * - All uppercase
 * - Excludes confusing characters: 0, 1, I, l, O
 */

// Allowed characters (uppercase, excluding 0, 1, I, O, and l is already excluded since uppercase)
const ALLOWED_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Generate a random event code
 * @returns A 5-character uppercase code
 */
export function generateEventCode(): string {
  let code = '';
  for (let i = 0; i < 5; i++) {
    const randomIndex = Math.floor(Math.random() * ALLOWED_CHARS.length);
    code += ALLOWED_CHARS[randomIndex];
  }
  return code;
}

/**
 * Validate that an event code follows the rules
 * @param code The code to validate
 * @returns true if valid, false otherwise
 */
export function isValidEventCode(code: string): boolean {
  if (code.length !== 5) return false;
  if (code !== code.toUpperCase()) return false;
  
  for (const char of code) {
    if (!ALLOWED_CHARS.includes(char)) return false;
  }
  
  return true;
}