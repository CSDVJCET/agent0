type StoredImage = {
  bytes: Uint8Array;
  mediaType: string;
  createdAt: number;
};

const IMAGE_TTL_MS = 1000 * 60 * 60; // 1 hour
const MAX_IMAGES = 100;

// Use globalThis so the Map is shared across all module instances in the same
// process (Turbopack can create isolated module contexts per route handler).
const g = globalThis as typeof globalThis & {
  __imageStore?: Map<string, StoredImage>;
};
if (!g.__imageStore) g.__imageStore = new Map();
const imageStore = g.__imageStore;

function cleanupExpiredImages(now = Date.now()) {
  for (const [id, image] of imageStore.entries()) {
    if (now - image.createdAt > IMAGE_TTL_MS) {
      imageStore.delete(id);
    }
  }

  if (imageStore.size > MAX_IMAGES) {
    const entries = [...imageStore.entries()].sort(
      (a, b) => a[1].createdAt - b[1].createdAt
    );
    const toDelete = imageStore.size - MAX_IMAGES;
    for (let i = 0; i < toDelete; i++) {
      imageStore.delete(entries[i][0]);
    }
  }
}

export function storeGeneratedImage(input: {
  bytes: Uint8Array;
  mediaType: string;
}) {
  cleanupExpiredImages();
  const id = crypto.randomUUID();
  imageStore.set(id, {
    bytes: input.bytes,
    mediaType: input.mediaType,
    createdAt: Date.now(),
  });
  return id;
}

export function getGeneratedImage(id: string) {
  cleanupExpiredImages();
  return imageStore.get(id);
}
