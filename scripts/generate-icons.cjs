/**
 * PWA Icon Generator - Idea 1: Full-Bleed Solid Background + "ND" Wordmark
 * 
 * Clean, modern square icon with brand color fill and bold "ND" text.
 * iOS applies squircle mask, Android applies circle mask — both look great.
 * 
 * Run with: node scripts/generate-icons.cjs
 * Requires: npm install -D sharp
 */

const fs = require('fs');
const path = require('path');

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('Sharp not installed. Creating SVG placeholders instead.');
  console.log('To generate PNG icons, run: npm install -D sharp && node scripts/generate-icons.cjs');
  sharp = null;
}

const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');
const BRAND_COLOR = '#0e7490';
const BRAND_COLOR_LIGHT = '#0891b2';

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const MASKABLE_SIZES = [192, 512];

function createIconSVG(size, isMaskable = false) {
  const padding = isMaskable ? size * 0.15 : 0;
  const textSize = (size - padding * 2) * 0.38;
  const center = size / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${BRAND_COLOR_LIGHT};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${BRAND_COLOR};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
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

function createShortcutSVG(size, iconType) {
  const center = size / 2;
  const iconSize = size * 0.5;
  
  let iconPath = '';
  if (iconType === 'create') {
    const strokeWidth = size * 0.08;
    const halfIcon = iconSize / 2;
    iconPath = `
      <line x1="${center}" y1="${center - halfIcon}" x2="${center}" y2="${center + halfIcon}" 
            stroke="white" stroke-width="${strokeWidth}" stroke-linecap="round"/>
      <line x1="${center - halfIcon}" y1="${center}" x2="${center + halfIcon}" y2="${center}" 
            stroke="white" stroke-width="${strokeWidth}" stroke-linecap="round"/>
    `;
  } else if (iconType === 'discover') {
    const r = iconSize * 0.4;
    iconPath = `
      <circle cx="${center}" cy="${center}" r="${r}" fill="none" stroke="white" stroke-width="${size * 0.06}"/>
      <circle cx="${center}" cy="${center}" r="${r * 0.15}" fill="white"/>
      <line x1="${center}" y1="${center - r * 0.6}" x2="${center}" y2="${center - r * 0.3}" 
            stroke="white" stroke-width="${size * 0.04}" stroke-linecap="round"/>
    `;
  }
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="${BRAND_COLOR}"/>
  ${iconPath}
</svg>`;
}

function createBadgeSVG(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="${BRAND_COLOR}"/>
  <text 
    x="${size/2}" 
    y="${size/2}" 
    font-family="system-ui, -apple-system, sans-serif" 
    font-size="${size * 0.5}px" 
    font-weight="700" 
    fill="white" 
    text-anchor="middle" 
    dominant-baseline="central"
  >N</text>
</svg>`;
}

async function generateIcons() {
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
  }

  if (sharp) {
    console.log('🎨 Idea 1: Full-Bleed Solid + "ND" Wordmark');
    console.log('Generating PNG icons with Sharp...\n');
    
    for (const size of SIZES) {
      const svg = createIconSVG(size, false);
      await sharp(Buffer.from(svg)).png().toFile(path.join(ICONS_DIR, `icon-${size}.png`));
      console.log(`  ✓ icon-${size}.png`);
    }
    
    for (const size of MASKABLE_SIZES) {
      const svg = createIconSVG(size, true);
      await sharp(Buffer.from(svg)).png().toFile(path.join(ICONS_DIR, `icon-maskable-${size}.png`));
      console.log(`  ✓ icon-maskable-${size}.png`);
    }
    
    const appleSvg = createIconSVG(180, false);
    await sharp(Buffer.from(appleSvg)).png().toFile(path.join(ICONS_DIR, 'apple-touch-icon.png'));
    console.log('  ✓ apple-touch-icon.png');
    
    const shortcutCreateSvg = createShortcutSVG(96, 'create');
    await sharp(Buffer.from(shortcutCreateSvg)).png().toFile(path.join(ICONS_DIR, 'shortcut-create.png'));
    console.log('  ✓ shortcut-create.png');
    
    const shortcutDiscoverSvg = createShortcutSVG(96, 'discover');
    await sharp(Buffer.from(shortcutDiscoverSvg)).png().toFile(path.join(ICONS_DIR, 'shortcut-discover.png'));
    console.log('  ✓ shortcut-discover.png');
    
    const badgeSvg = createBadgeSVG(72);
    await sharp(Buffer.from(badgeSvg)).png().toFile(path.join(ICONS_DIR, 'badge-72.png'));
    console.log('  ✓ badge-72.png');
    
    const faviconSvg = createIconSVG(32, false);
    await sharp(Buffer.from(faviconSvg)).png().toFile(path.join(ICONS_DIR, 'favicon-32.png'));
    console.log('  ✓ favicon-32.png');
    
    const favicon16Svg = createIconSVG(16, false);
    await sharp(Buffer.from(favicon16Svg)).png().toFile(path.join(ICONS_DIR, 'favicon-16.png'));
    console.log('  ✓ favicon-16.png');
    
    console.log('\n✅ All icons generated!');
  } else {
    console.log('Creating SVG placeholders...');
    for (const size of SIZES) {
      fs.writeFileSync(path.join(ICONS_DIR, `icon-${size}.svg`), createIconSVG(size, false));
      console.log(`  ✓ icon-${size}.svg`);
    }
    for (const size of MASKABLE_SIZES) {
      fs.writeFileSync(path.join(ICONS_DIR, `icon-maskable-${size}.svg`), createIconSVG(size, true));
      console.log(`  ✓ icon-maskable-${size}.svg`);
    }
    fs.writeFileSync(path.join(ICONS_DIR, 'apple-touch-icon.svg'), createIconSVG(180, false));
    console.log('  ✓ apple-touch-icon.svg');
    console.log('\n⚠️  SVG placeholders created. For PNGs: npm install -D sharp && node scripts/generate-icons.cjs');
  }
}

generateIcons().catch(console.error);