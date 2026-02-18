Plan: Slides HITL flow, animation fixes

Add a human-in-the-loop heading overview UI before slide generation, fix the animation/image UX, and prevent slide HTML from appearing in chat. Follow steps to integrate with existing slides tool and AI elements.

Steps
1. Surface heading overview UI
   - Extend slides tool flow to first request AI-proposed slide headings (AI suggests count automatically) and show a GUI with editable inputs for each heading and count field, plus confirm/cancel.
   - Use existing HITL patterns (e.g., event/form confirmations) to create a `SlidesHeadingConfirmation` component in ai-elements and render it in the tool card pipeline.
   - Include actions: edit headings/titles, add/remove slides, confirm to proceed with generation, cancel to abort.
2. Wire AI + tool messaging
   - Update slides tool invocation to support a two-step mode: AI returns draft headings (status pending) without HTML; on confirm, call the existing createPresentation tool with finalized titles and count.
   - Ensure mention-based tool routing continues working; avoid mixing provider tools when @slides mentioned.
3. Suppress HTML text in chat
   - In message rendering for createPresentation tool, strip text parts containing the generated HTML before passing to Streamdown, while keeping other assistant text; ensure tool card remains the only UI shown.
4. Fix animations/load behavior
   - Review presentation-result open/download flow; ensure `Open Presentation` uses blob URL with proper MIME and same HTML as download.
   - Verify Reveal initialization runs when opened; consider adding a small inline self-test (e.g., fallback logging) but avoid inline rendering in chat.
5. Image loading reliability
   - Keep Unsplash sources per decision; optionally add lightweight retry/fallback image URL to reduce broken images while keeping live fetch behavior.

Relevant files
- app/api/chat/route.ts — slides tool routing and prompt hints; adapt for two-step heading draft if needed.
- ai/slides-tools.ts — extend tool to support heading draft + confirmation before HTML generation.
- ai/prompts/slides.ts — ensure prompt encourages heading overview step (if prompt changes needed).
- components/ai-elements/message-list.tsx & message.tsx — suppress HTML text parts for slides tool responses.
- components/ai-elements/presentation-result.tsx — confirm open/download blob flow.
- components/ai-elements/* (new) — add `SlidesHeadingConfirmation` HITL component modeled after existing confirmation components.

Verification
1. Manual: Trigger @slides flow; verify heading overview UI appears with editable inputs; confirm generates slides and animations work in Open/Download windows.
2. Manual: Ensure chat UI shows only the tool card (no raw HTML text) when slides are generated.
3. Manual: Check images load in presentation; if Unsplash fails, confirm fallback behavior (if added) shows a placeholder instead of broken image.
4. Automated: npm run lint (and targeted component tests if exist) to validate code quality.

Decisions
- Slide count: AI suggests a number automatically; user can edit in overview.
- Image source: Keep Unsplash live images for variety.
- HTML suppression: Strip HTML text from assistant text parts, keep other assistant text visible.

Further Considerations
1. Confirm whether heading draft should allow per-slide layout selection; if needed, add layout dropdown per slide.
2. Decide if confirm should stream progress or remain one-shot generation to avoid long waits.
