export type InstagramFormatId = 'square' | 'portrait' | 'grid2025' | 'story' | 'landscape';

export interface InstagramFormat {
  id: InstagramFormatId;
  name: string;
  ratioLabel: string;
  width: number;
  height: number;
  description: string;
}

export const INSTAGRAM_FORMATS: Record<InstagramFormatId, InstagramFormat> = {
  square: {
    id: 'square',
    name: 'Quadrado Clássico',
    ratioLabel: '1:1',
    width: 1080,
    height: 1080,
    description: '1080 × 1080 px — Feed clássico universal',
  },
  portrait: {
    id: 'portrait',
    name: 'Retrato Feed',
    ratioLabel: '4:5',
    width: 1080,
    height: 1350,
    description: '1080 × 1350 px — Maior engajamento vertical no feed',
  },
  grid2025: {
    id: 'grid2025',
    name: 'Novo Grid Retangular',
    ratioLabel: '3:4',
    width: 1080,
    height: 1440,
    description: '1080 × 1440 px — Proporção do novo perfil do Instagram',
  },
  story: {
    id: 'story',
    name: 'Story / Reels',
    ratioLabel: '9:16',
    width: 1080,
    height: 1920,
    description: '1080 × 1920 px — Tela cheia vertical',
  },
  landscape: {
    id: 'landscape',
    name: 'Horizontal / Cinema',
    ratioLabel: '1.91:1',
    width: 1080,
    height: 566,
    description: '1080 × 566 px — Paisagem panorâmica',
  },
};

export interface ImageAsset {
  id: string;
  name: string;
  dataUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  createdAt: number;
}

export type LayerType = 'image' | 'text';

export interface BaseLayer {
  id: string;
  type: LayerType;
  name: string;
  x: number; // Position in global panoramic canvas coordinates (px)
  y: number; // Position in global panoramic canvas coordinates (px)
  width: number; // Width in global canvas px
  height: number; // Height in global canvas px
  rotation: number; // Degrees (-180 to 180)
  opacity: number; // 0 to 1
  zIndex: number;
  visible: boolean;
  locked: boolean;
  flipX?: boolean;
  flipY?: boolean;
  borderRadius?: number;
  shadowBlur?: number;
  shadowColor?: string;
}

export interface ImageCrop {
  x: number; // Normalized 0..1 from left of natural image
  y: number; // Normalized 0..1 from top of natural image
  width: number; // Normalized 0..1 width of cropped region
  height: number; // Normalized 0..1 height of cropped region
}

export interface ImageLayer extends BaseLayer {
  type: 'image';
  assetId: string;
  dataUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  crop?: ImageCrop;
  borderWidth?: number;
  borderColor?: string;
}

export interface TextLayer extends BaseLayer {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  color: string;
  backgroundColor?: string;
  textAlign: 'left' | 'center' | 'right';
}

export type CanvasLayer = ImageLayer | TextLayer;

export type ExportImageFormat = 'image/jpeg' | 'image/png' | 'image/webp';

export interface ExportSettings {
  format: ExportImageFormat;
  quality: number; // 0.1 to 1.0 (for JPEG / WebP)
  scale: number; // 0.5x, 1x (1080p), 2x (2160p Ultra HD)
  selectedSlides: number[]; // indices 0..slidesCount-1
}

export interface GifFrameItem {
  id: string;
  sourceType: 'slide' | 'asset';
  slideIndex?: number; // 0..slidesCount-1 if sourceType === 'slide'
  assetId?: string;
  dataUrl?: string; // cached thumbnail or asset dataUrl
  label: string;
  delayMs: number; // Individual frame duration in ms (or uses global if synced)
}

export interface CarouselProject {
  id: string;
  title: string;
  formatId: InstagramFormatId;
  slidesCount: number;
  backgroundColor: string;
  backgroundGradient?: string;
  showSeamGuides: boolean;
  showSafeZones: boolean;
  layers: CanvasLayer[];
  assets: ImageAsset[];
  gifFrames: GifFrameItem[];
  gifDefaultDelayMs: number;
  gifWidth: number;
  gifLoop: boolean;
  updatedAt: number;
}
