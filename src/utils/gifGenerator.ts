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

export type VideoFitMode = 'original' | 'cover' | 'contain';

export interface VideoToGifOptions {
  file: File;
  startTime: number; // seconds
  endTime: number; // seconds
  fps: number; // e.g., 5, 8, 10, 12, 15
  targetWidth: number; // e.g., 480, 720
  targetAspect?: number; // height / width (used when fitMode !== 'original')
  fitMode: VideoFitMode;
  backgroundColor?: string;
  loop: boolean;
  onProgress?: (current: number, total: number, stage: string) => void;
}

function loadVideoElement(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.crossOrigin = 'anonymous';
    video.onloadedmetadata = () => resolve(video);
    video.onerror = () =>
      reject(new Error('Não foi possível carregar este arquivo de vídeo.'));
    video.src = url;
    video.load();
  });
}

function seekVideoTo(video: HTMLVideoElement, timeSec: number): Promise<void> {
  return new Promise((resolve) => {
    const clamped = Math.max(
      0,
      Math.min(Math.max(0, video.duration - 0.01), timeSec)
    );
    if (Math.abs(video.currentTime - clamped) < 0.005 && video.readyState >= 2) {
      resolve();
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      video.removeEventListener('seeked', onSeeked);
      clearTimeout(timer);
      resolve();
    };
    const onSeeked = () => finish();
    const timer = setTimeout(finish, 1200);

    video.addEventListener('seeked', onSeeked, { once: true });
    video.currentTime = clamped;
  });
}

function drawVideoFrameToCanvas(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number,
  fitMode: VideoFitMode,
  backgroundColor: string
) {
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  const vw = video.videoWidth || width;
  const vh = video.videoHeight || height;
  const vRatio = vw / Math.max(1, vh);
  const cRatio = width / Math.max(1, height);

  let drawW = width;
  let drawH = height;

  if (fitMode === 'cover') {
    if (vRatio > cRatio) {
      drawH = height;
      drawW = height * vRatio;
    } else {
      drawW = width;
      drawH = width / vRatio;
    }
  } else if (fitMode === 'contain') {
    if (vRatio > cRatio) {
      drawW = width;
      drawH = width / vRatio;
    } else {
      drawH = height;
      drawW = height * vRatio;
    }
  }

  const offsetX = (width - drawW) / 2;
  const offsetY = (height - drawH) / 2;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(video, offsetX, offsetY, drawW, drawH);
}

export async function generateGifFromVideo({
  file,
  startTime,
  endTime,
  fps,
  targetWidth,
  targetAspect = 1,
  fitMode,
  backgroundColor = '#111113',
  loop,
  onProgress,
}: VideoToGifOptions): Promise<{ blob: Blob; width: number; height: number }> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const video = await loadVideoElement(objectUrl);
    const duration = Math.max(0.1, endTime - startTime);
    const safeFps = Math.max(2, Math.min(20, fps));
    const totalFrames = Math.max(
      2,
      Math.min(180, Math.round(duration * safeFps))
    );
    const frameStep = duration / totalFrames;
    const delayMs = Math.max(40, Math.round(1000 / safeFps));

    const vw = video.videoWidth || 720;
    const vh = video.videoHeight || 720;
    const width = Math.max(160, Math.round(targetWidth));
    const height =
      fitMode === 'original'
        ? Math.max(120, Math.round((width * vh) / Math.max(1, vw)))
        : Math.max(120, Math.round(width * targetAspect));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Contexto 2D indisponível');

    const gif = GIFEncoder();

    for (let i = 0; i < totalFrames; i++) {
      const timestamp = startTime + i * frameStep;
      onProgress?.(i + 1, totalFrames, `Frame ${i + 1}/${totalFrames}...`);

      await seekVideoTo(video, timestamp);
      drawVideoFrameToCanvas(ctx, video, width, height, fitMode, backgroundColor);

      const { data } = ctx.getImageData(0, 0, width, height);
      const palette = quantize(data, 256);
      const index = applyPalette(data, palette);

      gif.writeFrame(index, width, height, {
        palette,
        delay: delayMs,
        repeat: loop ? 0 : -1,
      });

      await new Promise((r) => setTimeout(r, 4));
    }

    gif.finish();
    const bytes = gif.bytes();
    return {
      blob: new Blob([bytes], { type: 'image/gif' }),
      width,
      height,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function extractFramesFromVideo(
  file: File,
  startTime: number,
  endTime: number,
  maxFrames = 16,
  onProgress?: (current: number, total: number) => void
): Promise<GifFrameItem[]> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const video = await loadVideoElement(objectUrl);
    const duration = Math.max(0.1, endTime - startTime);
    const totalFrames = Math.max(2, Math.min(24, maxFrames));
    const step = duration / totalFrames;
    const delayMs = Math.max(80, Math.round((duration * 1000) / totalFrames));

    const vw = video.videoWidth || 720;
    const vh = video.videoHeight || 720;
    const maxDim = 720;
    const scale = Math.min(1, maxDim / Math.max(vw, vh));
    const width = Math.round(vw * scale);
    const height = Math.round(vh * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Contexto 2D indisponível');

    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const frames: GifFrameItem[] = [];

    for (let i = 0; i < totalFrames; i++) {
      onProgress?.(i + 1, totalFrames);
      await seekVideoTo(video, startTime + i * step);
      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.84);
      frames.push({
        id: `gif-vid-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 5)}`,
        sourceType: 'asset',
        dataUrl,
        label: `${baseName} #${String(i + 1).padStart(2, '0')}`,
        delayMs,
      });
    }

    return frames;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
