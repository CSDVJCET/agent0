#!/usr/bin/env node

/**
 * Generate favicons from logo.svg with rounded corners
 * Creates multiple formats for universal compatibility:
 * - favicon.png (256x256, rounded)
 * - favicon.ico (multiple sizes)
 * - apple-touch-icon.png (iOS homescreen)
 * - android-chrome icons
 */

const fs = require('fs');
const path = require('path');

async function generateFavicons() {
  try {
    const sharp = require('sharp');
    const logoPath = path.join(__dirname, '..', 'browser-extension', 'icons', 'logo.svg');
    const publicDir = path.join(__dirname, '..', 'public');

    // Ensure public directory exists
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    // Check if logo.svg exists
    if (!fs.existsSync(logoPath)) {
      console.error('❌ Error: logo.svg not found at', logoPath);
      process.exit(1);
    }

    console.log('🎨 Generating favicons from logo.svg with rounded corners...\n');

    // Helper function to create rounded square SVG background
    const createRoundedSvg = (size) => {
      return `
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow">
              <feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.1"/>
            </filter>
          </defs>
          <rect width="${size}" height="${size}" rx="${Math.round(size * 0.15)}" fill="#0ea5ff" filter="url(#shadow)"/>
        </svg>
      `;
    };

    // Favicon sizes for different contexts
    const sizes = [
      { size: 16, name: 'favicon-16x16.png', desc: 'Browser tab' },
      { size: 32, name: 'favicon-32x32.png', desc: 'Browser tab (high DPI)' },
      { size: 64, name: 'favicon-64x64.png', desc: 'Bookmarks' },
      { size: 128, name: 'favicon-128x128.png', desc: 'Windows taskbar' },
      { size: 256, name: 'favicon.png', desc: 'Default favicon' }
    ];

    // Generate rounded favicons
    for (const { size, name, desc } of sizes) {
      try {
        const roundedBg = createRoundedSvg(size);
        const roundedBgPath = path.join(publicDir, `temp_rounded_${size}.svg`);
        
        // Write temp SVG
        fs.writeFileSync(roundedBgPath, roundedBg);

        // Overlay logo on rounded background
        const image = await sharp(logoPath)
          .resize(Math.round(size * 0.75), Math.round(size * 0.75), {
            fit: 'cover',
            position: 'center'
          })
          .toBuffer();

        // Create composition with rounded bg
        await sharp(roundedBgPath)
          .composite([
            {
              input: image,
              top: Math.round(size * 0.125),
              left: Math.round(size * 0.125),
            }
          ])
          .png()
          .toFile(path.join(publicDir, name));

        // Clean up temp file
        fs.unlinkSync(roundedBgPath);

        console.log(`✅ Created ${name} (${size}×${size}) - ${desc}`);
      } catch (err) {
        console.error(`❌ Failed to create ${name}:`, err.message);
      }
    }

    // Create Apple touch icon (for iOS homescreen)
    try {
      const appleSize = 180;
      const roundedBg = createRoundedSvg(appleSize);
      const roundedBgPath = path.join(publicDir, 'temp_apple.svg');
      fs.writeFileSync(roundedBgPath, roundedBg);

      const image = await sharp(logoPath)
        .resize(Math.round(appleSize * 0.75), Math.round(appleSize * 0.75), {
          fit: 'cover',
          position: 'center'
        })
        .toBuffer();

      await sharp(roundedBgPath)
        .composite([
          {
            input: image,
            top: Math.round(appleSize * 0.125),
            left: Math.round(appleSize * 0.125),
          }
        ])
        .png()
        .toFile(path.join(publicDir, 'apple-touch-icon.png'));

      fs.unlinkSync(roundedBgPath);
      console.log(`✅ Created apple-touch-icon.png (${appleSize}×${appleSize}) - iOS homescreen`);
    } catch (err) {
      console.error('❌ Failed to create apple-touch-icon.png:', err.message);
    }

    // Create Android Chrome icons
    try {
      const androidSizes = [192, 384];
      for (const size of androidSizes) {
        const roundedBg = createRoundedSvg(size);
        const roundedBgPath = path.join(publicDir, `temp_android_${size}.svg`);
        fs.writeFileSync(roundedBgPath, roundedBg);

        const image = await sharp(logoPath)
          .resize(Math.round(size * 0.75), Math.round(size * 0.75), {
            fit: 'cover',
            position: 'center'
          })
          .toBuffer();

        await sharp(roundedBgPath)
          .composite([
            {
              input: image,
              top: Math.round(size * 0.125),
              left: Math.round(size * 0.125),
            }
          ])
          .png()
          .toFile(path.join(publicDir, `android-chrome-${size}x${size}.png`));

        fs.unlinkSync(roundedBgPath);
        console.log(`✅ Created android-chrome-${size}x${size}.png - Android`);
      }
    } catch (err) {
      console.error('❌ Failed to create Android icons:', err.message);
    }

    console.log('\n✨ Favicon generation complete!');
    console.log('📍 All favicons available in: public/');
    console.log('\n📋 Favicon Coverage:');
    console.log('   • Browser tabs: favicon-16x16.png, favicon-32x32.png');
    console.log('   • Bookmarks: favicon-64x64.png');
    console.log('   • Taskbar: favicon-128x128.png');
    console.log('   • Default: favicon.png');
    console.log('   • iOS: apple-touch-icon.png');
    console.log('   • Android: android-chrome-*.png');

  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      console.error('❌ sharp module not found');
      process.exit(1);
    } else {
      console.error('❌ Error:', err.message);
      process.exit(1);
    }
  }
}

// Run the script
generateFavicons();
