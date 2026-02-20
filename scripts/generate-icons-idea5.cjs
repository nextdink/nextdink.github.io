/**
 * PWA Icon Generator - Idea 5: Stylized Pickleball
 * 
 * A pickleball (circle with characteristic holes) as the main icon.
 * The ball sits centered on a brand-colored background. No text needed —
 * the ball itself becomes the brand mark.
 * 
 * Run with: node scripts/generate-icons-idea5.cjs
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

const PREVIEW_DIR = path.join(__dirname, '..', 'public', 'icons', 'preview-idea5');
const BRAND_COLOR = '#0e7490';
const BRAND_COLOR_LIGHT = '#0891b2';

const SIZES = [192, 512];

function createIconSVG(size, isMaskable = false) {
  const padding = isMaskable ? size * 0.15 : 0;
  const center = size / 2;
  const innerSize = size - padding * 2;
  
  // Ball dimensions
  const ballRadius = innerSize * 0.35;
  const holeRadius = ballRadius * 0.095;
  
  // Pickleball has ~40 evenly distributed holes
  // We'll create a simplified but recognizable pattern
  // Using concentric rings of holes
  const holes = [];
  
  // Ring 1: Inner ring (6 holes)
  const ring1Radius = ballRadius * 0.3;
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 6;
    holes.push({
      x: center + Math.cos(angle) * ring1Radius,
      y: center + Math.sin(angle) * ring1Radius,
    });
  }
  
  // Ring 2: Middle ring (10 holes)
  const ring2Radius = ballRadius * 0.55;
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    holes.push({
      x: center + Math.cos(angle) * ring2Radius,
      y: center + Math.sin(angle) * ring2Radius,
    });
  }
  
  // Ring 3: Outer ring (14 holes)
  const ring3Radius = ballRadius * 0.78;
  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * Math.PI * 2 + Math.PI / 14;
    holes.push({
      x: center + Math.cos(angle) * ring3Radius,
      y: center + Math.sin(angle) * ring3Radius,
    });
  }
  
  const holesMarkup = holes.map(h => 
    `<circle cx="${h.x}" cy="${h.y}" r="${holeRadius}" fill="${BRAND_COLOR}" opacity="0.6"/>`
  ).join('\n  ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${BRAND_COLOR_LIGHT};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${BRAND_COLOR};stop-opacity:1" />
    </linearGradient>
    <radialGradient id="ball" cx="40%" cy="35%" r="60%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e2e8f0;stop-opacity:1" />
    </radialGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="${size * 0.01}" stdDeviation="${size * 0.015}" flood-color="${BRAND_COLOR}" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
  
  <!-- Ball shadow -->
  <circle cx="${center}" cy="${center + size * 0.01}" r="${ballRadius}" fill="rgba(0,0,0,0.1)"/>
  
  <!-- Pickleball -->
  <circle cx="${center}" cy="${center}" r="${ballRadius}" fill="url(#ball)"/>
  
  <!-- Ball edge -->
  <circle cx="${center}" cy="${center}" r="${ballRadius}" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="${size * 0.004}"/>
  
  <!-- Seam line (equator) -->
  <ellipse cx="${center}" cy="${center}" rx="${ballRadius * 0.98}" ry="${ballRadius * 0.15}" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="${size * 0.003}" transform="rotate(-15, ${center}, ${center})"/>
  
  <!-- Holes -->
  ${holesMarkup}
  
  <!-- Highlight -->
  <circle cx="${center - ballRadius * 0.25}" cy="${center - ballRadius * 0.25}" r="${ballRadius * 0.2}" fill="white" opacity="0.15"/>
</svg>`;
}

async function generateIcons() {
  if (!fs.existsSync(PREVIEW_DIR)) {
    fs.mkdirSync(PREVIEW_DIR, { recursive: true });
  }

  if (sharp) {
    console.log('🎨 Idea 5: Stylized Pickleball');
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
    
    console.log('\n✅ Preview icons saved to public/icons/preview-idea5/');
  } else {
    for (const size of SIZES) {
      fs.writeFileSync(path.join(PREVIEW_DIR, `icon-${size}.svg`), createIconSVG(size, false));
      console.log(`  ✓ icon-${size}.svg`);
    }
    console.log('\n⚠️  SVG placeholders created. For PNGs: npm install -D sharp');
  }
}

generateIcons().catch(console.error);