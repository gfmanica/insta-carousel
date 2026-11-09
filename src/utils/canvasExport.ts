import JSZip from 'jszip';
import type {
  CarouselProject,
  CanvasLayer,
  ExportImageFormat,
} from '../types/carousel';
import { INSTAGRAM_FORMATS } from '../types/carousel';

const imageElementCache = new Map<string, HTMLImageElement>();

export function loadImageElement(src: string): Promise<HTMLImageElement> {
  if (imageElementCache.has(src)) {
    const cached = imageElementCache.get(src)!;
    if (cached.complete && cached.naturalWidth > 0) {
      return Promise.resolve(cached);
    }
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageElementCache.set(src, img);
      resolve(img);
    };
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function fillBackground(
  ctx: CanvasRenderingContext2D,
  project: CarouselProject,
  slideIndex: number,
  slideWidth: number,
  slideHeight: number,
  scale: number
) {
  const totalWidth = project.slidesCount * slideWidth * scale;
  const totalHeight = slideHeight * scale;
  const offsetX = -slideIndex * slideWidth * scale;

  ctx.save();
  ctx.fillStyle = project.backgroundColor || '#12131A';
  ctx.fillRect(0, 0, slideWidth * scale, totalHeight);

  // Also support seamless panoramic gradient across all slides
  if (project.backgroundGradient && project.backgroundGradient.includes('gradient')) {
    const grad = ctx.createLinearGradient(offsetX, 0, offsetX + totalWidth, totalHeight);
    if (project.backgroundGradient.includes('#1F1B2E')) {
      grad.addColorStop(0, '#12131A');
      grad.addColorStop(0.5, '#1F1B2E');
      grad.addColorStop(1, '#16202A');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, slideWidth * scale, totalHeight);
    } else if (project.backgroundGradient.includes('#833AB4')) {
      grad.addColorStop(0, '#833AB4');
      grad.addColorStop(0.5, '#E1306C');
      grad.addColorStop(1, '#FCAF45');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, slideWidth * scale, totalHeight);
    } else if (project.backgroundGradient.includes('#0F2027')) {
      grad.addColorStop(0, '#0F2027');
      grad.addColorStop(0.5, '#203A43');
      grad.addColorStop(1, '#2C5364');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, slideWidth * scale, totalHeight);
    } else if (project.backgroundGradient.includes('#FF416C')) {
      grad.addColorStop(0, '#FF416C');
      grad.addColorStop(1, '#FF4B2B');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, slideWidth * scale, totalHeight);
    }
  }
  ctx.restore();
}

export async function renderSlideToCanvas(
  project: CarouselProject,
  slideIndex: number,
  scale = 1
): Promise<HTMLCanvasElement> {
  const format = INSTAGRAM_FORMATS[project.formatId];
  const slideW = format.width;
  const slideH = format.height;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(slideW * scale);
  canvas.height = Math.round(slideH * scale);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Contexto 2D indisponível');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. Fill slide background (continuous across slides)
  fillBackground(ctx, project, slideIndex, slideW, slideH, scale);

  // 2. Sort visible layers by zIndex ascending
  const sortedLayers = [...project.layers]
    .filter((l) => l.visible)
    .sort((a, b) => a.zIndex - b.zIndex);

  const slideOffsetX = slideIndex * slideW;

  for (const layer of sortedLayers) {
    // Check if layer bounding box even roughly intersects this slide (with generous margin for rotation)
    const maxDim = Math.hypot(layer.width, layer.height);
    const centerX = layer.x + layer.width / 2;
    if (
      centerX + maxDim < slideOffsetX ||
      centerX - maxDim > slideOffsetX + slideW
    ) {
      continue;
    }

    await drawLayerOnSlide(ctx, layer, slideOffsetX, scale);
  }

  return canvas;
}

