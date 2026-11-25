import React, { useState } from 'react';
import {
  Image as ImageIcon,
  Type,
  Palette,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type {
  CarouselProject,
  ImageAsset,
  ImageLayer,
  TextLayer,
} from '../types/carousel';
import { INSTAGRAM_FORMATS } from '../types/carousel';
import {
  AssetsLibraryTab,
  TextPresetsTab,
  BackgroundPresetsTab,
} from './LeftSidebarTabs';

interface LeftSidebarProps {
  project: CarouselProject;
  onUpdateProject: (updater: (prev: CarouselProject) => CarouselProject) => void;
  onSelectLayer: (layerId: string | null) => void;
  onAddFiles: (
    files: FileList | File[],
    targetPoint?: { x: number; y: number }
  ) => void;
  lastClickedPoint?: { x: number; y: number } | null;
  width: number;
  isOpen: boolean;
  onToggleOpen: () => void;
  onResizeWidth: (newWidth: number) => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = React.memo(
  ({
    project,
    onUpdateProject,
    onSelectLayer,
    onAddFiles,
    lastClickedPoint,
    width,
    isOpen,
    onToggleOpen,
    onResizeWidth,
  }) => {
    const [activeTab, setActiveTab] = useState<'assets' | 'text' | 'background'>(
      'assets'
    );
    const [isResizingWidth, setIsResizingWidth] = useState(false);
    const [scrollTop, setScrollTop] = useState<number>(0);

    const currentFormat = INSTAGRAM_FORMATS[project.formatId];

    const startResizeWidth = (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startW = width;
      setIsResizingWidth(true);

      const onMove = (ev: PointerEvent) => {
        const nextW = Math.max(
          210,
          Math.min(520, startW + (ev.clientX - startX))
        );
        onResizeWidth(nextW);
      };
      const onUp = () => {
        setIsResizingWidth(false);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    };

    const addAssetToCanvas = (
      asset: ImageAsset,
      mode: 'slide' | 'seam' = 'slide',
      slideIdx = 0
    ) => {
      const maxInitDim = Math.min(currentFormat.width * 0.75, 860);
      const ratio = asset.naturalWidth / Math.max(1, asset.naturalHeight);
      let w = maxInitDim;
      let h = maxInitDim / ratio;
      if (h > currentFormat.height * 0.8) {
        h = currentFormat.height * 0.8;
        w = h * ratio;
      }

      const seamX = (slideIdx + 1) * currentFormat.width;
      const xPos =
        mode === 'seam' && project.slidesCount > 1
          ? Math.round(seamX - w / 2)
          : lastClickedPoint
          ? Math.round(lastClickedPoint.x - w / 2)
          : Math.round(
              slideIdx * currentFormat.width + (currentFormat.width - w) / 2
            );
      const yPos =
        mode === 'seam'
          ? Math.round((currentFormat.height - h) / 2)
          : lastClickedPoint
          ? Math.round(lastClickedPoint.y - h / 2)
          : Math.round((currentFormat.height - h) / 2);

      const layerId = `layer-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 6)}`;

      onUpdateProject((prev) => {
        const maxZ = prev.layers.reduce((m, l) => Math.max(m, l.zIndex), 0);
        const newLayer: ImageLayer = {
          id: layerId,
          type: 'image',
          assetId: asset.id,
          name: asset.name.replace(/\.[^/.]+$/, ''),
          dataUrl: asset.dataUrl,
          thumbnailUrl: asset.thumbnailUrl,
          naturalWidth: asset.naturalWidth,
          naturalHeight: asset.naturalHeight,
          x: xPos,
          y: yPos,
          width: Math.round(w),
          height: Math.round(h),
          rotation: 0,
          opacity: 1,
          zIndex: maxZ + 1,
          visible: true,
          locked: false,
          borderRadius: 8,
          shadowBlur: 24,
          shadowColor: 'rgba(0,0,0,0.4)',
        };
        return {
          ...prev,
          layers: [...prev.layers, newLayer],
        };
      });
      onSelectLayer(layerId);
    };

    const handleDeleteAsset = (assetId: string) => {
      onUpdateProject((prev) => ({
        ...prev,
        assets: prev.assets.filter((a) => a.id !== assetId),
      }));
    };

    const handleAddTextLayer = (preset: 'heading' | 'badge' | 'seamTitle') => {
      const layerId = `layer-text-${Date.now()}`;
      const isSeam = preset === 'seamTitle' && project.slidesCount > 1;
      const w = isSeam ? 920 : 720;
      const h = preset === 'badge' ? 96 : 180;
      const x = isSeam
        ? Math.round(currentFormat.width - w / 2)
        : Math.round((currentFormat.width - w) / 2);
      const y =
        preset === 'badge' ? 110 : Math.round(currentFormat.height / 2 - h / 2);

      onUpdateProject((prev) => {
        const maxZ = prev.layers.reduce((m, l) => Math.max(m, l.zIndex), 0);
        const newText: TextLayer = {
          id: layerId,
          type: 'text',
          name:
            preset === 'heading'
              ? 'Título'
              : preset === 'badge'
              ? 'Etiqueta'
              : 'Título Panorâmico',
          text:
            preset === 'heading'
              ? 'Título Principal'
              : preset === 'badge'
              ? 'DESTAQUE'
              : 'Continuidade Entre Quadros',
          x,
          y,
          width: w,
          height: h,
          rotation: 0,
          opacity: 1,
          zIndex: maxZ + 1,
          visible: true,
          locked: false,
          fontSize: preset === 'badge' ? 32 : 56,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontWeight: '700',
          color: '#FAFAFA',
          backgroundColor: preset === 'badge' ? '#18181B' : 'transparent',
          borderRadius: 12,
          textAlign: 'center',
          shadowBlur: preset === 'badge' ? 16 : 0,
          shadowColor: 'rgba(0,0,0,0.4)',
        };
        return {
          ...prev,
          layers: [...prev.layers, newText],
        };
      });
      onSelectLayer(layerId);
    };

    if (!isOpen) {
      return (
        <div className="hidden md:flex w-8 bg-studio-panel border-r border-studio-border flex-col items-center py-2.5 gap-3 shrink-0 select-none z-10">
          <button
            type="button"
            onClick={onToggleOpen}
            title="Expandir painel esquerdo (Biblioteca)"
            className="btn-press p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-studio-hover border border-transparent hover:border-studio-border"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onToggleOpen}
            className="cursor-pointer text-[10px] font-medium text-zinc-500 hover:text-zinc-300 tracking-wider uppercase [writing-mode:vertical-rl] rotate-180 py-2"
          >
            Biblioteca ({project.assets.length})
          </button>
        </div>
      );
    }

    return (
      <aside
        style={{ width: `${width}px` }}
        className="fixed md:relative inset-y-0 left-0 max-w-[86vw] md:max-w-none bg-studio-panel border-r border-studio-border flex flex-col shrink-0 select-none z-40 md:z-10 shadow-2xl md:shadow-none"
      >
        <div
          onPointerDown={startResizeWidth}
          title="Arraste para ajustar a largura do painel"
          className="absolute top-0 -right-1 bottom-0 w-2 cursor-col-resize z-30 group flex items-center justify-center"
        >
          <div
            className={`w-[2px] h-full transition-colors ${
              isResizingWidth
                ? 'bg-accent'
                : 'bg-transparent group-hover:bg-accent/60'
            }`}
          />
        </div>

        <div className="p-2 border-b border-studio-border flex items-center gap-1.5">
          <div className="flex-1 grid grid-cols-3 gap-1 bg-studio-bg p-1 rounded-lg border border-studio-border min-w-0">
            <button
              type="button"
              onClick={() => setActiveTab('assets')}
              className={`btn-press py-1.5 px-1.5 rounded-md text-xs font-medium flex items-center justify-center gap-1 truncate ${
                activeTab === 'assets'
                  ? 'bg-studio-card text-white shadow-xs border border-studio-border'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Imagens</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('text')}
              className={`btn-press py-1.5 px-1.5 rounded-md text-xs font-medium flex items-center justify-center gap-1 truncate ${
                activeTab === 'text'
                  ? 'bg-studio-card text-white shadow-xs border border-studio-border'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Type className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Texto</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('background')}
              className={`btn-press py-1.5 px-1.5 rounded-md text-xs font-medium flex items-center justify-center gap-1 truncate ${
                activeTab === 'background'
                  ? 'bg-studio-card text-white shadow-xs border border-studio-border'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Palette className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Fundo</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleOpen}
            title="Recolher painel esquerdo"
            className="btn-press p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-studio-hover shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <div
          onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
          className="flex-1 overflow-y-auto p-3 space-y-3"
        >
          {activeTab === 'assets' && (
            <AssetsLibraryTab
              assets={project.assets}
              slidesCount={project.slidesCount}
              scrollTop={scrollTop}
              onAddFiles={onAddFiles}
              onInsertAsset={addAssetToCanvas}
              onDeleteAsset={handleDeleteAsset}
            />
          )}

          {activeTab === 'text' && (
            <TextPresetsTab onAddText={handleAddTextLayer} />
          )}

          {activeTab === 'background' && (
            <BackgroundPresetsTab
              backgroundColor={project.backgroundColor}
              onUpdateProject={onUpdateProject}
            />
          )}
        </div>
      </aside>
    );
  },
  (prev, next) =>
    prev.isOpen === next.isOpen &&
    prev.width === next.width &&
    prev.lastClickedPoint === next.lastClickedPoint &&
    prev.project.assets === next.project.assets &&
    prev.project.slidesCount === next.project.slidesCount &&
    prev.project.formatId === next.project.formatId &&
    prev.project.backgroundColor === next.project.backgroundColor &&
    prev.project.backgroundGradient === next.project.backgroundGradient
);
