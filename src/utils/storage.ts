import { get, set, del } from 'idb-keyval';
import type { CarouselProject, ImageAsset, ImageLayer } from '../types/carousel';

const STORAGE_KEY = 'insta_carousel_studio_project_v2';

// Clean architectural / editorial SVG composition for initial canvas
function createEditorialSampleSvg(
  variant: 'panorama' | 'portrait' | 'detail',
  width: number,
  height: number
): string {
  if (variant === 'panorama') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="#18181B"/>
      <circle cx="${width * 0.62}" cy="${height * 0.5}" r="${height * 0.36}" fill="#E4E4E7"/>
      <path d="M 0 ${height * 0.72} Q ${width * 0.35} ${height * 0.45} ${width * 0.7} ${height * 0.75} T ${width} ${height * 0.65} L ${width} ${height} L 0 ${height} Z" fill="#27272A"/>
      <line x1="48" y1="48" x2="${width - 48}" y2="48" stroke="#3F3F46" stroke-width="1.5"/>
      <text x="48" y="88" fill="#A1A1AA" font-family="Inter, system-ui, sans-serif" font-weight="500" font-size="18" letter-spacing="2">01 / COMPOSIÇÃO CONTÍNUA</text>
      <text x="48" y="${height - 64}" fill="#FAFAFA" font-family="Inter, system-ui, sans-serif" font-weight="700" font-size="44" letter-spacing="-1">Arquitetura &amp; Forma</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  if (variant === 'portrait') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="#F4F4F5"/>
      <rect x="48" y="48" width="${width - 96}" height="${height - 160}" fill="#18181B"/>
      <circle cx="${width * 0.5}" cy="${height * 0.42}" r="${width * 0.22}" fill="#3B82F6"/>
      <text x="48" y="${height - 56}" fill="#18181B" font-family="Inter, system-ui, sans-serif" font-weight="700" font-size="28" letter-spacing="-0.5">Estudo de Contraste</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="#27272A"/>
    <rect x="40" y="40" width="${width - 80}" height="${height - 80}" fill="none" stroke="#52525B" stroke-width="2"/>
    <path d="M 120 ${height - 120} L ${width * 0.5} 120 L ${width - 120} ${height - 120} Z" fill="#E4E4E7" opacity="0.9"/>
    <text x="64" y="92" fill="#A1A1AA" font-family="Inter, system-ui, sans-serif" font-weight="600" font-size="18" letter-spacing="1.5">SÉRIE MONOLITO</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function createDefaultProject(): CarouselProject {
  const now = Date.now();

  const sample1Url = createEditorialSampleSvg('panorama', 1000, 680);
  const sample2Url = createEditorialSampleSvg('portrait', 640, 760);
  const sample3Url = createEditorialSampleSvg('detail', 780, 560);

  const assets: ImageAsset[] = [
    {
      id: 'asset-demo-1',
      name: 'arquitetura-panorama.svg',
      dataUrl: sample1Url,
      naturalWidth: 1000,
      naturalHeight: 680,
      createdAt: now - 3000,
    },
    {
      id: 'asset-demo-2',
      name: 'estudo-contraste.svg',
      dataUrl: sample2Url,
      naturalWidth: 640,
      naturalHeight: 760,
      createdAt: now - 2000,
    },
    {
      id: 'asset-demo-3',
      name: 'serie-monolito.svg',
      dataUrl: sample3Url,
      naturalWidth: 780,
      naturalHeight: 560,
      createdAt: now - 1000,
    },
  ];

  // Clean editorial layout spanning across Slide 1, 2, 3
  const layers: ImageLayer[] = [
    {
      id: 'layer-demo-1',
      type: 'image',
      assetId: 'asset-demo-1',
      name: 'arquitetura-panorama',
      dataUrl: sample1Url,
      naturalWidth: 1000,
      naturalHeight: 680,
      x: 580, // Crosses seam at 1080 between Quadro 1 and Quadro 2
      y: 200,
      width: 1000,
      height: 680,
      rotation: 0,
      opacity: 1,
      zIndex: 2,
      visible: true,
      locked: false,
      borderRadius: 8,
      shadowBlur: 32,
      shadowColor: 'rgba(0,0,0,0.45)',
    },
    {
      id: 'layer-demo-2',
      type: 'image',
      assetId: 'asset-demo-2',
      name: 'estudo-contraste',
      dataUrl: sample2Url,
      naturalWidth: 640,
      naturalHeight: 760,
      x: 80,
      y: 160,
      width: 560,
      height: 665,
      rotation: 0,
      opacity: 1,
      zIndex: 1,
      visible: true,
      locked: false,
      borderRadius: 8,
      shadowBlur: 24,
      shadowColor: 'rgba(0,0,0,0.35)',
    },
    {
      id: 'layer-demo-3',
      type: 'image',
      assetId: 'asset-demo-3',
      name: 'serie-monolito',
      dataUrl: sample3Url,
      naturalWidth: 780,
      naturalHeight: 560,
      x: 1760, // Crosses seam at 2160 between Quadro 2 and Quadro 3
      y: 260,
      width: 780,
      height: 560,
      rotation: 0,
      opacity: 1,
      zIndex: 3,
      visible: true,
      locked: false,
      borderRadius: 8,
      shadowBlur: 28,
      shadowColor: 'rgba(0,0,0,0.4)',
    },
  ];

  return {
    id: 'default-project',
    title: 'Editorial 01',
    formatId: 'square',
    slidesCount: 3,
    backgroundColor: '#111113',
    backgroundGradient: '',
    showSeamGuides: true,
    showSafeZones: false,
    layers,
    assets,
    gifFrames: [
      {
        id: 'gif-frame-1',
        sourceType: 'slide',
        slideIndex: 0,
        label: 'Quadro 1',
        delayMs: 600,
      },
      {
        id: 'gif-frame-2',
        sourceType: 'slide',
        slideIndex: 1,
        label: 'Quadro 2',
        delayMs: 600,
      },
      {
        id: 'gif-frame-3',
        sourceType: 'slide',
        slideIndex: 2,
        label: 'Quadro 3',
        delayMs: 600,
      },
    ],
    gifDefaultDelayMs: 600,
    gifWidth: 720,
    gifLoop: true,
    updatedAt: now,
  };
}

export async function loadProjectFromBrowser(): Promise<CarouselProject> {
  try {
    const saved = await get<CarouselProject>(STORAGE_KEY);
    if (saved && saved.id && Array.isArray(saved.layers)) {
      return saved;
    }
  } catch (err) {
    console.warn('IndexedDB indisponível, tentando localStorage:', err);
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CarouselProject;
      if (parsed && parsed.id) return parsed;
    }
  } catch (err) {
    console.warn('Erro ao ler localStorage:', err);
  }

  return createDefaultProject();
}

export async function saveProjectToBrowser(project: CarouselProject): Promise<void> {
  const updated = { ...project, updatedAt: Date.now() };
  try {
    await set(STORAGE_KEY, updated);
  } catch (err) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Falha ao salvar no navegador:', e);
    }
  }
}

export async function clearProjectInBrowser(): Promise<CarouselProject> {
  const fresh = createDefaultProject();
  try {
    await del(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // ignore
  }
  await saveProjectToBrowser(fresh);
  return fresh;
}
