import gifencPkg from 'gifenc';
import type { CarouselProject, GifFrameItem } from '../types/carousel';
import { INSTAGRAM_FORMATS } from '../types/carousel';
import { loadImageElement, renderSlideToCanvas } from './canvasExport';

const { GIFEncoder, quantize, applyPalette } = gifencPkg;

export interface GifGenerationOptions {
  project: CarouselProject;
  frames: GifFrameItem[];
  targetWidth: number; // e.g., 540, 720, 1080
  loop: boolean;
  onProgress?: (current: number, total: number) => void;
}

export async function renderGifFrameCanvas(
  project: CarouselProject,
  frame: GifFrameItem,
  targetWidth: number,
  targetHeight: number
): Promise<HTMLCanvasElement> {
  const format = INSTAGRAM_FORMATS[project.formatId];
  const scale = targetWidth / format.width;

  if (frame.sourceType === 'slide' && typeof frame.slideIndex === 'number') {
    return renderSlideToCanvas(project, frame.slideIndex, scale);
  }

  // Otherwise render from asset or custom dataUrl
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Contexto 2D indisponível');

  // Background fill
  ctx.fillStyle = project.backgroundColor || '#12131A';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  let dataUrl = frame.dataUrl;
  if (!dataUrl && frame.assetId) {
    const asset = project.assets.find((a) => a.id === frame.assetId);
    if (asset) dataUrl = asset.dataUrl;
  }

  if (dataUrl) {
    try {
      const img = await loadImageElement(dataUrl);
      // Object-contain / cover centering inside target dimensions
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const canvasRatio = targetWidth / targetHeight;
      let drawW = targetWidth;
      let drawH = targetHeight;

      if (imgRatio > canvasRatio) {
        drawW = targetWidth;
        drawH = targetWidth / imgRatio;
      } else {
        drawH = targetHeight;
        drawW = targetHeight * imgRatio;
      }

      const offsetX = (targetWidth - drawW) / 2;
      const offsetY = (targetHeight - drawH) / 2;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
    } catch (err) {
      console.warn('Erro ao carregar imagem para frame do GIF:', err);
    }
  }

  return canvas;
}

export async function generateAnimatedGif({
  project,
  frames,
  targetWidth,
  loop,
  onProgress,
}: GifGenerationOptions): Promise<Blob> {
  if (frames.length === 0) {
    throw new Error('Selecione ao menos 1 imagem ou quadro para gerar o GIF.');
  }

  const format = INSTAGRAM_FORMATS[project.formatId];
  const aspect = format.height / format.width;
  const width = Math.round(targetWidth);
  const height = Math.round(targetWidth * aspect);

  const gif = GIFEncoder();

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    onProgress?.(i + 1, frames.length);

    const canvas = await renderGifFrameCanvas(project, frame, width, height);
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, width, height);
    const { data } = imageData;

    // Quantize RGBA to 256-color palette
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);

    gif.writeFrame(index, width, height, {
      palette,
      delay: Math.max(40, frame.delayMs || project.gifDefaultDelayMs || 500),
      repeat: loop ? 0 : -1,
    });

    // Yield briefly to keep UI responsive
    await new Promise((r) => setTimeout(r, 10));
  }

  gif.finish();
  const bytes = gif.bytes();
  return new Blob([bytes], { type: 'image/gif' });
}
