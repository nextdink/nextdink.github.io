/**
 * Deterministic avatar generator based on user ID.
 * Generates a unique, consistent avatar for each user with a gradient background
 * and user initials overlay. Designed to fit the pickleball app's clean, modern aesthetic.
 * The avatar is computed client-side and produces the same result across all devices.
 */

import { avatarGradients } from '@/config/theme';

// Use gradient pairs from centralized theme config
const GRADIENT_PAIRS = avatarGradients;


/**
 * Simple hash function to convert a string to a number.
 * Uses FNV-1a hash algorithm for good distribution.
 */
function hashString(str: string): number {
  let hash = 2166136261; // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619); // FNV prime
  }
  return hash >>> 0; // Convert to unsigned 32-bit integer
}

/**
 * Generate a seeded random number generator.
 * Uses a simple LCG (Linear Congruential Generator) for deterministic results.
 */
function createSeededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = Math.imul(state, 1664525) + 1013904223;
    return (state >>> 0) / 4294967296;
  };
}

/**
 * Get the gradient colors for a user based on their ID.
 */
export function getAvatarGradient(userId: string): [string, string] {
  const hash = hashString(userId);
  const pair = GRADIENT_PAIRS[hash % GRADIENT_PAIRS.length];
  return [pair[0], pair[1]];
}

/**
 * Get the user's initials from their display name.
 */
export function getInitials(displayName: string | null | undefined): string {
  if (!displayName || displayName.trim().length === 0) return '?';
  
  const parts = displayName.trim().split(/\s+/).filter(p => p.length > 0);
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Generate decorative shapes pattern based on user ID.
 * Creates a subtle, unique pattern in the background.
 */
function generatePattern(userId: string, size: number): string {
  const hash = hashString(userId);
  const random = createSeededRandom(hash);
  
  let shapes = '';
  const numShapes = 3 + Math.floor(random() * 3); // 3-5 shapes
  
  for (let i = 0; i < numShapes; i++) {
    const shapeType = Math.floor(random() * 3);
    const x = random() * size;
    const y = random() * size;
    const opacity = 0.06 + random() * 0.08;
    const shapeSize = size * (0.3 + random() * 0.4);
    
    if (shapeType === 0) {
      // Circle
      shapes += `<circle cx="${x}" cy="${y}" r="${shapeSize / 2}" fill="white" fill-opacity="${opacity}"/>`;
    } else if (shapeType === 1) {
      // Rounded rectangle
      const width = shapeSize;
      const height = shapeSize * (0.5 + random() * 0.5);
      const rx = Math.min(width, height) * 0.2;
      shapes += `<rect x="${x - width/2}" y="${y - height/2}" width="${width}" height="${height}" rx="${rx}" fill="white" fill-opacity="${opacity}"/>`;
    } else {
      // Ellipse
      const rx = shapeSize / 2;
      const ry = shapeSize * (0.3 + random() * 0.4);
      shapes += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="white" fill-opacity="${opacity}"/>`;
    }
  }
  
  return shapes;
}

/**
 * Generate an SVG data URL for the user's avatar.
 * Creates a gradient background with subtle pattern and initials overlay.
 */
export function generateAvatarSvg(
  userId: string, 
  displayName: string | null | undefined,
  size: number = 80
): string {
  const [color1, color2] = getAvatarGradient(userId);
  const initials = getInitials(displayName);
  const hash = hashString(userId);
  const random = createSeededRandom(hash);
  
  // Gradient angle variation (45-135 degrees for visual interest)
  const angle = 45 + random() * 90;
  const rad = (angle * Math.PI) / 180;
  const x1 = 50 - 50 * Math.cos(rad);
  const y1 = 50 - 50 * Math.sin(rad);
  const x2 = 50 + 50 * Math.cos(rad);
  const y2 = 50 + 50 * Math.sin(rad);
  
  // Generate subtle pattern
  const pattern = generatePattern(userId, size);
  
  // Font size based on number of initials
  const fontSize = initials.length === 1 ? size * 0.5 : size * 0.4;
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <defs>
      <linearGradient id="grad" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
        <stop offset="0%" style="stop-color:${color1}"/>
        <stop offset="100%" style="stop-color:${color2}"/>
      </linearGradient>
      <clipPath id="circle">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2}"/>
      </clipPath>
    </defs>
    <g clip-path="url(#circle)">
      <rect width="${size}" height="${size}" fill="url(#grad)"/>
      ${pattern}
    </g>
    <text 
      x="50%" 
      y="50%" 
      dominant-baseline="central" 
      text-anchor="middle" 
      fill="white" 
      font-family="Inter, system-ui, -apple-system, sans-serif" 
      font-size="${fontSize}" 
      font-weight="600"
      style="text-shadow: 0 1px 2px rgba(0,0,0,0.1);"
    >${initials}</text>
  </svg>`;
  
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Get the primary avatar color for a user (useful for other UI elements).
 */
export function getAvatarColor(userId: string): string {
  const [color1] = getAvatarGradient(userId);
  return color1;
}