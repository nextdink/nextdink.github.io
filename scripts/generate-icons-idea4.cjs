/**
 * PWA Icon Generator - Idea 4: Letter "N" with Court Line Motif
 * 
 * A bold, custom "N" letterform where the diagonal stroke is styled
 * as a pickleball court center line / net. Clean and scalable.
 * Small pickleball (with holes) accent at bottom-right.
 * 
 * Run with: node scripts/generate-icons-idea4.cjs
 * Requires: npm install -D sharp
 */

const fs = require('fs');
const path = require('path');

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('Sharp not installed. Creating SVG placeholders instead.');
  sharp = null;
}

const PREVIEW_DIR = path.join(__dirname, '..', 'public', 'icons', 'preview-idea4');
const BRAND_COLOR = '#0e7490';
const BRAND_COLOR_LIGHT = '#0891b2';

const SIZES = [192, 512];

function createIconSVG(size, isMaskable = false) {
  const padding = isMaskable ? size * 0.15 : 0;
  const center = size / 2;
  const innerSize = size - padding * 2;
  
  // Letter "N" dimensions — symmetric, both strokes at same height
  const letterHeight = innerSize * 0.46;
  const letterWidth = innerSize * 0.36;
  const strokeW = innerSize * 0.075;
  
  const left = center - letterWidth / 2;
  const right = center + letterWidth / 2;
  const top = center - letterHeight / 2;
  const bottom = center + letterHeight / 2;
  
  // Net/court line pattern on the diagonal stroke
  const diagDx = (right - strokeW / 2) - (left + strokeW / 2);
  const diagDy = bottom - top;
  const diagAngle = Math.atan2(diagDy, diagDx);
  const netLineCount = 5;
  
  let netLines = '';
  for (let i = 1; i <= netLineCount; i++) {
    const t = i / (netLineCount + 1);
    const cx = left + strokeW / 2 + t * diagDx;
    const cy = top + t * diagDy;
    // Short perpendicular dashes across the diagonal
    const perpX = Math.cos(diagAngle + Math.PI / 2) * strokeW * 0.55;
    const perpY = Math.sin(diagAngle + Math.PI / 2) * strokeW * 0.55;
    netLines += `<line x1="${cx - perpX}" y1="${cy - perpY}" x2="${cx + perpX}" y2="${cy + perpY}" stroke="${BRAND_COLOR}" stroke-width="${size * 0.005}" stroke-linecap="round" opacity="0.45"/>`;
  }
  
  // Pickleball accent — positioned at bottom-right of N
  const ballRadius = strokeW * 0.85;
  const ballCx = right + strokeW * 0.6;
  const ballCy = bottom - strokeW * 0.1;
  
  // Pickleball holes (3 rings for a small ball)
  let pickleballHoles = '';
  const holeRadius = ballRadius * 0.1;
  
  // Center hole
  pickleballHoles += `<circle cx="${ballCx}" cy="${ballCy}" r="${holeRadius}" fill="${BRAND_COLOR}" opacity="0.5"/>`;
  
  // Inner ring (4 holes)
  const ring1R = ballRadius * 0.35;
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 - Math.PI / 4;
    pickleballHoles += `<circle cx="${ballCx + Math.cos(angle) * ring1R}" cy="${ballCy + Math.sin(angle) * ring1R}" r="${holeRadius}" fill="${BRAND_COLOR}" opacity="0.5"/>`;
  }
  
  // Outer ring (8 holes)
  const ring2R = ballRadius * 0.7;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    pickleballHoles += `<circle cx="${ballCx + Math.cos(angle) * ring2R}" cy="${ballCy + Math.sin(angle) * ring2R}" r="${holeRadius}" fill="${BRAND_COLOR}" opacity="0.5"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${BRAND_COLOR_LIGHT};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${BRAND_COLOR};stop-opacity:1" />
    </linearGradient>
    <radialGradient id="ballGrad" cx="40%" cy="35%" r="60%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e2e8f0;stop-opacity:1" />
    </radialGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
  
  <!-- Letter "N" — symmetric vertical strokes -->
  <!-- Left vertical stroke -->
  <rect x="${left}" y="${top}" width="${strokeW}" height="${letterHeight}" fill="white" rx="${strokeW * 0.15}"/>
  
  <!-- Right vertical stroke (same top and bottom as left) -->
  <rect x="${right - strokeW}" y="${top}" width="${strokeW}" height="${letterHeight}" fill="white" rx="${strokeW * 0.15}"/>
  
  <!-- Diagonal stroke (the "net") -->
  <line 
    x1="${left + strokeW / 2}" y1="${top}" 
    x2="${right - strokeW / 2}" y2="${bottom}" 
    stroke="white" 
    stroke-width="${strokeW}" 
    stroke-linecap="round"
  />
  
  <!-- Net/court line pattern on diagonal -->
  ${netLines}
  
  <!-- Pickleball accent at bottom-right -->
  <circle cx="${ballCx}" cy="${ballCy}" r="${ballRadius}" fill="url(#ballGrad)"/>
  <circle cx="${ballCx}" cy="${ballCy}" r="${ballRadius}" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="${size * 0.003}"/>
  ${pickleballHoles}
</svg>`;
}

async function generateIcons() {
  if (!fs.existsSync(PREVIEW_DIR)) {
    fs.mkdirSync(PREVIEW_DIR, { recursive: true });
  }

  if (sharp) {
    console.log('🎨 Idea 4: Letter "N" with Court Line Motif (improved)');
    console.log('Generating preview icons...\n');
    
    for (const size of SIZES) {
      const svg = createIconSVG(size, false);
      await sharp(Buffer.from(svg)).png().toFile(path.join(PREVIEW_DIR, `icon-${size}.png`));
      console.log(`  ✓ icon-${size}.png`);
    }

    const maskSvg = createIconSVG(512, true);
    await sharp(Buffer.from(maskSvg)).png().toFile(path.join(PREVIEW_DIR, `icon-maskable-512.png`));
    console.log(`  ✓ icon-maskable-512.png`);

    const appleSvg = createIconSVG(180, false);
    await sharp(Buffer.from(appleSvg)).png().toFile(path.join(PREVIEW_DIR, 'apple-touch-icon.png'));
    console.log('  ✓ apple-touch-icon.png');
    
    console.log('\n✅ Preview icons saved to public/icons/preview-idea4/');
  } else {
    for (const size of SIZES) {
      fs.writeFileSync(path.join(PREVIEW_DIR, `icon-${size}.svg`), createIconSVG(size, false));
      console.log(`  ✓ icon-${size}.svg`);
    }
    console.log('\n⚠️  SVG placeholders created. For PNGs: npm install -D sharp');
  }
}

generateIcons().catch(console.error);