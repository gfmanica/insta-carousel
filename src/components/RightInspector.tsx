import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CarouselProject, CanvasLayer, ImageLayer } from '../types/carousel';
import { INSTAGRAM_FORMATS } from '../types/carousel';
import { LayerPropertiesPanel, LayersListPanel } from './RightInspectorPanels';

interface RightInspectorProps {
  project: CarouselProject;
  selectedLayerId: string | null;
  onSelectLayer: (layerId: string | null) => void;
  onUpdateLayer: (layerId: string, updater: (layer: CanvasLayer) => CanvasLayer) => void;
  onUpdateProject: (updater: (prev: CarouselProject) => CarouselProject) => void;
  onDeleteLayer: (layerId: string) => void;
  onDuplicateLayer: (layer: CanvasLayer) => void;
  onOpenCropModal: (layer: ImageLayer) => void;
  width: number;
  isOpen: boolean;
  onToggleOpen: () => void;
  onResizeWidth: (newWidth: number) => void;
  layersPanelHeight: number;
  onResizeLayersPanelHeight: (newHeight: number) => void;
}

export const RightInspector: React.FC<RightInspectorProps> = React.memo(
  ({
    project,
    selectedLayerId,
    onSelectLayer,
    onUpdateLayer,
    onUpdateProject,
    onDeleteLayer,
    onDuplicateLayer,
    onOpenCropModal,
    width,
    isOpen,
    onToggleOpen,
    onResizeWidth,
    layersPanelHeight,
    onResizeLayersPanelHeight,
  }) => {
    const [isResizingWidth, setIsResizingWidth] = useState(false);
    const [isResizingHeight, setIsResizingHeight] = useState(false);
    const [isLayersCollapsed, setIsLayersCollapsed] = useState(false);

    const currentFormat = INSTAGRAM_FORMATS[project.formatId];
    const selectedLayer =
      project.layers.find((l) => l.id === selectedLayerId) || null;

    const handleReorderLayer = (sourceId: string, targetId: string) => {
      if (sourceId === targetId) return;
      onUpdateProject((prev) => {
        const ordered = [...prev.layers].sort((a, b) => b.zIndex - a.zIndex);
        const fromIdx = ordered.findIndex((l) => l.id === sourceId);
        const toIdx = ordered.findIndex((l) => l.id === targetId);
        if (fromIdx === -1 || toIdx === -1) return prev;

        const [moved] = ordered.splice(fromIdx, 1);
        ordered.splice(toIdx, 0, moved);

        const total = ordered.length;
        const zMap = new Map<string, number>();
        ordered.forEach((l, idx) => zMap.set(l.id, total - idx));

        return {
          ...prev,
          layers: prev.layers.map((l) => ({
            ...l,
            zIndex: zMap.get(l.id) ?? l.zIndex,
          })),
        };
      });
    };

    const moveZIndex = (layerId: string, dir: -1 | 1) => {
      onUpdateProject((prev) => {
        const ordered = [...prev.layers].sort((a, b) => b.zIndex - a.zIndex);
        const idx = ordered.findIndex((l) => l.id === layerId);
        const swapIdx = idx + dir;
        if (idx === -1 || swapIdx < 0 || swapIdx >= ordered.length) return prev;
        [ordered[idx], ordered[swapIdx]] = [ordered[swapIdx], ordered[idx]];
        const total = ordered.length;
        const zMap = new Map<string, number>();
        ordered.forEach((l, i) => zMap.set(l.id, total - i));
        return {
          ...prev,
          layers: prev.layers.map((l) => ({
            ...l,
            zIndex: zMap.get(l.id) ?? l.zIndex,
          })),
        };
      });
    };

    const startResizeWidth = (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startW = width;
      setIsResizingWidth(true);

      const onMove = (ev: PointerEvent) => {
        const nextW = Math.max(
          220,
          Math.min(540, startW - (ev.clientX - startX))
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

    const startResizeLayersHeight = (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (isLayersCollapsed) setIsLayersCollapsed(false);
      const startY = e.clientY;
      const startH = layersPanelHeight;
      setIsResizingHeight(true);

      const onMove = (ev: PointerEvent) => {
        const maxH = Math.max(240, window.innerHeight - 200);
        const nextH = Math.max(
          96,
          Math.min(maxH, startH - (ev.clientY - startY))
        );
        onResizeLayersPanelHeight(nextH);
      };
      const onUp = () => {
        setIsResizingHeight(false);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    };

    if (!isOpen) {
      return (
        <div className="hidden md:flex w-8 bg-studio-panel border-l border-studio-border flex-col items-center py-2.5 gap-3 shrink-0 select-none z-10">
          <button
            type="button"
            onClick={onToggleOpen}
            title="Expandir painel direito (Propriedades e Camadas)"
            className="btn-press p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-studio-hover border border-transparent hover:border-studio-border"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onToggleOpen}
            className="cursor-pointer text-[10px] font-medium text-zinc-500 hover:text-zinc-300 tracking-wider uppercase [writing-mode:vertical-rl] py-2"
          >
            Propriedades · Camadas ({project.layers.length})
          </button>
        </div>
      );
    }

    return (
      <aside
        style={{ width: `${width}px` }}
        className="fixed md:relative inset-y-0 right-0 max-w-[88vw] md:max-w-none bg-studio-panel border-l border-studio-border flex flex-col shrink-0 select-none z-40 md:z-10 overflow-hidden shadow-2xl md:shadow-none"
      >
        <div
          onPointerDown={startResizeWidth}
          title="Arraste para ajustar a largura do painel"
          className="absolute top-0 -left-1 bottom-0 w-2 cursor-col-resize z-30 group flex items-center justify-center"
        >
          <div
            className={`w-[2px] h-full transition-colors ${
              isResizingWidth
                ? 'bg-accent'
                : 'bg-transparent group-hover:bg-accent/60'
            }`}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[120px]">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleOpen}
              title="Recolher painel direito"
              className="btn-press p-1 rounded-md text-zinc-400 hover:text-white hover:bg-studio-hover"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <h2 className="text-[11px] font-medium text-zinc-400">
              Propriedades
            </h2>
          </div>

          <LayerPropertiesPanel
            selectedLayer={selectedLayer}
            slidesCount={project.slidesCount}
            slideW={currentFormat.width}
            slideH={currentFormat.height}
            onUpdateLayer={onUpdateLayer}
            onDeleteLayer={onDeleteLayer}
            onDuplicateLayer={onDuplicateLayer}
            onOpenCropModal={onOpenCropModal}
          />
        </div>

        <div
          onPointerDown={startResizeLayersHeight}
          title="Arraste para ajustar a altura entre Propriedades e Camadas"
          className="h-3 bg-studio-panel border-t border-studio-border cursor-row-resize flex items-center justify-center group shrink-0 touch-none"
        >
          <div
            className={`w-10 h-[2px] rounded-full transition-colors ${
              isResizingHeight
                ? 'bg-accent'
                : 'bg-zinc-700 group-hover:bg-accent/80'
            }`}
          />
        </div>

        <LayersListPanel
          layers={project.layers}
          selectedLayerId={selectedLayerId}
          panelHeight={layersPanelHeight}
          isCollapsed={isLayersCollapsed}
          onToggleCollapse={() => setIsLayersCollapsed((c) => !c)}
          onSelectLayer={onSelectLayer}
          onUpdateLayer={onUpdateLayer}
          onDeleteLayer={onDeleteLayer}
          onOpenCropModal={onOpenCropModal}
          onBringForward={(id) => moveZIndex(id, -1)}
          onSendBackward={(id) => moveZIndex(id, 1)}
          onReorderLayer={handleReorderLayer}
        />
      </aside>
    );
  }
);
