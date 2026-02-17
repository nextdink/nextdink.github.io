/**
 * PWA Icon Generator Script
 * 
 * This script generates placeholder PWA icons for Next Dink.
 * Run with: node scripts/generate-icons.js
 * 
 * Requires: npm install sharp (as a dev dependency)
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('Sharp not installed. Creating SVG placeholders instead.');
  console.log('To generate PNG icons, run: npm install -D sharp && node scripts/generate-icons.js');
  sharp = null;
}

const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');
const BRAND_COLOR = '#0e7490'; // Primary brand color (cyan-700)
const BRAND_COLOR_LIGHT = '#0891b2'; // Lighter shade (cyan-600)

// Icon sizes needed for PWA
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const MASKABLE_SIZES = [192, 512];

// Create SVG for the main app icon (pickleball paddle silhouette with "ND")
function createIconSVG(size, isMaskable = false) {
  const padding = isMaskable ? size * 0.1 : 0; // Maskable icons need safe zone padding
  const innerSize = size - (padding * 2);
  const center = size / 2;
  const radius = innerSize / 2;
  
  // For maskable icons, use a larger background
  const bgRadius = isMaskable ? size / 2 : radius;
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <!-- Background circle -->
  <circle cx="${center}" cy="${center}" r="${bgRadius}" fill="${BRAND_COLOR}"/>
  
  <!-- Inner gradient circle -->
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${BRAND_COLOR_LIGHT};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${BRAND_COLOR};stop-opacity:1" />
    </linearGradient>
  </defs>
  <circle cx="${center}" cy="${center}" r="${radius * 0.9}" fill="url(#grad)"/>
  
  <!-- "ND" text -->
  <text 
    x="${center}" 
    y="${center}" 
    font-family="system-ui, -apple-system, sans-serif" 
    font-size="${innerSize * 0.4}px" 
    font-weight="700" 
    fill="white" 
    text-anchor="middle" 
    dominant-baseline="central"
  >ND</text>
</svg>`;
}

// Create SVG for shortcut icons
function createShortcutSVG(size, iconType) {
  const center = size / 2;
  const iconSize = size * 0.5;
  
  let iconPath = '';
  if (iconType === 'create') {
    // Plus icon
    const strokeWidth = size * 0.08;
    const halfIcon = iconSize / 2;
    iconPath = `
      <line x1="${center}" y1="${center - halfIcon}" x2="${center}" y2="${center + halfIcon}" 
            stroke="white" stroke-width="${strokeWidth}" stroke-linecap="round"/>
      <line x1="${center - halfIcon}" y1="${center}" x2="${center + halfIcon}" y2="${center}" 
            stroke="white" stroke-width="${strokeWidth}" stroke-linecap="round"/>
    `;
  } else if (iconType === 'discover') {
    // Search/compass icon (simplified compass)
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

// Create badge icon (for notification badges)
function createBadgeSVG(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="${BRAND_COLOR}"/>
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
  // Ensure icons directory exists
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
  }

  if (sharp) {
    console.log('Generating PNG icons with Sharp...');
    
    // Generate main icons
    for (const size of SIZES) {
      const svg = createIconSVG(size, false);
      const outputPath = path.join(ICONS_DIR, `icon-${size}.png`);
      
      await sharp(Buffer.from(svg))
        .png()
        .toFile(outputPath);
      
      console.log(`Created: icon-${size}.png`);
    }
    
    // Generate maskable icons
    for (const size of MASKABLE_SIZES) {
      const svg = createIconSVG(size, true);
      const outputPath = path.join(ICONS_DIR, `icon-maskable-${size}.png`);
      
      await sharp(Buffer.from(svg))
        .png()
        .toFile(outputPath);
      
      console.log(`Created: icon-maskable-${size}.png`);
    }
    
    // Generate Apple touch icon (180x180)
    const appleSvg = createIconSVG(180, false);
    await sharp(Buffer.from(appleSvg))
      .png()
      .toFile(path.join(ICONS_DIR, 'apple-touch-icon.png'));
    console.log('Created: apple-touch-icon.png');
    
    // Generate shortcut icons
    const shortcutCreateSvg = createShortcutSVG(96, 'create');
    await sharp(Buffer.from(shortcutCreateSvg))
      .png()
      .toFile(path.join(ICONS_DIR, 'shortcut-create.png'));
    console.log('Created: shortcut-create.png');
    
    const shortcutDiscoverSvg = createShortcutSVG(96, 'discover');
    await sharp(Buffer.from(shortcutDiscoverSvg))
      .png()
      .toFile(path.join(ICONS_DIR, 'shortcut-discover.png'));
    console.log('Created: shortcut-discover.png');
    
    // Generate badge icon (72x72 for notification badges)
    const badgeSvg = createBadgeSVG(72);
    await sharp(Buffer.from(badgeSvg))
      .png()
      .toFile(path.join(ICONS_DIR, 'badge-72.png'));
    console.log('Created: badge-72.png');
    
    // Generate favicon (32x32)
    const faviconSvg = createIconSVG(32, false);
    await sharp(Buffer.from(faviconSvg))
      .png()
      .toFile(path.join(ICONS_DIR, 'favicon-32.png'));
    console.log('Created: favicon-32.png');
    
    // Generate favicon.ico alternative (16x16)
    const favicon16Svg = createIconSVG(16, false);
    await sharp(Buffer.from(favicon16Svg))
      .png()
      .toFile(path.join(ICONS_DIR, 'favicon-16.png'));
    console.log('Created: favicon-16.png');
    
    console.log('\n✅ All PNG icons generated successfully!');
    
  } else {
    console.log('Creating SVG placeholders...');
    
    // Generate main SVG icons
    for (const size of SIZES) {
      const svg = createIconSVG(size, false);
      const outputPath = path.join(ICONS_DIR, `icon-${size}.svg`);
      fs.writeFileSync(outputPath, svg);
      console.log(`Created: icon-${size}.svg`);
    }
    
    // Generate maskable SVG icons
    for (const size of MASKABLE_SIZES) {
      const svg = createIconSVG(size, true);
      const outputPath = path.join(ICONS_DIR, `icon-maskable-${size}.svg`);
      fs.writeFileSync(outputPath, svg);
      console.log(`Created: icon-maskable-${size}.svg`);
    }
    
    // Generate Apple touch icon
    const appleSvg = createIconSVG(180, false);
    fs.writeFileSync(path.join(ICONS_DIR, 'apple-touch-icon.svg'), appleSvg);
    console.log('Created: apple-touch-icon.svg');
    
    console.log('\n⚠️  SVG placeholders created. For PNG icons:');
    console.log('   npm install -D sharp && node scripts/generate-icons.js');
  }
}

generateIcons().catch(console.error);