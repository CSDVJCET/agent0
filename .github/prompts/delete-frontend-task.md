# Task: Add delete button with particle animation

## Context
- Files to modify: `components/ui/framer-thumbnail-carousel.tsx`, `components/folder.tsx`
- Branch: feature/delete-image-frontend

## Requirements
1. Update `framer-thumbnail-carousel.tsx` to include an absolute positioned delete button (e.g. from lucide-react or similar) on each image item when hovered or always visible.
2. Implement a particle disintegration or instant vanishing animation using `framer-motion` (`motion` from `motion/react`) when the delete button is clicked. 
3. When clicked, call `fetch('/api/images/delete', { method: 'DELETE', body: JSON.stringify({ url: item.src || item.url }) })`.
4. Update `framer-thumbnail-carousel.tsx` props to accept an `onDelete?: (item: any) => void` callback. Call this immediately for optimistic UX.
5. Update `components/folder.tsx` to pass the `onDelete` callback and remove the deleted item from its array state.

## Constraints
- Use `motion` and `AnimatePresence` from `motion/react`.
- Make the deletion animation visually polished and particle-like if possible. 