async function drawLayerOnSlide(
  ctx: CanvasRenderingContext2D,
  layer: CanvasLayer,
  slideOffsetX: number,
  scale: number
) {
  ctx.save();
  ctx.scale(scale, scale);

  // Translate to layer's center relative to this slide's left edge
  const localX = layer.x - slideOffsetX;
  const localY = layer.y;
  const cx = localX + layer.width / 2;
  const cy = localY + layer.height / 2;

  ctx.translate(cx, cy);
  if (layer.rotation) {
    ctx.rotate((layer.rotation * Math.PI) / 180);
  }
  if (layer.flipX || layer.flipY) {
    ctx.scale(layer.flipX ? -1 : 1, layer.flipY ? -1 : 1);
  }

  ctx.globalAlpha = Math.max(0, Math.min(1, layer.opacity));

  const halfW = layer.width / 2;
  const halfH = layer.height / 2;

  if (layer.type === 'image') {
    try {
      const img = await loadImageElement(layer.dataUrl);

      if (layer.shadowBlur && layer.shadowBlur > 0) {
        ctx.save();
        ctx.shadowBlur = layer.shadowBlur;
        ctx.shadowColor = layer.shadowColor || 'rgba(0,0,0,0.5)';
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 10;
        drawRoundedRectPath(
          ctx,
          -halfW,
          -halfH,
          layer.width,
          layer.height,
          layer.borderRadius || 0
        );
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.fill();
        ctx.restore();
      }

      ctx.save();
      if (layer.borderRadius && layer.borderRadius > 0) {
        drawRoundedRectPath(
          ctx,
          -halfW,
          -halfH,
          layer.width,
          layer.height,
          layer.borderRadius
        );
        ctx.clip();
      }
      const crop = layer.crop || { x: 0, y: 0, width: 1, height: 1 };
      const sx = Math.max(0, crop.x * img.naturalWidth);
      const sy = Math.max(0, crop.y * img.naturalHeight);
      const sw = Math.max(1, crop.width * img.naturalWidth);
      const sh = Math.max(1, crop.height * img.naturalHeight);

      ctx.drawImage(
        img,
        sx,
        sy,
        sw,
        sh,
        -halfW,
        -halfH,
        layer.width,
        layer.height
      );
      ctx.restore();

      if (layer.borderWidth && layer.borderWidth > 0) {
        ctx.save();
        drawRoundedRectPath(
          ctx,
          -halfW,
          -halfH,
          layer.width,
          layer.height,
          layer.borderRadius || 0
        );
        ctx.lineWidth = layer.borderWidth;
        ctx.strokeStyle = layer.borderColor || '#ffffff';
        ctx.stroke();
        ctx.restore();
      }
    } catch (err) {
      console.warn('Falha ao desenhar camada de imagem:', layer.name, err);
    }
  } else if (layer.type === 'text') {
    if (layer.backgroundColor && layer.backgroundColor !== 'transparent') {
      drawRoundedRectPath(
        ctx,
        -halfW,
        -halfH,
        layer.width,
        layer.height,
        layer.borderRadius || 16
      );
      ctx.fillStyle = layer.backgroundColor;
      ctx.fill();
    }

    if (layer.shadowBlur && layer.shadowBlur > 0) {
      ctx.shadowBlur = layer.shadowBlur;
      ctx.shadowColor = layer.shadowColor || 'rgba(0,0,0,0.6)';
      ctx.shadowOffsetY = 4;
    }

    ctx.font = `${layer.fontWeight || '700'} ${layer.fontSize}px ${layer.fontFamily || 'Inter, sans-serif'}`;
    ctx.fillStyle = layer.color || '#ffffff';
    ctx.textAlign = layer.textAlign || 'center';
    ctx.textBaseline = 'middle';

    const lines = layer.text.split('\n');
    const lineHeight = layer.fontSize * 1.22;
    const totalTextH = lines.length * lineHeight;
    let startY = -totalTextH / 2 + lineHeight / 2;

    let textX = 0;
    if (layer.textAlign === 'left') textX = -halfW + 24;
    if (layer.textAlign === 'right') textX = halfW - 24;

    for (const line of lines) {
      ctx.fillText(line, textX, startY);
      startY += lineHeight;
    }
  }

  ctx.restore();
}

export async function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: ExportImageFormat,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Falha ao converter canvas para Blob'));
      },
      format,
      format === 'image/png' ? undefined : quality
    );
  });
}

export function getExtensionForMime(format: ExportImageFormat): string {
  if (format === 'image/jpeg') return 'jpg';
  if (format === 'image/webp') return 'webp';
  return 'png';
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export async function exportSlidesAsZip(
  project: CarouselProject,
  slideIndices: number[],
  format: ExportImageFormat,
  quality: number,
  scale: number,
  onProgress?: (current: number, total: number) => void
): Promise<{ blob: Blob; filename: string }> {
  const zip = new JSZip();
  const ext = getExtensionForMime(format);
  const safeTitle = (project.title || 'carrossel-insta')
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-');

  for (let i = 0; i < slideIndices.length; i++) {
    const slideIdx = slideIndices[i];
    onProgress?.(i + 1, slideIndices.length);
    const canvas = await renderSlideToCanvas(project, slideIdx, scale);
    const blob = await canvasToBlob(canvas, format, quality);
    const slideNum = String(slideIdx + 1).padStart(2, '0');
    zip.file(`${safeTitle}-quadro-${slideNum}.${ext}`, blob);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return {
    blob: zipBlob,
    filename: `${safeTitle}-${project.formatId}.zip`,
  };
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
