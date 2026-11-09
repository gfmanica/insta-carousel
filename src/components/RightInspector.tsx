import React, { useState } from 'react';
import {
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  MoveHorizontal,
  AlignCenter,
  FlipHorizontal,
  FlipVertical,
  Maximize2,
  Crop,
  RotateCw,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  GripVertical,
} from 'lucide-react';
import type { CarouselProject, CanvasLayer, ImageLayer } from '../types/carousel';
import { INSTAGRAM_FORMATS } from '../types/carousel';

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

export const RightInspector: React.FC<RightInspectorProps> = ({
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
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);

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
      ordered.forEach((l, idx) => {
        zMap.set(l.id, total - idx);
      });

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
      const nextW = Math.max(220, Math.min(540, startW - (ev.clientX - startX)));
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
      const nextH = Math.max(96, Math.min(maxH, startH - (ev.clientY - startY)));
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
  const currentFormat = INSTAGRAM_FORMATS[project.formatId];
  const slideW = currentFormat.width;
  const slideH = currentFormat.height;

  const selectedLayer =
    project.layers.find((l) => l.id === selectedLayerId) || null;

  const sortedLayersDesc = [...project.layers].sort(
    (a, b) => b.zIndex - a.zIndex
  );

  const handleBringForward = (layerId: string) => {
    onUpdateProject((prev) => {
      const ordered = [...prev.layers].sort((a, b) => b.zIndex - a.zIndex);
      const idx = ordered.findIndex((l) => l.id === layerId);
      if (idx <= 0) return prev;
      [ordered[idx - 1], ordered[idx]] = [ordered[idx], ordered[idx - 1]];
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

  const handleSendBackward = (layerId: string) => {
    onUpdateProject((prev) => {
      const ordered = [...prev.layers].sort((a, b) => b.zIndex - a.zIndex);
      const idx = ordered.findIndex((l) => l.id === layerId);
      if (idx === -1 || idx >= ordered.length - 1) return prev;
      [ordered[idx], ordered[idx + 1]] = [ordered[idx + 1], ordered[idx]];
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

  const centerOnSeam = (seamIndex: number) => {
    if (!selectedLayer) return;
    const seamX = (seamIndex + 1) * slideW;
    onUpdateLayer(selectedLayer.id, (l) => ({
      ...l,
      x: Math.round(seamX - l.width / 2),
    }));
  };

  const centerInSlide = (slideIndex: number) => {
    if (!selectedLayer) return;
    const slideStartX = slideIndex * slideW;
    onUpdateLayer(selectedLayer.id, (l) => ({
      ...l,
      x: Math.round(slideStartX + (slideW - l.width) / 2),
      y: Math.round((slideH - l.height) / 2),
    }));
  };

  const spanFullCarousel = () => {
    if (!selectedLayer) return;
    const totalW = slideW * project.slidesCount;
    onUpdateLayer(selectedLayer.id, (l) => {
      const ratio = l.width / Math.max(1, l.height);
      const nextW = totalW - 160;
      const nextH = Math.min(slideH - 120, Math.round(nextW / ratio));
      return {
        ...l,
        x: 80,
        y: Math.round((slideH - nextH) / 2),
        width: nextW,
        height: nextH,
      };
    });
  };

  const scaleLayerByFactor = (factor: number) => {
    if (!selectedLayer) return;
    onUpdateLayer(selectedLayer.id, (l) => {
      const nextW = Math.max(40, Math.round(l.width * factor));
      const nextH = Math.max(40, Math.round(l.height * factor));
      const dx = Math.round((l.width - nextW) / 2);
      const dy = Math.round((l.height - nextH) / 2);
      return {
        ...l,
        x: l.x + dx,
        y: l.y + dy,
        width: nextW,
        height: nextH,
      };
    });
  };

  if (!isOpen) {
    return (
      <div className="w-8 bg-studio-panel border-l border-studio-border flex flex-col items-center py-2.5 gap-3 shrink-0 select-none z-10">
        <button
          type="button"
          onClick={onToggleOpen}
          title="Expandir painel direito (Propriedades e Camadas)"
          className="btn-press p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-studio-hover border border-transparent hover:border-studio-border"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div
          onClick={onToggleOpen}
          className="cursor-pointer text-[10px] font-medium text-zinc-500 hover:text-zinc-300 tracking-wider uppercase [writing-mode:vertical-rl] py-2"
        >
          Propriedades · Camadas ({project.layers.length})
        </div>
      </div>
    );
  }

  return (
    <aside
      style={{ width: `${width}px` }}
      className="relative bg-studio-panel border-l border-studio-border flex flex-col shrink-0 select-none z-10 overflow-hidden"
    >
      {/* Left Edge Horizontal Resizer */}
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

      {/* Top half: Selected Layer Inspector */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[120px]">
        <div className="flex items-center justify-between gap-1">
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
          {selectedLayer && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onDuplicateLayer(selectedLayer)}
                title="Duplicar camada (Ctrl+D)"
                className="btn-press p-1 rounded hover:bg-studio-hover text-zinc-400 hover:text-zinc-200"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDeleteLayer(selectedLayer.id)}
                title="Excluir camada (Delete)"
                className="btn-press px-2 py-0.5 rounded bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white text-[11px] font-medium flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span>Excluir</span>
              </button>
            </div>
          )}
        </div>

        {!selectedLayer ? (
          <div className="py-10 px-4 text-center space-y-1">
            <p className="text-xs font-medium text-zinc-400">
              Nenhuma camada selecionada
            </p>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Selecione uma imagem ou texto no canvas para editar dimensões, recorte, rotação e alinhamento.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Primary Actions: Crop, Flip, Rotate */}
            <div className="space-y-1.5">
              {selectedLayer.type === 'image' && (
                <button
                  type="button"
                  onClick={() => onOpenCropModal(selectedLayer)}
                  className="btn-press w-full py-2 px-3 rounded-lg bg-studio-card hover:bg-studio-hover border border-studio-border text-zinc-100 font-medium text-xs flex items-center justify-center gap-1.5"
                >
                  <Crop className="w-3.5 h-3.5 text-accent" />
                  <span>Cortar Imagem</span>
                </button>
              )}

              <div className="grid grid-cols-4 gap-1">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateLayer(selectedLayer.id, (l) => ({
                      ...l,
                      flipX: !l.flipX,
                    }))
                  }
                  title="Virar horizontalmente"
                  className={`btn-press py-1.5 rounded-md border text-[11px] font-medium flex items-center justify-center gap-1 ${
                    selectedLayer.flipX
                      ? 'bg-accent/15 border-accent/40 text-accent'
                      : 'bg-studio-card border-studio-border text-zinc-300 hover:bg-studio-hover'
                  }`}
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                  <span>Esp. H</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onUpdateLayer(selectedLayer.id, (l) => ({
                      ...l,
                      flipY: !l.flipY,
                    }))
                  }
                  title="Virar verticalmente"
                  className={`btn-press py-1.5 rounded-md border text-[11px] font-medium flex items-center justify-center gap-1 ${
                    selectedLayer.flipY
                      ? 'bg-accent/15 border-accent/40 text-accent'
                      : 'bg-studio-card border-studio-border text-zinc-300 hover:bg-studio-hover'
                  }`}
                >
                  <FlipVertical className="w-3.5 h-3.5" />
                  <span>Esp. V</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onUpdateLayer(selectedLayer.id, (l) => ({
                      ...l,
                      rotation: ((l.rotation || 0) - 90) % 360,
                    }))
                  }
                  title="Girar -90°"
                  className="btn-press py-1.5 rounded-md bg-studio-card hover:bg-studio-hover border border-studio-border text-[11px] font-medium text-zinc-300 flex items-center justify-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>-90°</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onUpdateLayer(selectedLayer.id, (l) => ({
                      ...l,
                      rotation: ((l.rotation || 0) + 90) % 360,
                    }))
                  }
                  title="Girar +90°"
                  className="btn-press py-1.5 rounded-md bg-studio-card hover:bg-studio-hover border border-studio-border text-[11px] font-medium text-zinc-300 flex items-center justify-center gap-1"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>+90°</span>
                </button>
              </div>
            </div>

            {/* Coordinates & Dimensions (Compact 2x2 Figma-style Grid) */}
            <div className="space-y-1.5 pt-2 border-t border-studio-border">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-zinc-400">
                  Dimensões e Posição
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => scaleLayerByFactor(0.85)}
                    className="btn-press px-1.5 py-0.5 rounded bg-studio-card hover:bg-studio-hover text-[10px] font-mono text-zinc-300 border border-studio-border"
                  >
                    -15%
                  </button>
                  <button
                    type="button"
                    onClick={() => scaleLayerByFactor(1.15)}
                    className="btn-press px-1.5 py-0.5 rounded bg-studio-card hover:bg-studio-hover text-[10px] font-mono text-zinc-300 border border-studio-border"
                  >
                    +15%
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <label className="bg-studio-card px-2.5 py-1.5 rounded-md border border-studio-border flex items-center justify-between focus-within:border-accent">
                  <span className="text-[11px] font-mono text-zinc-500">X</span>
                  <input
                    type="number"
                    value={selectedLayer.x}
                    onChange={(e) =>
                      onUpdateLayer(selectedLayer.id, (l) => ({
                        ...l,
                        x: Number(e.target.value),
                      }))
                    }
                    className="w-16 bg-transparent text-xs font-mono text-right text-zinc-100 focus:outline-none"
                  />
                </label>

                <label className="bg-studio-card px-2.5 py-1.5 rounded-md border border-studio-border flex items-center justify-between focus-within:border-accent">
                  <span className="text-[11px] font-mono text-zinc-500">Y</span>
                  <input
                    type="number"
                    value={selectedLayer.y}
                    onChange={(e) =>
                      onUpdateLayer(selectedLayer.id, (l) => ({
                        ...l,
                        y: Number(e.target.value),
                      }))
                    }
                    className="w-16 bg-transparent text-xs font-mono text-right text-zinc-100 focus:outline-none"
                  />
                </label>

                <label className="bg-studio-card px-2.5 py-1.5 rounded-md border border-studio-border flex items-center justify-between focus-within:border-accent">
                  <span className="text-[11px] font-mono text-zinc-500">L</span>
                  <input
                    type="number"
                    min={40}
                    value={selectedLayer.width}
                    onChange={(e) =>
                      onUpdateLayer(selectedLayer.id, (l) => ({
                        ...l,
                        width: Math.max(40, Number(e.target.value)),
                      }))
                    }
                    className="w-16 bg-transparent text-xs font-mono text-right text-zinc-100 focus:outline-none"
                  />
                </label>

                <label className="bg-studio-card px-2.5 py-1.5 rounded-md border border-studio-border flex items-center justify-between focus-within:border-accent">
                  <span className="text-[11px] font-mono text-zinc-500">A</span>
                  <input
                    type="number"
                    min={40}
                    value={selectedLayer.height}
                    onChange={(e) =>
                      onUpdateLayer(selectedLayer.id, (l) => ({
                        ...l,
                        height: Math.max(40, Number(e.target.value)),
                      }))
                    }
                    className="w-16 bg-transparent text-xs font-mono text-right text-zinc-100 focus:outline-none"
                  />
                </label>
              </div>
            </div>

            {/* Alignment & Cross-Slide Positioning */}
            <div className="space-y-2 pt-2 border-t border-studio-border">
              {project.slidesCount > 1 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
                    <MoveHorizontal className="w-3 h-3 text-accent" />
                    Alinhar na divisória entre quadros
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {Array.from({ length: project.slidesCount - 1 }).map(
                      (_, seamIdx) => (
                        <button
                          key={seamIdx}
                          type="button"
                          onClick={() => centerOnSeam(seamIdx)}
                          className="btn-press px-2 py-1 rounded bg-studio-card hover:bg-studio-hover text-[11px] font-mono text-zinc-300 border border-studio-border"
                        >
                          {seamIdx + 1}↔{seamIdx + 2}
                        </button>
                      )
                    )}
                    <button
                      type="button"
                      onClick={spanFullCarousel}
                      className="btn-press px-2 py-1 rounded bg-studio-card hover:bg-studio-hover text-[11px] text-zinc-300 border border-studio-border flex items-center gap-1"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Expandir tudo</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
                  <AlignCenter className="w-3 h-3" />
                  Centralizar no quadro
                </span>
                <div className="flex flex-wrap gap-1">
                  {Array.from({ length: project.slidesCount }).map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => centerInSlide(idx)}
                      className="btn-press px-2 py-1 rounded bg-studio-card hover:bg-studio-hover text-[11px] font-mono text-zinc-300 border border-studio-border"
                    >
                      {String(idx + 1).padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sliders: Angle, Opacity, Radius, Shadow */}
            <div className="space-y-2.5 pt-2 border-t border-studio-border">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-zinc-400">Rotação</span>
                  <span className="font-mono text-zinc-200">
                    {selectedLayer.rotation}°
                  </span>
                </div>
                <input
                  type="range"
                  min={-180}
                  max={180}
                  value={selectedLayer.rotation}
                  onChange={(e) =>
                    onUpdateLayer(selectedLayer.id, (l) => ({
                      ...l,
                      rotation: Number(e.target.value),
                    }))
                  }
                  className="w-full cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-zinc-400">Opacidade</span>
                  <span className="font-mono text-zinc-200">
                    {Math.round(selectedLayer.opacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.02}
                  value={selectedLayer.opacity}
                  onChange={(e) =>
                    onUpdateLayer(selectedLayer.id, (l) => ({
                      ...l,
                      opacity: Number(e.target.value),
                    }))
                  }
                  className="w-full cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-zinc-400">Arredondamento</span>
                  <span className="font-mono text-zinc-200">
                    {selectedLayer.borderRadius || 0}px
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={160}
                  value={selectedLayer.borderRadius || 0}
                  onChange={(e) =>
                    onUpdateLayer(selectedLayer.id, (l) => ({
                      ...l,
                      borderRadius: Number(e.target.value),
                    }))
                  }
                  className="w-full cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-zinc-400">Sombra</span>
                  <span className="font-mono text-zinc-200">
                    {selectedLayer.shadowBlur || 0}px
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={80}
                  value={selectedLayer.shadowBlur || 0}
                  onChange={(e) =>
                    onUpdateLayer(selectedLayer.id, (l) => ({
                      ...l,
                      shadowBlur: Number(e.target.value),
                    }))
                  }
                  className="w-full cursor-pointer"
                />
              </div>
            </div>

            {/* Text Layer Specific Controls */}
            {selectedLayer.type === 'text' && (
              <div className="space-y-2 pt-2 border-t border-studio-border">
                <label className="block text-[11px] font-medium text-zinc-400">
                  Texto
                </label>
                <textarea
                  rows={2}
                  value={selectedLayer.text}
                  onChange={(e) =>
                    onUpdateLayer(selectedLayer.id, (l) =>
                      l.type === 'text' ? { ...l, text: e.target.value } : l
                    )
                  }
                  className="w-full bg-studio-card text-xs text-zinc-100 p-2 rounded-md border border-studio-border focus:border-accent focus:outline-none"
                />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <span className="block text-[10px] text-zinc-400 mb-1">
                      Tamanho ({selectedLayer.fontSize}px)
                    </span>
                    <input
                      type="range"
                      min={20}
                      max={140}
                      value={selectedLayer.fontSize}
                      onChange={(e) =>
                        onUpdateLayer(selectedLayer.id, (l) =>
                          l.type === 'text'
                            ? { ...l, fontSize: Number(e.target.value) }
                            : l
                        )
                      }
                      className="w-full"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] text-zinc-400 mb-1">
                      Cor
                    </span>
                    <input
                      type="color"
                      value={selectedLayer.color}
                      onChange={(e) =>
                        onUpdateLayer(selectedLayer.id, (l) =>
                          l.type === 'text'
                            ? { ...l, color: e.target.value }
                            : l
                        )
                      }
                      className="w-7 h-7 rounded cursor-pointer bg-transparent"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Horizontal Splitter Bar to Resize Height of Layers Section */}
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

      {/* Bottom Half: Layers List (Resizable Height + Collapsible) */}
      <div
        style={{
          height: isLayersCollapsed ? '38px' : `${layersPanelHeight}px`,
        }}
        className="flex flex-col px-3 py-2 bg-studio-bg/40 shrink-0 overflow-hidden"
      >
        <div className="flex items-center justify-between mb-1.5 shrink-0">
          <h3 className="text-[11px] font-medium text-zinc-400">
            Camadas ({project.layers.length})
          </h3>
          <button
            type="button"
            onClick={() => setIsLayersCollapsed((c) => !c)}
            title={
              isLayersCollapsed
                ? 'Expandir lista de camadas'
                : 'Recolher lista de camadas'
            }
            className="btn-press p-1 rounded text-zinc-400 hover:text-white hover:bg-studio-hover"
          >
            {isLayersCollapsed ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {!isLayersCollapsed && (
          <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
            {sortedLayersDesc.map((layer) => {
              const isSelected = layer.id === selectedLayerId;
              const isDragTarget =
                dragOverLayerId === layer.id && draggedLayerId !== layer.id;
              return (
                <div
                  key={layer.id}
                  draggable
                  onDragStart={(e) => {
                    setDraggedLayerId(layer.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverLayerId !== layer.id) {
                      setDragOverLayerId(layer.id);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedLayerId) {
                      handleReorderLayer(draggedLayerId, layer.id);
                    }
                    setDraggedLayerId(null);
                    setDragOverLayerId(null);
                  }}
                  onDragEnd={() => {
                    setDraggedLayerId(null);
                    setDragOverLayerId(null);
                  }}
                  onClick={() => onSelectLayer(layer.id)}
                  className={`px-1.5 py-1.5 rounded-md border text-xs flex items-center justify-between gap-1.5 cursor-pointer transition-colors ${
                    isDragTarget
                      ? 'border-accent bg-accent/25 text-white'
                      : isSelected
                      ? 'bg-accent/15 border-accent/50 text-white'
                      : 'bg-studio-card border-studio-border text-zinc-300 hover:bg-studio-hover'
                  } ${draggedLayerId === layer.id ? 'opacity-45' : ''}`}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <GripVertical className="w-3.5 h-3.5 text-zinc-500 shrink-0 cursor-grab active:cursor-grabbing" />
                    {layer.type === 'image' ? (
                      <img
                        src={layer.dataUrl}
                        alt=""
                        draggable={false}
                        className="w-6 h-6 rounded-xs object-cover bg-studio-bg shrink-0"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-xs bg-studio-panel text-zinc-400 font-mono text-[11px] font-bold flex items-center justify-center shrink-0 border border-studio-border">
                        T
                      </div>
                    )}
                    <span className="truncate text-[11px]">{layer.name}</span>
                  </div>

                  <div
                    className="flex items-center gap-0.5 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {layer.type === 'image' && (
                      <button
                        type="button"
                        onClick={() => onOpenCropModal(layer)}
                        title="Cortar"
                        className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white"
                      >
                        <Crop className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleBringForward(layer.id)}
                      title="Trazer para frente"
                      className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendBackward(layer.id)}
                      title="Enviar para trás"
                      className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateLayer(layer.id, (l) => ({
                          ...l,
                          locked: !l.locked,
                        }))
                      }
                      title={layer.locked ? 'Desbloquear' : 'Bloquear'}
                      className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white"
                    >
                      {layer.locked ? (
                        <Lock className="w-3 h-3 text-amber-400" />
                      ) : (
                        <Unlock className="w-3 h-3" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateLayer(layer.id, (l) => ({
                          ...l,
                          visible: !l.visible,
                        }))
                      }
                      title={layer.visible ? 'Ocultar' : 'Mostrar'}
                      className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white"
                    >
                      {layer.visible ? (
                        <Eye className="w-3 h-3" />
                      ) : (
                        <EyeOff className="w-3 h-3 text-zinc-600" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteLayer(layer.id)}
                      title="Excluir"
                      className="p-1 rounded hover:bg-red-500/20 text-zinc-400 hover:text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};
