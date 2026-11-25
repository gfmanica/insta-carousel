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
  ChevronDown,
  ChevronUp,
  GripVertical,
} from 'lucide-react';
import type { CanvasLayer, ImageLayer } from '../types/carousel';

interface LayerPropertiesPanelProps {
  selectedLayer: CanvasLayer | null;
  slidesCount: number;
  slideW: number;
  slideH: number;
  onUpdateLayer: (layerId: string, updater: (layer: CanvasLayer) => CanvasLayer) => void;
  onDeleteLayer: (layerId: string) => void;
  onDuplicateLayer: (layer: CanvasLayer) => void;
  onOpenCropModal: (layer: ImageLayer) => void;
}

const LayerTransformActions: React.FC<{
  layer: CanvasLayer;
  onUpdateLayer: (layerId: string, updater: (layer: CanvasLayer) => CanvasLayer) => void;
  onOpenCropModal: (layer: ImageLayer) => void;
}> = ({ layer, onUpdateLayer, onOpenCropModal }) => (
  <div className="space-y-1.5">
    {layer.type === 'image' && (
      <button
        type="button"
        onClick={() => onOpenCropModal(layer)}
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
          onUpdateLayer(layer.id, (l) => ({ ...l, flipX: !l.flipX }))
        }
        title="Virar horizontalmente"
        className={`btn-press py-1.5 rounded-md border text-[11px] font-medium flex items-center justify-center gap-1 ${
          layer.flipX
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
          onUpdateLayer(layer.id, (l) => ({ ...l, flipY: !l.flipY }))
        }
        title="Virar verticalmente"
        className={`btn-press py-1.5 rounded-md border text-[11px] font-medium flex items-center justify-center gap-1 ${
          layer.flipY
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
          onUpdateLayer(layer.id, (l) => ({
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
          onUpdateLayer(layer.id, (l) => ({
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
);

const LayerAlignmentSection: React.FC<{
  slidesCount: number;
  onCenterSeam: (seamIdx: number) => void;
  onSpanFull: () => void;
  onCenterSlide: (idx: number) => void;
}> = ({ slidesCount, onCenterSeam, onSpanFull, onCenterSlide }) => (
  <div className="space-y-2 pt-2 border-t border-studio-border">
    {slidesCount > 1 && (
      <div className="space-y-1.5">
        <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
          <MoveHorizontal className="w-3 h-3 text-accent" />
          Alinhar na divisória entre quadros
        </span>
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: slidesCount - 1 }).map((_, seamIdx) => (
            <button
              key={seamIdx}
              type="button"
              onClick={() => onCenterSeam(seamIdx)}
              className="btn-press px-2 py-1 rounded bg-studio-card hover:bg-studio-hover text-[11px] font-mono text-zinc-300 border border-studio-border"
            >
              {seamIdx + 1}↔{seamIdx + 2}
            </button>
          ))}
          <button
            type="button"
            onClick={onSpanFull}
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
        {Array.from({ length: slidesCount }).map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onCenterSlide(idx)}
            className="btn-press px-2 py-1 rounded bg-studio-card hover:bg-studio-hover text-[11px] font-mono text-zinc-300 border border-studio-border"
          >
            {String(idx + 1).padStart(2, '0')}
          </button>
        ))}
      </div>
    </div>
  </div>
);

export const LayerPropertiesPanel: React.FC<LayerPropertiesPanelProps> = ({
  selectedLayer,
  slidesCount,
  slideW,
  slideH,
  onUpdateLayer,
  onDeleteLayer,
  onDuplicateLayer,
  onOpenCropModal,
}) => {
  if (!selectedLayer) {
    return (
      <div className="py-10 px-4 text-center space-y-1">
        <p className="text-xs font-medium text-zinc-400">
          Nenhuma camada selecionada
        </p>
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          Selecione uma imagem ou texto no canvas para editar dimensões, recorte, rotação e alinhamento.
        </p>
      </div>
    );
  }

  const centerOnSeam = (seamIndex: number) => {
    const seamX = (seamIndex + 1) * slideW;
    onUpdateLayer(selectedLayer.id, (l) => ({
      ...l,
      x: Math.round(seamX - l.width / 2),
    }));
  };

  const centerInSlide = (slideIndex: number) => {
    const slideStartX = slideIndex * slideW;
    onUpdateLayer(selectedLayer.id, (l) => ({
      ...l,
      x: Math.round(slideStartX + (slideW - l.width) / 2),
      y: Math.round((slideH - l.height) / 2),
    }));
  };

  const spanFullCarousel = () => {
    const totalW = slideW * slidesCount;
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-1 -mt-1">
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

      <LayerTransformActions
        layer={selectedLayer}
        onUpdateLayer={onUpdateLayer}
        onOpenCropModal={onOpenCropModal}
      />

      {/* Coordinates & Dimensions */}
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
          {(
            [
              { label: 'X', value: selectedLayer.x, key: 'x' },
              { label: 'Y', value: selectedLayer.y, key: 'y' },
              { label: 'L', value: selectedLayer.width, key: 'width', min: 40 },
              { label: 'A', value: selectedLayer.height, key: 'height', min: 40 },
            ] as const
          ).map((field) => (
            <label
              key={field.key}
              className="bg-studio-card px-2.5 py-1.5 rounded-md border border-studio-border flex items-center justify-between focus-within:border-accent"
            >
              <span className="text-[11px] font-mono text-zinc-500">
                {field.label}
              </span>
              <input
                type="number"
                min={'min' in field ? field.min : undefined}
                value={field.value}
                onChange={(e) => {
                  const val = e.currentTarget.valueAsNumber;
                  if (!Number.isFinite(val)) return;
                  const safeVal = 'min' in field ? Math.max(field.min, val) : val;
                  onUpdateLayer(selectedLayer.id, (l) => ({
                    ...l,
                    [field.key]: safeVal,
                  }));
                }}
                className="w-16 bg-transparent text-xs font-mono text-right text-zinc-100 focus:outline-none"
              />
            </label>
          ))}
        </div>
      </div>

      <LayerAlignmentSection
        slidesCount={slidesCount}
        onCenterSeam={centerOnSeam}
        onSpanFull={spanFullCarousel}
        onCenterSlide={centerInSlide}
      />

      {/* Sliders */}
      <div className="space-y-2.5 pt-2 border-t border-studio-border">
        <LayerSlider
          label="Rotação"
          valueText={`${selectedLayer.rotation}°`}
          min={-180}
          max={180}
          value={selectedLayer.rotation}
          onChange={(v) =>
            onUpdateLayer(selectedLayer.id, (l) => ({ ...l, rotation: v }))
          }
        />
        <LayerSlider
          label="Opacidade"
          valueText={`${Math.round(selectedLayer.opacity * 100)}%`}
          min={0.1}
          max={1}
          step={0.02}
          value={selectedLayer.opacity}
          onChange={(v) =>
            onUpdateLayer(selectedLayer.id, (l) => ({ ...l, opacity: v }))
          }
        />
        <LayerSlider
          label="Arredondamento"
          valueText={`${selectedLayer.borderRadius || 0}px`}
          min={0}
          max={160}
          value={selectedLayer.borderRadius || 0}
          onChange={(v) =>
            onUpdateLayer(selectedLayer.id, (l) => ({ ...l, borderRadius: v }))
          }
        />
        <LayerSlider
          label="Sombra"
          valueText={`${selectedLayer.shadowBlur || 0}px`}
          min={0}
          max={80}
          value={selectedLayer.shadowBlur || 0}
          onChange={(v) =>
            onUpdateLayer(selectedLayer.id, (l) => ({ ...l, shadowBlur: v }))
          }
        />
      </div>

      {selectedLayer.type === 'text' && (
        <div className="space-y-2 pt-2 border-t border-studio-border">
          <label
            htmlFor="layer-text-input"
            className="block text-[11px] font-medium text-zinc-400"
          >
            Texto
          </label>
          <textarea
            id="layer-text-input"
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
              <label
                htmlFor="layer-font-size"
                className="block text-[10px] text-zinc-400 mb-1"
              >
                Tamanho ({selectedLayer.fontSize}px)
              </label>
              <input
                id="layer-font-size"
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
              <label
                htmlFor="layer-text-color"
                className="block text-[10px] text-zinc-400 mb-1"
              >
                Cor
              </label>
              <input
                id="layer-text-color"
                type="color"
                value={selectedLayer.color}
                onChange={(e) =>
                  onUpdateLayer(selectedLayer.id, (l) =>
                    l.type === 'text' ? { ...l, color: e.target.value } : l
                  )
                }
                className="w-7 h-7 rounded cursor-pointer bg-transparent"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const LayerSlider: React.FC<{
  label: string;
  valueText: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (val: number) => void;
}> = ({ label, valueText, min, max, step = 1, value, onChange }) => {
  const sliderId = React.useId();
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1">
        <label htmlFor={sliderId} className="text-zinc-400">
          {label}
        </label>
        <span className="font-mono text-zinc-200">{valueText}</span>
      </div>
      <input
        id={sliderId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer"
      />
    </div>
  );
};

interface LayersListPanelProps {
  layers: CanvasLayer[];
  selectedLayerId: string | null;
  panelHeight: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectLayer: (layerId: string) => void;
  onUpdateLayer: (layerId: string, updater: (layer: CanvasLayer) => CanvasLayer) => void;
  onDeleteLayer: (layerId: string) => void;
  onOpenCropModal: (layer: ImageLayer) => void;
  onBringForward: (layerId: string) => void;
  onSendBackward: (layerId: string) => void;
  onReorderLayer: (sourceId: string, targetId: string) => void;
}

export const LayersListPanel: React.FC<LayersListPanelProps> = ({
  layers,
  selectedLayerId,
  panelHeight,
  isCollapsed,
  onToggleCollapse,
  onSelectLayer,
  onUpdateLayer,
  onDeleteLayer,
  onOpenCropModal,
  onBringForward,
  onSendBackward,
  onReorderLayer,
}) => {
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);
  const [layersScrollTop, setLayersScrollTop] = useState<number>(0);

  const sortedLayersDesc = [...layers].sort((a, b) => b.zIndex - a.zIndex);

  const LAYER_ROW_HEIGHT = 42;
  const visibleLayerRows = Math.ceil(panelHeight / LAYER_ROW_HEIGHT) + 6;
  const startLayerIdx = Math.max(
    0,
    Math.floor(layersScrollTop / LAYER_ROW_HEIGHT) - 3
  );
  const endLayerIdx = Math.min(
    sortedLayersDesc.length,
    startLayerIdx + visibleLayerRows + 3
  );
  const visibleLayersList = sortedLayersDesc.slice(startLayerIdx, endLayerIdx);
  const layersTopSpacer = startLayerIdx * LAYER_ROW_HEIGHT;
  const layersBottomSpacer = Math.max(
    0,
    (sortedLayersDesc.length - endLayerIdx) * LAYER_ROW_HEIGHT
  );

  return (
    <div
      style={{ height: isCollapsed ? '38px' : `${panelHeight}px` }}
      className="flex flex-col px-3 py-2 bg-studio-bg/40 shrink-0 overflow-hidden"
    >
      <div className="flex items-center justify-between mb-1.5 shrink-0">
        <h3 className="text-[11px] font-medium text-zinc-400">
          Camadas ({layers.length})
        </h3>
        <button
          type="button"
          onClick={onToggleCollapse}
          title={
            isCollapsed ? 'Expandir lista de camadas' : 'Recolher lista de camadas'
          }
          className="btn-press p-1 rounded text-zinc-400 hover:text-white hover:bg-studio-hover"
        >
          {isCollapsed ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {!isCollapsed && (
        <div
          onScroll={(e) => setLayersScrollTop(e.currentTarget.scrollTop)}
          className="flex-1 overflow-y-auto pr-0.5"
        >
          <div
            style={{
              paddingTop: `${layersTopSpacer}px`,
              paddingBottom: `${layersBottomSpacer}px`,
            }}
            className="space-y-1"
          >
            {visibleLayersList.map((layer) => {
              const isSelected = layer.id === selectedLayerId;
              const isDragTarget =
                dragOverLayerId === layer.id && draggedLayerId !== layer.id;
              return (
                <div
                  key={layer.id}
                  style={{ height: '38px' }}
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
                      onReorderLayer(draggedLayerId, layer.id);
                    }
                    setDraggedLayerId(null);
                    setDragOverLayerId(null);
                  }}
                  onDragEnd={() => {
                    setDraggedLayerId(null);
                    setDragOverLayerId(null);
                  }}
                  className={`px-1.5 py-1.5 rounded-md border text-xs flex items-center justify-between gap-1.5 transition-colors ${
                    isDragTarget
                      ? 'border-accent bg-accent/25 text-white'
                      : isSelected
                      ? 'bg-accent/15 border-accent/50 text-white'
                      : 'bg-studio-card border-studio-border text-zinc-300 hover:bg-studio-hover'
                  } ${draggedLayerId === layer.id ? 'opacity-45' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectLayer(layer.id)}
                    className="flex items-center gap-1.5 min-w-0 flex-1 text-left cursor-pointer"
                  >
                    <GripVertical className="w-3.5 h-3.5 text-zinc-500 shrink-0 cursor-grab active:cursor-grabbing" />
                    {layer.type === 'image' ? (
                      <img
                        src={layer.thumbnailUrl || layer.dataUrl}
                        alt=""
                        draggable={false}
                        decoding="async"
                        loading="lazy"
                        className="w-6 h-6 rounded-xs object-cover bg-studio-bg shrink-0"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-xs bg-studio-panel text-zinc-400 font-mono text-[11px] font-bold flex items-center justify-center shrink-0 border border-studio-border">
                        T
                      </div>
                    )}
                    <span className="truncate text-[11px]">{layer.name}</span>
                  </button>

                  <div className="flex items-center gap-0.5 shrink-0">
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
                      onClick={() => onBringForward(layer.id)}
                      title="Trazer para frente"
                      className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onSendBackward(layer.id)}
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
        </div>
      )}
    </div>
  );
};
