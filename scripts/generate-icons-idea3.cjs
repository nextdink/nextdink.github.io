/**
 * PWA Icon Generator - Idea 3: Abstract Paddle Silhouette
 * 
 * A minimal pickleball paddle shape (rounded rectangle with handle)
 * filled with brand color, with "ND" on the paddle face.
 * 
 * Run with: node scripts/generate-icons-idea3.cjs
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

const PREVIEW_DIR = path.join(__dirname, '..', 'public', 'icons', 'preview-idea3');
const BRAND_COLOR = '#0e7490';
const BRAND_COLOR_LIGHT = '#0891b2';

const SIZES = [192, 512];

function createIconSVG(size, isMaskable = false) {
  const padding = isMaskable ? size * 0.15 : 0;
  const center = size / 2;
  const innerSize = size - padding * 2;
  
  // Paddle dimensions
  const paddleWidth = innerSize * 0.52;
  const paddleHeight = innerSize * 0.58;
  const paddleX = center - paddleWidth / 2;
  const paddleY = center - innerSize * 0.32;
  const paddleRadius = paddleWidth * 0.35;
  
  // Handle dimensions
  const handleWidth = innerSize * 0.14;
  const handleHeight = innerSize * 0.22;
  const handleX = center - handleWidth / 2;
  const handleY = paddleY + paddleHeight - 2;
  const handleRadius = handleWidth * 0.3;
  
  // Grip lines on handle
  const gripSpacing = handleHeight * 0.18;
  const gripStartY = handleY + handleHeight * 0.25;
  let gripLines = '';
  for (let i = 0; i < 4; i++) {
    const y = gripStartY + i * gripSpacing;
    gripLines += `<line x1="${handleX + handleWidth * 0.25}" y1="${y}" x2="${handleX + handleWidth * 0.75}" y2="${y}" stroke="rgba(255,255,255,0.15)" stroke-width="${size * 0.004}" stroke-linecap="round"/>`;
  }
  
  // Text on paddle face
  const textSize = paddleWidth * 0.48;
  const textY = paddleY + paddleHeight * 0.45;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${BRAND_COLOR_LIGHT};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${BRAND_COLOR};stop-opacity:1" />
    </linearGradient>
    <linearGradient id="paddle" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(255,255,255,0.95);stop-opacity:1" />
      <stop offset="100%" style="stop-color:rgba(255,255,255,0.85);stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
  
  <!-- Handle -->
  <rect x="${handleX}" y="${handleY}" width="${handleWidth}" height="${handleHeight}" rx="${handleRadius}" fill="rgba(255,255,255,0.7)"/>
  ${gripLines}
  
  <!-- Paddle face -->
  <rect x="${paddleX}" y="${paddleY}" width="${paddleWidth}" height="${paddleHeight}" rx="${paddleRadius}" fill="url(#paddle)"/>
  
  <!-- Edge highlight -->
  <rect x="${paddleX}" y="${paddleY}" width="${paddleWidth}" height="${paddleHeight}" rx="${paddleRadius}" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="${size * 0.004}"/>
  
  <!-- "ND" text on paddle -->
  <text 
    x="${center}" 
    y="${textY}" 
    font-family="system-ui, -apple-system, sans-serif" 
    font-size="${textSize}px" 
    font-weight="800" 
    letter-spacing="${size * 0.01}px"
    fill="${BRAND_COLOR}" 
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
    console.log('🎨 Idea 3: Abstract Paddle Silhouette');
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
    
    console.log('\n✅ Preview icons saved to public/icons/preview-idea3/');
  } else {
    for (const size of SIZES) {
      fs.writeFileSync(path.join(PREVIEW_DIR, `icon-${size}.svg`), createIconSVG(size, false));
      console.log(`  ✓ icon-${size}.svg`);
    }
    console.log('\n⚠️  SVG placeholders created. For PNGs: npm install -D sharp');
  }
}

generateIcons().catch(console.error);