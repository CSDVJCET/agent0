## Plan: Slides UX + Reveal Stability Fixes

Fix the popup runtime error and slide UX regressions by making open behavior blocker-safe, suppressing redundant assistant text when a slides card is present, and tightening slide-generation constraints (minimalist, no gradients, animation-forward, and less clipping-prone layout defaults). The approach reuses existing tool-card rendering patterns and enforces style/response rules at both prompt and route layers so behavior stays consistent.

**Steps**
1. Stabilize presentation open flow in `components/ai-elements/presentation-result.tsx` (*Phase 1, blocks 2*):
   - Update `handleOpenInNewTab` in `d:/Downloads/projects/agent0/components/ai-elements/presentation-result.tsx` to never throw on popup failure.
   - Implement fallback to same-tab navigation when `window.open` returns null.
   - Keep blob URL lifecycle safe (defer revoke for opened tab/same-tab path; immediate revoke only on hard failure).
   - Add non-fatal user feedback state for open/download action failures (component-local UI string, no uncaught exception).

2. Enforce “UI card only” chat rendering for slides outputs (*Phase 2, parallel with 3 once 1 is clear*):
   - Extend text filtering in `d:/Downloads/projects/agent0/components/ai-elements/message-list.tsx` (`getDisplayTextContent`) to suppress assistant plain text whenever `createPresentation` tool output is present, except explicit clarification prompts.
   - Reuse existing tool-result suppression style used by calendar/forms sections to avoid duplicate narrative.
   - Ensure this suppression is scoped to slide tool messages only (no cross-tool regression).

3. Tighten route-level assistant guidance for slides (*Phase 2, parallel with 2*):
   - In `d:/Downloads/projects/agent0/app/api/chat/route.ts`, expand slide guidance near the existing `@slides` block to explicitly require: no outline text in chat when card is available, ask clarifying questions only when inputs are missing, otherwise rely on tool UI.
   - Preserve existing prohibition on raw HTML in chat text.

4. Update slides prompt/system instructions for minimalist + animation-forward output (*Phase 3, blocks 5*):
   - Revise `d:/Downloads/projects/agent0/ai/prompts/slides.ts` to:
     - Disallow gradients/decorative heavy effects.
     - Require minimalist visual language (clean backgrounds, restrained palette, reduced ornamentation).
     - Require meaningful reveal.js features (fragments, transitions, occasional auto-animate where appropriate) without harming readability.
     - Add anti-overflow guidance (content budgeting, shorter bullets, safer heading lengths).
   - Align tool description in `d:/Downloads/projects/agent0/ai/slides-tools.ts` (`createPresentationTool.description`) so model intent is consistent with prompt constraints.

5. Reduce clipping risk in generated slide baseline CSS/config (*Phase 4, depends on 4*):
   - In `d:/Downloads/projects/agent0/ai/slides-tools.ts` generated CSS block:
     - Remove gradient backgrounds in favor of flat minimalist surfaces.
     - Reduce heading/body sizing pressure and container paddings.
     - Prefer top-aligned layout and tighter vertical spacing for dense slides.
     - Keep image and grid sizing conservative to avoid bottom cutoff.
   - In generated reveal init config, ensure `center: false` and transitions/fragments remain enabled for animations.

6. Validate behavior and regressions (*Phase 5, depends on 1-5*):
   - Functional checks in chat:
     - Generate a slide deck via `@slides` and verify only the UI card appears (no redundant outline text).
     - Click “Open Presentation” with popup allowed and blocked; verify no runtime crash and same-tab fallback works.
     - Verify “Download HTML” still works.
   - Visual checks:
     - Open generated presentation and confirm animations/fragments run without download-only requirement.
     - Confirm representative slides no longer clip bottom text under typical content load.
   - Project checks:
     - Run lint/build-targeted validation (at minimum `npm run build`) and resolve only issues introduced by these changes.

**Relevant files**
- `d:/Downloads/projects/agent0/components/ai-elements/presentation-result.tsx` — open/download handlers and error UX for presentation actions.
- `d:/Downloads/projects/agent0/components/ai-elements/message-list.tsx` — assistant text suppression logic via `getDisplayTextContent` and tool-result rendering conditions.
- `d:/Downloads/projects/agent0/components/ai-elements/slides-heading-confirmation.tsx` — confirm post-HITL create flow remains compatible with updated card-only behavior.
- `d:/Downloads/projects/agent0/app/api/chat/route.ts` — route-level instruction text for `@slides` behavior and text output constraints.
- `d:/Downloads/projects/agent0/ai/prompts/slides.ts` — slides system/prompt constraints (minimalist/no gradients/animation usage/content budgeting).
- `d:/Downloads/projects/agent0/ai/slides-tools.ts` — tool description and generated reveal HTML/CSS/config defaults affecting clipping and animation behavior.

**Verification**
1. Run app flow and reproduce prior popup path; confirm no uncaught runtime error in browser console.
2. Trigger blocked-popup scenario and verify same-tab fallback opens presentation successfully.
3. Create slide output from both normal chat tool invocation and HITL heading-confirmation flow; verify card-only chat rendering.
4. Inspect generated HTML quickly for flat backgrounds (no `linear-gradient`) and animation primitives (`fragment`, configured transition).
5. Execute `npm run build` in `d:/Downloads/projects/agent0` to ensure no build regressions.

**Decisions**
- Popup blocked fallback: open in same tab if popup blocked.
- Chat output policy: hide assistant plain text when slides card exists (except mandatory clarifications).
- Clipping strategy: prioritize smaller typography/spacing and top-aligned layout over scroll-based slides.
- Included scope: slide tool UX + prompt/generator behavior only.
- Excluded scope: new preview renderer in-chat, broad redesign of unrelated tool cards, or adding new pages/components.

**Further Considerations**
1. Clarification-detection heuristic in message suppression should be conservative (e.g., only keep text containing direct question markers) to avoid over-hiding useful prompts.
2. Animation intensity should remain moderate to preserve readability/performance on large decks; default to subtle transitions + selective fragments.
3. If clipping still appears on extreme content, a second-pass safeguard can add stricter bullet/word limits in prompt templates rather than enabling slide scrolling.
