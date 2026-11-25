import type { CarouselProject, ImageAsset, ImageLayer } from '../types/carousel';
import { INSTAGRAM_FORMATS } from '../types/carousel';
import { optimizeImportedImage, type OptimizedImageResult } from './imageOptimizer';

export function isHeicFile(file: File): boolean {
  return (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    /\.(heic|heif)$/i.test(file.name)
  );
}

export function isSupportedImageFile(file: File): boolean {
  return file.type.startsWith('image/') || isHeicFile(file);
}

export interface ImportedImageItem {
  idx: number;
  resolvedName: string;
  optimized: OptimizedImageResult;
}

export async function processImportedImageFiles(
  fileArray: File[],
  onHeicFinishOne?: () => void
): Promise<ImportedImageItem[]> {
  const results = await Promise.all(
    fileArray.map(async (file, idx) => {
      const heic = isHeicFile(file);
      try {
        let blobToRead: Blob = file;
        let resolvedName = file.name;
        let resolvedMime = file.type || 'image/jpeg';

        if (heic) {
          const { heicTo } = await import('heic-to');
          blobToRead = await heicTo({
            blob: file,
            type: 'image/jpeg',
            quality: 0.92,
          });
          resolvedName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
          resolvedMime = 'image/jpeg';
        }

        const optimized = await optimizeImportedImage(blobToRead, resolvedMime);
        if (!optimized.dataUrl) return null;

        return { idx, resolvedName, optimized };
      } catch (err) {
        console.error('Erro ao importar imagem (incluindo HEIC):', err);
        return null;
      } finally {
        if (heic) onHeicFinishOne?.();
      }
    })
  );

  return results.filter((item): item is ImportedImageItem => item !== null);
}

export function buildImportedAssetsAndLayers(
  prev: CarouselProject,
  validItems: ImportedImageItem[],
  resolvedPoint: { x: number; y: number } | null,
  batchBaseTs: number
): { newAssets: ImageAsset[]; newLayers: ImageLayer[] } {
  const fmt = INSTAGRAM_FORMATS[prev.formatId];
  const totalW = fmt.width * prev.slidesCount;
  const newAssets: ImageAsset[] = [];
  const newLayers: ImageLayer[] = [];
  let nextZ = prev.layers.reduce((m, l) => Math.max(m, l.zIndex), 0);

  for (const { idx, resolvedName, optimized } of validItems) {
    const assetId = `asset-${batchBaseTs}-${idx}-${Math.random().toString(36).slice(2, 6)}`;
    const layerId = `layer-${batchBaseTs}-${idx}-${Math.random().toString(36).slice(2, 6)}`;
    const asset: ImageAsset = {
      id: assetId,
      name:
        resolvedName && resolvedName !== 'image.png'
          ? resolvedName
          : `imagem-colada-${new Date().toLocaleTimeString('pt-BR')}.png`,
      dataUrl: optimized.dataUrl,
      thumbnailUrl: optimized.thumbnailUrl,
      naturalWidth: optimized.naturalWidth,
      naturalHeight: optimized.naturalHeight,
      createdAt: batchBaseTs + idx,
    };

    const maxInitDim = Math.min(fmt.width * 0.72, 820);
    const ratio = asset.naturalWidth / Math.max(1, asset.naturalHeight);
    let w = maxInitDim;
    let h = maxInitDim / ratio;
    if (h > fmt.height * 0.78) {
      h = fmt.height * 0.78;
      w = h * ratio;
    }

    const offset = idx * 32;
    const xPos = resolvedPoint
      ? Math.round(
          Math.max(
            -w * 0.4,
            Math.min(totalW - w * 0.6, resolvedPoint.x - w / 2 + offset)
          )
        )
      : prev.slidesCount > 1
      ? Math.round(fmt.width - w / 2 + offset)
      : Math.round((fmt.width - w) / 2 + offset);
    const yPos = resolvedPoint
      ? Math.round(
          Math.max(
            -h * 0.4,
            Math.min(fmt.height - h * 0.6, resolvedPoint.y - h / 2 + offset)
          )
        )
      : Math.round((fmt.height - h) / 2 + offset);

    nextZ += 1;
    newAssets.push(asset);
    newLayers.push({
      id: layerId,
      type: 'image',
      assetId,
      name: asset.name.replace(/\.[^/.]+$/, ''),
      dataUrl: optimized.dataUrl,
      thumbnailUrl: optimized.thumbnailUrl,
      naturalWidth: asset.naturalWidth,
      naturalHeight: asset.naturalHeight,
      x: xPos,
      y: yPos,
      width: Math.round(w),
      height: Math.round(h),
      rotation: 0,
      opacity: 1,
      zIndex: nextZ,
      visible: true,
      locked: false,
      borderRadius: 8,
      shadowBlur: 24,
      shadowColor: 'rgba(0,0,0,0.4)',
    });
  }

  return { newAssets, newLayers };
}
