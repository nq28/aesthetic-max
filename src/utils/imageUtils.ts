/**
 * Utility functions for image compression and downscaling
 * to prevent localStorage QuotaExceededError while preserving visual quality.
 */

export async function compressImageToThumbnail(
  base64Str: string,
  maxWidth = 320,
  maxHeight = 320,
  quality = 0.7
): Promise<string> {
  if (!base64Str || !base64Str.startsWith('data:image')) {
    return base64Str;
  }

  // If image is already tiny (< 50KB), return as is
  if (base64Str.length < 50000) {
    return base64Str;
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(base64Str.slice(0, 50000));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };

      img.onerror = () => {
        // Fallback: return original if canvas fails
        resolve(base64Str);
      };

      img.src = base64Str;
    } catch {
      resolve(base64Str);
    }
  });
}
