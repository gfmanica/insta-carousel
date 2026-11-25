export interface OptimizedImageResult {
  dataUrl: string;
  thumbnailUrl: string;
  naturalWidth: number;
  naturalHeight: number;
}

const MAX_EDITORIAL_DIM = 2160; // Supports 2x Ultra HD Instagram export (1080 * 2)
const THUMBNAIL_MAX_DIM = 180;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => resolve((ev.target?.result as string) || '');
    reader.onerror = () => reject(new Error('Falha ao ler imagem.'));
    reader.readAsDataURL(blob);
  });
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Falha ao decodificar imagem.'));
    img.src = src;
  });
}

function createThumbnailDataUrl(img: HTMLImageElement): string {
  const nw = img.naturalWidth || 400;
  const nh = img.naturalHeight || 400;
  const scale = Math.min(1, THUMBNAIL_MAX_DIM / Math.max(nw, nh));
  const w = Math.max(1, Math.round(nw * scale));
  const h = Math.max(1, Math.round(nh * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return img.src;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'medium';
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.74);
}

/**
 * Downscales oversized camera photos (>2160px) to keep GPU memory and browser storage fast,
 * while preserving animated GIFs and SVG vectors intact. Also produces a lightweight thumbnail
 * for sidebar lists.
 */
export async function optimizeImportedImage(
  blob: Blob,
  mimeType: string
): Promise<OptimizedImageResult> {
  const isGif = mimeType === 'image/gif';
  const isSvg = mimeType === 'image/svg+xml';

  if (isGif || isSvg) {
    const rawDataUrl = await blobToDataUrl(blob);
    const img = await loadImg(rawDataUrl);
    return {
      dataUrl: rawDataUrl,
      thumbnailUrl: isSvg ? rawDataUrl : createThumbnailDataUrl(img),
      naturalWidth: img.naturalWidth || 800,
      naturalHeight: img.naturalHeight || 800,
    };
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await loadImg(objectUrl);
    const nw = img.naturalWidth || 800;
    const nh = img.naturalHeight || 800;
    const thumbnailUrl = createThumbnailDataUrl(img);

    // If image is already reasonably sized and not huge in bytes, keep original quality
    if (Math.max(nw, nh) <= MAX_EDITORIAL_DIM && blob.size <= 1_800_000) {
      const rawDataUrl = await blobToDataUrl(blob);
      return {
        dataUrl: rawDataUrl,
        thumbnailUrl,
        naturalWidth: nw,
        naturalHeight: nh,
      };
    }

    // Resize down to MAX_EDITORIAL_DIM (still crisp for 2x Instagram export)
    const scale = Math.min(1, MAX_EDITORIAL_DIM / Math.max(nw, nh));
    const targetW = Math.max(1, Math.round(nw * scale));
    const targetH = Math.max(1, Math.round(nh * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      const rawDataUrl = await blobToDataUrl(blob);
      return { dataUrl: rawDataUrl, thumbnailUrl, naturalWidth: nw, naturalHeight: nh };
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetW, targetH);

    // Preserve alpha channel for PNG/WebP, otherwise use compact WebP/JPEG
    const outputMime =
      mimeType === 'image/png' || mimeType === 'image/webp'
        ? 'image/webp'
        : 'image/jpeg';
    const dataUrl = canvas.toDataURL(outputMime, 0.9);

    return {
      dataUrl,
      thumbnailUrl,
      naturalWidth: targetW,
      naturalHeight: targetH,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
