# Task: Create image deletion API

## Context
- Files to modify: `app/api/images/delete/route.ts` (create)
- Branch: feature/delete-image-api

## Requirements
1. Create a Next.js App Router route handler for DELETE requests.
2. Accept a JSON body with the `url` of the image to delete.
3. Import `del` from `@vercel/blob` and use it to delete the image from Vercel Blob.
4. Return a successful JSON response.
5. Apply appropriate error handling.

## Constraints
- Follow Next.js App Router conventions.
