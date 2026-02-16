# Slides Tool - Reveal.js Presentation Creator

## Overview

The **@slides** tool creates beautiful, professional HTML presentations using reveal.js. It generates visually stunning slides with:
- 🖼️ Automatic image integration from Unsplash
- 🎨 Multiple image frame styles (elevated, rounded-border, polaroid, glass, neon)
- ✨ Smooth animations and transitions
- 🎭 Professional themes with custom color schemes
- 📱 Fully responsive design

## Usage

### Basic Usage

Simply mention `@slides` in your chat and describe the presentation you want:

```
@slides create a presentation about AI in healthcare with 5 slides
```

### Advanced Usage

You can specify details like:
- Topic and keywords
- Number of slides
- Color scheme
- Layout preferences

```
@slides make a tech presentation about cloud computing with 8 slides using the energy theme
```

## Features

### 1. Image Integration

Every slide automatically includes relevant, high-quality images from Unsplash:
- **Title slides**: Hero background images with gradient overlays
- **Content slides**: 1-3 contextual images per slide
- **Section dividers**: Full-screen backgrounds
- **Image grids**: Multiple images in professional layouts

### 2. Image Frame Styles

Choose from 5 professional frame styles:
- **Elevated**: Floating cards with shadows and hover effects
- **Rounded Border**: Gradient borders with rounded corners
- **Polaroid**: Vintage photo frame style
- **Glass**: Glassmorphism with blur effects
- **Neon**: Glowing borders with shadow effects

### 3. Animations

- **Fragment animations**: Content reveals progressively (fade-in, grow, highlight)
- **Slide transitions**: Smooth transitions between slides (slide, zoom, convex, fade)
- **Image animations**: Zoom and fade effects for images
- **Auto-collapse reasoning**: Thinking process auto-collapses when complete

### 4. Layout Options

- **Single-column**: Standard layout with title, image, and text
- **Two-column**: Side-by-side comparisons with images
- **Image-focused**: Large central image with minimal text
- **Full-background**: Text overlay on full-screen background
- **Image-grid**: 2-3 images in grid layout

### 5. Color Schemes

Choose from 4 pre-built themes or customize:
- **Tech** (default): Blues and purples (#667eea, #764ba2)
- **Energy**: Reds and oranges (#ff6b6b, #feca57)
- **Nature**: Greens and teals (#26de81, #20bf6b)
- **Luxury**: Gold and black (#f39c12, #2c3e50)
- **Custom**: Specify your own colors

## How It Works

1. **AI analyzes** your request and extracts:
   - Presentation title and topic
   - Number of slides needed
   - Key points to cover
   - Visual style preferences

2. **Generates slides** with:
   - Relevant title and content for each slide
   - Appropriate layout based on content type
   - Image search keywords for Unsplash API
   - Animation and transition effects

3. **Creates HTML** with:
   - Complete reveal.js presentation
   - Embedded CSS styling
   - Custom color scheme
   - All images and animations

4. **Delivers result** as:
   - Downloadable HTML file
   - Preview in new tab
   - Complete with all features working

## Example Presentations

### Business Presentation
```
@slides create a business presentation about quarterly results with 6 slides using the luxury theme
```

Generates:
- Title slide with hero image
- Revenue overview with charts metaphor
- Key metrics in image grid
- Challenges and solutions (two-column)
- Future outlook (full-background)
- Closing slide

### Technical Presentation
```
@slides make a tech presentation about microservices architecture with 8 slides
```

Generates:
- Title slide with technology background
- What are microservices (single-column with diagram image)
- Benefits (image grid with 3 images)
- Architecture diagram (image-focused)
- Best practices (two-column)
- Case studies (full-background)
- Implementation steps (single-column)
- Q&A slide

### Educational Presentation
```
@slides create an educational presentation about climate change with 10 slides using the nature theme
```

Generates:
- Hero title slide with earth image
- What is climate change (definition + image)
- Causes (image grid)
- Effects (two-column comparison)
- Statistics (full-background with overlay)
- Solutions (multiple content slides)
- Call to action (closing slide)

## Tips for Best Results

1. **Be specific about content**: "AI in healthcare" → "How AI helps diagnose diseases early"
2. **Mention key points**: "Include benefits, challenges, and future trends"
3. **Specify slide count**: "Create 8 slides" → better pacing
4. **Choose appropriate theme**: Tech themes for business, nature for environmental topics
5. **Let AI infer images**: The tool automatically finds relevant images

## Output

The tool generates:
- ✅ Complete HTML file with embedded styles and scripts
- ✅ Works offline (CDN links for reveal.js)
- ✅ Ready to present in any browser
- ✅ Keyboard navigation (arrows, space)
- ✅ Touch support for mobile
- ✅ Print-friendly

## Technical Details

### Reveal.js Version
- Uses reveal.js 5.0.4 from CDN
- Black theme as base
- Custom CSS overrides for styling

### Image Source
- Unsplash Source API for dynamic images
- Format: `https://source.unsplash.com/1600x900/?keyword1,keyword2`
- High-quality, royalty-free images

### Browser Compatibility
- Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile responsive
- Touch gestures supported

### Customization
Users can edit the generated HTML to:
- Change images (replace URLs)
- Modify text content
- Adjust colors (CSS variables)
- Add more slides
- Change transitions

## Keyboard Shortcuts (in generated presentation)

- **Arrow keys**: Navigate slides
- **Space**: Next slide
- **Esc**: Overview mode
- **F**: Fullscreen
- **S**: Speaker notes (if added)

## Limitations

1. **No video embedding**: Only images supported
2. **Internet required**: For CDN resources (reveal.js)
3. **Static content**: No interactive elements
4. **File-based**: No hosting service (user must open HTML file)

## Future Enhancements

Planned features (not yet implemented):
- Video slide support
- Interactive charts
- Speaker notes generation
- Export to PDF
- Slide templates library
- Custom fonts
- Mermaid diagram integration
- Live preview before download

## Support

If the presentation doesn't render correctly:
1. Check that you opened the HTML file in a browser
2. Ensure internet connection (for CDN resources)
3. Try different browser if issues persist
4. Download and open in fullscreen mode

## Examples in Action

### Marketing Presentation
**Input**: `@slides create a marketing presentation about our new product launch with 7 slides using energy theme`

**Output**: 
- Dynamic title with product imagery
- Problem statement with relatable images
- Solution showcase with product photos
- Feature highlights in grid
- Customer testimonials with avatars
- Pricing with compelling visuals
- Call-to-action with conversion imagery

### Academic Presentation
**Input**: `@slides make an academic presentation about quantum computing fundamentals with 12 slides`

**Output**:
- Professional title slide
- What is quantum computing (concept image)
- Classical vs Quantum (comparison layout)
- Qubits explained (focused image)
- Superposition principle (abstract visualization)
- Entanglement (interconnected imagery)
- Quantum gates (circuit diagrams metaphor)
- Algorithms (flowchart imagery)
- Applications (industry photos)
- Challenges (technical imagery)
- Future outlook (futuristic visuals)
- References and Q&A

---

**Pro Tip**: The AI automatically selects the best layout for each slide based on the content type. Trust the tool to create visually balanced presentations!
