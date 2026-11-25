import React from 'react';
import {
  Lock,
  Crop,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Trash2,
  Copy,
} from 'lucide-react';
import type { CanvasLayer, ImageLayer } from '../types/carousel';
import type { InteractionMode } from '../utils/canvasTransform';

interface CanvasSelectionOverlayProps {
  layer: CanvasLayer;
  invScale: number;
  spannedSlidesBadge: string;
  onStartInteraction: (
    e: React.PointerEvent<HTMLElement>,
    layer: CanvasLayer,
    mode: InteractionMode
  ) => void;
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onEndInteraction: () => void;
  onUpdateLayer: (
    layerId: string,
    updater: (layer: CanvasLayer) => CanvasLayer
  ) => void;
  onOpenCropModal: (layer: ImageLayer) => void;
  onDuplicateLayer: (layer: CanvasLayer) => void;
  onDeleteLayer: (layerId: string) => void;
}

export const CanvasSelectionOverlay: React.FC<CanvasSelectionOverlayProps> = ({
  layer,
  invScale,
  spannedSlidesBadge,
  onStartInteraction,
  onPointerMove,
  onEndInteraction,
  onUpdateLayer,
  onOpenCropModal,
  onDuplicateLayer,
  onDeleteLayer,
}) => (
  <div
    style={{
      position: 'absolute',
      left: `${layer.x}px`,
      top: `${layer.y}px`,
      width: `${layer.width}px`,
      height: `${layer.height}px`,
      transform: `rotate(${layer.rotation}deg)`,
    }}
    className="pointer-events-none"
  >
    <div
      style={{ borderWidth: `${1.5 * invScale}px` }}
      className="absolute inset-0 border border-accent pointer-events-none shadow-[0_0_0_1px_rgba(0,0,0,0.5)]"
    />

    <div
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{
        transform: `scale(${invScale})`,
        transformOrigin: layer.y < 60 ? 'top left' : 'bottom left',
        top: layer.y < 60 ? `${8 * invScale}px` : `${-38 * invScale}px`,
        left: layer.y < 60 ? `${8 * invScale}px` : '0px',
      }}
      className="absolute bg-studio-panel/95 backdrop-blur-md text-zinc-100 px-2 py-1 rounded-lg border border-studio-border shadow-xl flex items-center gap-1 pointer-events-auto whitespace-nowrap touch-none"
    >
      {layer.locked && <Lock className="w-3 h-3 text-amber-400 mr-0.5" />}
      <span className="text-[11px] font-mono text-zinc-400 pr-1.5 border-r border-studio-border">
        {spannedSlidesBadge}
      </span>

      {layer.type === 'image' && (
        <button
          type="button"
          onClick={() => onOpenCropModal(layer)}
          title="Cortar imagem (duplo clique)"
          className="btn-press px-2 py-0.5 rounded bg-accent/15 hover:bg-accent text-accent hover:text-white text-[11px] font-medium flex items-center gap-1 transition-colors"
        >
          <Crop className="w-3 h-3" />
          <span>Cortar</span>
        </button>
      )}

      <button
        type="button"
        onClick={() =>
          onUpdateLayer(layer.id, (l) => ({
            ...l,
            rotation: ((l.rotation || 0) + 90) % 360,
          }))
        }
        title="Girar +90°"
        className="btn-press p-1 rounded hover:bg-studio-hover text-zinc-300 hover:text-white"
      >
        <RotateCw className="w-3 h-3" />
      </button>

      <button
        type="button"
        onClick={() =>
          onUpdateLayer(layer.id, (l) => ({ ...l, flipX: !l.flipX }))
        }
        title="Espelhar horizontalmente"
        className={`btn-press p-1 rounded ${
          layer.flipX
            ? 'bg-accent text-white'
            : 'hover:bg-studio-hover text-zinc-300'
        }`}
      >
        <FlipHorizontal className="w-3 h-3" />
      </button>

      <button
        type="button"
        onClick={() =>
          onUpdateLayer(layer.id, (l) => ({ ...l, flipY: !l.flipY }))
        }
        title="Espelhar verticalmente"
        className={`btn-press p-1 rounded ${
          layer.flipY
            ? 'bg-accent text-white'
            : 'hover:bg-studio-hover text-zinc-300'
        }`}
      >
        <FlipVertical className="w-3 h-3" />
      </button>

      <button
        type="button"
        onClick={() => onDuplicateLayer(layer)}
        title="Duplicar (Ctrl+D)"
        className="btn-press p-1 rounded hover:bg-studio-hover text-zinc-300 hover:text-white"
      >
        <Copy className="w-3 h-3" />
      </button>

      <button
        type="button"
        onClick={() => onDeleteLayer(layer.id)}
        title="Excluir (Delete)"
        className="btn-press p-1 rounded hover:bg-red-500/20 text-zinc-400 hover:text-red-400"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>

    {!layer.locked && (
      <>
        {(['nw', 'ne', 'sw', 'se'] as const).map((dir) => (
          <div
            key={dir}
            onPointerDown={(e) =>
              onStartInteraction(e, layer, `resize-${dir}`)
            }
            onPointerMove={onPointerMove}
            onPointerUp={onEndInteraction}
            style={{
              transform: `translate(-50%, -50%) scale(${invScale})`,
              left: dir.includes('w') ? '0%' : '100%',
              top: dir.includes('n') ? '0%' : '100%',
            }}
            className={`absolute ${
              dir === 'nw' || dir === 'se'
                ? 'cursor-nwse-resize'
                : 'cursor-nesw-resize'
            } w-3 h-3 bg-white border-2 border-accent rounded-xs shadow-sm pointer-events-auto z-20 touch-none`}
          />
        ))}

        {(
          [
            { dir: 'n', left: '50%', top: '0%', cls: 'cursor-ns-resize w-6 h-2' },
            { dir: 's', left: '50%', top: '100%', cls: 'cursor-ns-resize w-6 h-2' },
            { dir: 'w', left: '0%', top: '50%', cls: 'cursor-ew-resize w-2 h-6' },
            { dir: 'e', left: '100%', top: '50%', cls: 'cursor-ew-resize w-2 h-6' },
          ] as const
        ).map((side) => (
          <div
            key={side.dir}
            onPointerDown={(e) =>
              onStartInteraction(e, layer, `resize-${side.dir}`)
            }
            onPointerMove={onPointerMove}
            onPointerUp={onEndInteraction}
            title={
              layer.type === 'image'
                ? 'Arraste para cortar a imagem'
                : 'Arraste para redimensionar'
            }
            style={{
              left: side.left,
              top: side.top,
              transform: `translate(-50%, -50%) scale(${invScale})`,
            }}
            className={`absolute ${side.cls} rounded-full bg-white border-2 border-accent shadow-sm pointer-events-auto z-20 touch-none`}
          />
        ))}

        <div
          onPointerDown={(e) => onStartInteraction(e, layer, 'rotate')}
          onPointerMove={onPointerMove}
          onPointerUp={onEndInteraction}
          style={{
            left: '50%',
            top: '100%',
            transform: `translate(-50%, ${14 * invScale}px) scale(${invScale})`,
          }}
          title="Arraste para girar livremente"
          className="absolute w-6 h-6 rounded-full bg-studio-panel text-zinc-200 border border-studio-border hover:border-accent shadow-md cursor-ew-resize flex items-center justify-center text-xs pointer-events-auto z-20 touch-none"
        >
          ↻
        </div>
      </>
    )}
  </div>
);
