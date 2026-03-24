#!/usr/bin/env node

/**
 * Script to convert logo.svg to PNG icons for the browser extension
 * Requires: npm install sharp
 */

const fs = require('fs');
const path = require('path');

async function createIconsFromSvg() {
  try {
    const sharp = require('sharp');
    const logoPath = path.join(__dirname, 'icons', 'logo.svg');
    const iconsDir = path.join(__dirname, 'icons');

    // Ensure icons directory exists
    if (!fs.existsSync(iconsDir)) {
      fs.mkdirSync(iconsDir, { recursive: true });
    }

    // Check if logo.svg exists
    if (!fs.existsSync(logoPath)) {
      console.error('❌ Error: logo.svg not found at', logoPath);
      console.error('Please ensure logo.svg exists in the icons directory');
      process.exit(1);
    }

    // Define icon sizes for browser extension
    const sizes = [16, 48, 128];

    console.log('🎨 Creating browser extension icons from logo.svg...\n');

    // Create each size
    for (const size of sizes) {
      const outputPath = path.join(iconsDir, `icon${size}.png`);

      try {
        await sharp(logoPath)
          .resize(size, size, {
            fit: 'cover',
            position: 'center'
          })
          .png()
          .toFile(outputPath);

        console.log(`✅ Created icon${size}.png (${size}x${size}px)`);
      } catch (err) {
        console.error(`❌ Failed to create icon${size}.png:`, err.message);
      }
    }

    console.log('\n✨ Icon generation complete!');
    console.log('📦 Icons are ready for the browser extension');

  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      console.error('❌ sharp module not found');
      console.error('\nTo fix, install sharp:');
      console.error('  npm install sharp\n');
      console.error('Then run this script again:');
      console.error('  node create-icons.js\n');
      process.exit(1);
    } else {
      console.error('❌ Error:', err.message);
      process.exit(1);
    }
  }
}

// Run the script
createIconsFromSvg();
