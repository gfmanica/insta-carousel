import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  RotateCcw,
  Check,
} from 'lucide-react';
import type { ImageCrop, ImageLayer } from '../types/carousel';

interface CropModalProps {
  layer: ImageLayer | null;
  onClose: () => void;
  onApplyCrop: (layerId: string, crop: ImageCrop, newWidth: number, newHeight: number) => void;
}

type CropDragMode =
  | 'move'
  | 'nw'
  | 'ne'
  | 'sw'
  | 'se'
  | 'n'
  | 's'
  | 'e'
  | 'w';

export const CropModal: React.FC<CropModalProps> = ({
  layer,
  onClose,
  onApplyCrop,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const [crop, setCrop] = useState<ImageCrop>({
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  });

  const [dragState, setDragState] = useState<{
    mode: CropDragMode;
    startX: number;
    startY: number;
    initialCrop: ImageCrop;
  } | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (layer) {
      setCrop(
        layer.crop || {
          x: 0,
          y: 0,
          width: 1,
          height: 1,
        }
      );
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [layer]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = '';
      onClose();
    };
    dialog.addEventListener('close', handleClose);

    let cleanupClick: (() => void) | undefined;
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      const handleBackdropClick = (event: MouseEvent) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isDialogContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (!isDialogContent) {
          dialog.close();
        }
      };
      dialog.addEventListener('click', handleBackdropClick);
      cleanupClick = () =>
        dialog.removeEventListener('click', handleBackdropClick);
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
      cleanupClick?.();
    };
  }, [onClose]);

  if (!layer) return null;

  const startCropDrag = (
    e: React.PointerEvent<HTMLElement>,
    mode: CropDragMode
  ) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragState({
      mode,
      startX: e.clientX,
      startY: e.clientY,
      initialCrop: { ...crop },
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!dragState || !stageRef.current) return;
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;

    const rect = stageRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dx = (e.clientX - dragState.startX) / rect.width;
    const dy = (e.clientY - dragState.startY) / rect.height;
    const init = dragState.initialCrop;
    const minSize = 0.08;

    let nx = init.x;
    let ny = init.y;
    let nw = init.width;
    let nh = init.height;

    if (dragState.mode === 'move') {
      nx = Math.max(0, Math.min(1 - nw, init.x + dx));
      ny = Math.max(0, Math.min(1 - nh, init.y + dy));
    } else {
      if (dragState.mode.includes('w')) {
        const maxLeft = init.x + init.width - minSize;
        nx = Math.max(0, Math.min(maxLeft, init.x + dx));
        nw = init.width + (init.x - nx);
      }
      if (dragState.mode.includes('e')) {
        nw = Math.max(minSize, Math.min(1 - init.x, init.width + dx));
      }
      if (dragState.mode.includes('n')) {
        const maxTop = init.y + init.height - minSize;
        ny = Math.max(0, Math.min(maxTop, init.y + dy));
        nh = init.height + (init.y - ny);
      }
      if (dragState.mode.includes('s')) {
        nh = Math.max(minSize, Math.min(1 - init.y, init.height + dy));
      }
    }

    setCrop({
      x: +nx.toFixed(4),
      y: +ny.toFixed(4),
      width: +nw.toFixed(4),
      height: +nh.toFixed(4),
    });
  };

  const endCropDrag = () => {
    setDragState(null);
  };

  const applyAspectRatioPreset = (targetRatio: number | null) => {
    if (targetRatio === null) {
      setCrop({ x: 0, y: 0, width: 1, height: 1 });
      return;
    }
    const imgRatio = layer.naturalWidth / Math.max(1, layer.naturalHeight);
    const normRatio = targetRatio / imgRatio;
    let cw = 1;
    let ch = 1;
    if (normRatio > 1) {
      cw = 1;
      ch = 1 / normRatio;
    } else {
      ch = 1;
      cw = normRatio;
    }
    setCrop({
      x: +((1 - cw) / 2).toFixed(4),
      y: +((1 - ch) / 2).toFixed(4),
      width: +cw.toFixed(4),
      height: +ch.toFixed(4),
    });
  };

  const handleConfirm = () => {
    const prevCrop = layer.crop || { x: 0, y: 0, width: 1, height: 1 };
    const scaleW = crop.width / Math.max(0.05, prevCrop.width);
    const scaleH = crop.height / Math.max(0.05, prevCrop.height);

    const newW = Math.max(40, Math.round(layer.width * scaleW));
    const newH = Math.max(40, Math.round(layer.height * scaleH));

    onApplyCrop(layer.id, crop, newW, newH);
    dialogRef.current?.close();
  };

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: 'any' } as React.DialogHTMLAttributes<HTMLDialogElement>)}
      aria-labelledby="crop-dialog-title"
      className="w-[95vw] max-w-[740px]"
    >
      <div className="flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-studio-border flex items-center justify-between bg-studio-panel">
          <div>
            <h2 id="crop-dialog-title" className="text-sm font-semibold text-white">
              Cortar Imagem ({layer.name})
            </h2>
            <p className="text-xs text-zinc-400">
              Arraste as alças ou escolha uma proporção abaixo
            </p>
          </div>

          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Fechar"
            className="btn-press p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-studio-hover"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Aspect Ratio Presets Bar */}
        <div className="px-5 py-2.5 bg-studio-card border-b border-studio-border flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 flex-wrap">
            {[
              { label: 'Original', ratio: null },
              { label: '1:1', ratio: 1 },
              { label: '4:5', ratio: 4 / 5 },
              { label: '3:4', ratio: 3 / 4 },
              { label: '9:16', ratio: 9 / 16 },
              { label: '16:9', ratio: 16 / 9 },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyAspectRatioPreset(p.ratio)}
                className="btn-press px-2.5 py-1 rounded bg-studio-panel hover:bg-studio-hover text-xs font-mono text-zinc-300 border border-studio-border"
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setCrop({ x: 0, y: 0, width: 1, height: 1 })}
            className="btn-press px-2 py-1 rounded text-xs text-zinc-400 hover:text-white flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Resetar</span>
          </button>
        </div>

        {/* Interactive Crop Stage */}
        <div className="p-6 bg-studio-bg flex items-center justify-center overflow-hidden min-h-[360px]">
          <div
            ref={stageRef}
            className="relative inline-block max-w-full max-h-[400px] select-none shadow-2xl"
          >
            <img
              src={layer.dataUrl}
              alt={layer.name}
              draggable={false}
              className="max-h-[400px] w-auto block opacity-30 pointer-events-none select-none"
            />

            {/* Active Highlighted Crop Box */}
            <div
              onPointerDown={(e) => startCropDrag(e, 'move')}
              onPointerMove={handlePointerMove}
              onPointerUp={endCropDrag}
              onLostPointerCapture={endCropDrag}
              style={{
                left: `${crop.x * 100}%`,
                top: `${crop.y * 100}%`,
                width: `${crop.width * 100}%`,
                height: `${crop.height * 100}%`,
              }}
              className="absolute border border-accent shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] cursor-move overflow-hidden"
            >
              <img
                src={layer.dataUrl}
                alt=""
                draggable={false}
                style={{
                  width: `${100 / Math.max(0.01, crop.width)}%`,
                  height: `${100 / Math.max(0.01, crop.height)}%`,
                  maxWidth: 'none',
                  maxHeight: 'none',
                  transform: `translate(${-crop.x * 100}%, ${-crop.y * 100}%)`,
                }}
                className="pointer-events-none select-none block"
              />

              {/* Rule of Thirds Grid Lines */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                <div className="border-r border-b border-white/25" />
                <div className="border-r border-b border-white/25" />
                <div className="border-b border-white/25" />
                <div className="border-r border-b border-white/25" />
                <div className="border-r border-b border-white/25" />
                <div className="border-b border-white/25" />
                <div className="border-r border-white/25" />
                <div className="border-r border-white/25" />
                <div />
              </div>

              {/* 8 Resize Handles */}
              {(
                [
                  { mode: 'nw', cls: 'top-0 left-0 cursor-nwse-resize' },
                  { mode: 'ne', cls: 'top-0 right-0 cursor-nesw-resize' },
                  { mode: 'sw', cls: 'bottom-0 left-0 cursor-nesw-resize' },
                  { mode: 'se', cls: 'bottom-0 right-0 cursor-nwse-resize' },
                  {
                    mode: 'n',
                    cls: 'top-0 left-1/2 -translate-x-1/2 cursor-ns-resize',
                  },
                  {
                    mode: 's',
                    cls: 'bottom-0 left-1/2 -translate-x-1/2 cursor-ns-resize',
                  },
                  {
                    mode: 'w',
                    cls: 'top-1/2 left-0 -translate-y-1/2 cursor-ew-resize',
                  },
                  {
                    mode: 'e',
                    cls: 'top-1/2 right-0 -translate-y-1/2 cursor-ew-resize',
                  },
                ] as const
              ).map((h) => (
                <div
                  key={h.mode}
                  onPointerDown={(e) => startCropDrag(e, h.mode)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={endCropDrag}
                  className={`absolute ${h.cls} w-3 h-3 bg-white border border-accent z-20`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-studio-border bg-studio-panel flex items-center justify-between">
          <div className="text-xs text-zinc-400 font-mono">
            {Math.round(crop.width * layer.naturalWidth)} ×{' '}
            {Math.round(crop.height * layer.naturalHeight)} px
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="btn-press px-3.5 py-1.5 rounded-lg bg-studio-card hover:bg-studio-hover text-xs font-medium text-zinc-300 border border-studio-border"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="btn-press px-4 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-xs font-semibold text-zinc-950 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Aplicar</span>
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
};
