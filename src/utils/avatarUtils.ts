/**
 * Avatar utilities - Re-exports from shared library
 *
 * @deprecated Import from '@shared/lib/avatarGenerator' directly instead.
 * This file is kept for backward compatibility.
 */

export {
  generateAvatarSvg,
  generateAvatarDataUrl,
  getAvatarGradient,
  getAvatarColor,
  getInitials,
  hashString,
  createSeededRandom,
} from "@shared/lib/avatarGenerator";

export type {
  AvatarConfig,
  AvatarTheme,
  PatternType,
  GradientPair,
} from "@shared/lib/avatarGenerator";

// Re-export for backward compatibility with existing code
// The shared library returns GradientPair objects, but old code expects [string, string] tuples
import { getAvatarGradient as getGradient } from "@shared/lib/avatarGenerator";

/**
 * @deprecated Use getAvatarGradient from shared library instead
 */
export function getAvatarGradientLegacy(userId: string): [string, string] {
  const gradient = getGradient(userId);
  return [gradient.from, gradient.to];
}
