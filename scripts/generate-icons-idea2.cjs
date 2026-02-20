/**
 * PWA Icon Generator - Idea 2: Pickleball Texture + "ND" Wordmark
 * 
 * Full-bleed background with subtle pickleball hole pattern as texture,
 * with bold "ND" text prominently in the center.
 * 
 * Run with: node scripts/generate-icons-idea2.cjs
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

const PREVIEW_DIR = path.join(__dirname, '..', 'public', 'icons', 'preview-idea2');
const BRAND_COLOR = '#0e7490';
const BRAND_COLOR_LIGHT = '#0891b2';
const BRAND_COLOR_DARK = '#0c4a5e';

const SIZES = [192, 512];

function createIconSVG(size, isMaskable = false) {
  const padding = isMaskable ? size * 0.15 : 0;
  const textSize = (size - padding * 2) * 0.38;
  const center = size / 2;
  
  // Generate pickleball hole pattern
  const holeRadius = size * 0.028;
  const holeColor = 'rgba(255,255,255,0.08)';
  const holeStroke = 'rgba(255,255,255,0.12)';
  
  // Create a grid of holes across the background (pickleball pattern)
  const spacing = size * 0.09;
  let holes = '';
  for (let row = 0; row < Math.ceil(size / spacing) + 1; row++) {
    for (let col = 0; col < Math.ceil(size / spacing) + 1; col++) {
      const x = col * spacing + (row % 2 === 0 ? 0 : spacing / 2);
      const y = row * spacing;
      
      // Skip holes that would overlap with the text area
      const distFromCenter = Math.sqrt((x - center) ** 2 + (y - center) ** 2);
      if (distFromCenter < size * 0.25) continue;
      
      holes += `<circle cx="${x}" cy="${y}" r="${holeRadius}" fill="${holeColor}" stroke="${holeStroke}" stroke-width="${size * 0.003}"/>`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${BRAND_COLOR_LIGHT};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${BRAND_COLOR};stop-opacity:1" />
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:${BRAND_COLOR_LIGHT};stop-opacity:0.3" />
      <stop offset="100%" style="stop-color:${BRAND_COLOR_DARK};stop-opacity:0" />
    </radialGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
  
  <!-- Pickleball hole pattern -->
  ${holes}
  
  <!-- Center glow behind text -->
  <circle cx="${center}" cy="${center}" r="${size * 0.3}" fill="url(#glow)"/>
  
  <!-- "ND" text -->
  <text 
    x="${center}" 
    y="${center}" 
    font-family="system-ui, -apple-system, sans-serif" 
    font-size="${textSize}px" 
    font-weight="800" 
    letter-spacing="${size * 0.02}px"
    fill="white" 
    text-anchor="middle" 
    dominant-baseline="central"
  >ND</text>
</svg>`;
}

async function generateIcons() {
  if (!fs.existsSync(PREVIEW_DIR)) {
    fs.mkdirSync(PREVIEW_DIR, { recursive: true });
  }

  if (sharp) {
    console.log('🎨 Idea 2: Pickleball Texture + "ND"');
    console.log('Generating preview icons...\n');
    
    for (const size of SIZES) {
      const svg = createIconSVG(size, false);
      await sharp(Buffer.from(svg)).png().toFile(path.join(PREVIEW_DIR, `icon-${size}.png`));
      console.log(`  ✓ icon-${size}.png`);
    }

    // Maskable version
    const maskSvg = createIconSVG(512, true);
    await sharp(Buffer.from(maskSvg)).png().toFile(path.join(PREVIEW_DIR, `icon-maskable-512.png`));
    console.log(`  ✓ icon-maskable-512.png`);

    // Apple touch icon
    const appleSvg = createIconSVG(180, false);
    await sharp(Buffer.from(appleSvg)).png().toFile(path.join(PREVIEW_DIR, 'apple-touch-icon.png'));
    console.log('  ✓ apple-touch-icon.png');
    
    console.log('\n✅ Preview icons saved to public/icons/preview-idea2/');
  } else {
    for (const size of SIZES) {
      fs.writeFileSync(path.join(PREVIEW_DIR, `icon-${size}.svg`), createIconSVG(size, false));
      console.log(`  ✓ icon-${size}.svg`);
    }
    console.log('\n⚠️  SVG placeholders created. For PNGs: npm install -D sharp');
  }
}

generateIcons().catch(console.error);