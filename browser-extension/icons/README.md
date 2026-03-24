# Logo & Icon Guide

This directory contains the Agent0 logo and browser extension icons.

## Files

- **logo.svg** - Master logo file with cloud animation
- **icon16.png** - 16×16px browser extension icon
- **icon48.png** - 48×48px browser extension icon
- **icon128.png** - 128×128px browser extension icon
- **icon.svg** - Legacy SVG file (placeholder)

## Generating Icons

All icons are generated from `logo.svg` using the icon generation script.

### Generate Extension Icons

From the root directory:
```bash
npm run generate:icons
```

This creates PNG files (16, 48, 128) from the logo.svg using the Sharp library.

### How It Works

The `create-icons.js` script:
1. Reads `logo.svg` 
2. Resizes to each required dimension
3. Centers and crops the output
4. Saves as PNG with proper compression

## updating the Logo

Edit `logo.svg` and regenerate:
```bash
npm run generate:icons
```

The new icons will be created automatically, and the browser extension will use them after reload.

## Icon Specifications

- **icon16.png**: 16×16 pixels (toolbar, context menus)
- **icon48.png**: 48×48 pixels (extension page, popups)
- **icon128.png**: 128×128 pixels (store listings, large displays)

All are embedded in `manifest.json` at different scales for optimal display.

## Logo Design

The logo features:
- Blue sky background (#0ea5ff)
- Floating white clouds with CSS animations
- Clean, simple design that scales well
- Animated SVG (animation is not preserved in PNG conversion)
- **Photoshop/GIMP**: Create and export at required sizes

### Design Suggestions

For a professional look:
- Use Agent0's brand colors (blue: #3b82f6)
- Include a camera or screenshot symbol
- Keep it simple and recognizable at small sizes
- Ensure good contrast for both light and dark themes

## Quick Icon Creation (SVG to PNG)

If you have an SVG icon, you can convert it to PNG:

```bash
# Using ImageMagick
magick convert -density 300 -background none icon.svg -resize 16x16 icon16.png
magick convert -density 300 -background none icon.svg -resize 48x48 icon48.png
magick convert -density 300 -background none icon.svg -resize 128x128 icon128.png
```

## Temporary Placeholder

Until you create custom icons, you can use emoji-based icons or simple colored squares. The extension will work without them, but browsers will show a default icon.
