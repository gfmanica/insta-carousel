import React, { useRef, useState, useEffect } from 'react';
import {
  Lock,
  Crop,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Trash2,
  Copy,
} from 'lucide-react';
import type { CarouselProject, CanvasLayer, ImageLayer } from '../types/carousel';
import { INSTAGRAM_FORMATS } from '../types/carousel';

interface PanoramicCanvasProps {
  project: CarouselProject;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  selectedLayerId: string | null;
  onSelectLayer: (layerId: string | null) => void;
  onUpdateLayer: (
    layerId: string,
    updater: (layer: CanvasLayer) => CanvasLayer,
    recordHistory?: boolean
  ) => void;
  onCommitHistory: () => void;
  onDeleteLayer: (layerId: string) => void;
  onDuplicateLayer: (layer: CanvasLayer) => void;
  onOpenCropModal: (layer: ImageLayer) => void;
  onAddFiles: (
    files: FileList | File[],
    targetPoint?: { x: number; y: number }
  ) => void;
  lastClickedPoint: { x: number; y: number } | null;
  onUpdateLastClickedPoint: (point: { x: number; y: number }) => void;
}

type InteractionMode =
  | 'move'
  | 'resize-nw'
  | 'resize-ne'
  | 'resize-sw'
  | 'resize-se'
  | 'resize-n'
  | 'resize-s'
  | 'resize-e'
  | 'resize-w'
  | 'rotate';

interface DragState {
  layerId: string;
  mode: InteractionMode;
  startClientX: number;
  startClientY: number;
  initialX: number;
  initialY: number;
  initialW: number;
  initialH: number;
  initialRotation: number;
  aspectRatio: number;
}

export const PanoramicCanvas: React.FC<PanoramicCanvasProps> = ({
  project,
  zoom,
  setZoom,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayer,
  onCommitHistory,
  onDeleteLayer,
  onDuplicateLayer,
  onOpenCropModal,
  onAddFiles,
  lastClickedPoint,
  onUpdateLastClickedPoint,
}) => {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [activeSnapX, setActiveSnapX] = useState<number | null>(null);
  const [activeSnapY, setActiveSnapY] = useState<number | null>(null);
  const [isDraggingFileOver, setIsDraggingFileOver] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const stageWrapperRef = useRef<HTMLDivElement>(null);

  const currentFormat = INSTAGRAM_FORMATS[project.formatId];
  const slideW = currentFormat.width;
  const slideH = currentFormat.height;
  const totalWidth = slideW * project.slidesCount;
  const totalHeight = slideH;

  const clientToCanvasPoint = (
    clientX: number,
    clientY: number
  ): { x: number; y: number } | null => {
    const stageEl = stageWrapperRef.current;
    if (!stageEl) return null;
    const rect = stageEl.getBoundingClientRect();
    const rawX = (clientX - rect.left) / zoom;
    const rawY = (clientY - rect.top) / zoom;
    return {
      x: Math.round(Math.max(0, Math.min(totalWidth, rawX))),
      y: Math.round(Math.max(0, Math.min(totalHeight, rawY))),
    };
  };

  const sortedLayers = [...project.layers]
    .filter((l) => l.visible)
    .sort((a, b) => a.zIndex - b.zIndex);

  const startInteraction = (
    e: React.PointerEvent<HTMLElement>,
    layer: CanvasLayer,
    mode: InteractionMode
  ) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    const pt = clientToCanvasPoint(e.clientX, e.clientY);
    if (pt) onUpdateLastClickedPoint(pt);
    onSelectLayer(layer.id);
    if (layer.locked) return;

    onCommitHistory();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Fallback handled by window pointermove/pointerup listeners
    }
    setDragState({
      layerId: layer.id,
      mode,
      startClientX: e.clientX,
      startClientY: e.clientY,
      initialX: layer.x,
      initialY: layer.y,
      initialW: layer.width,
      initialH: layer.height,
      initialRotation: layer.rotation,
      aspectRatio: layer.width / Math.max(1, layer.height),
    });
  };

  const applyDragMove = (
    clientX: number,
    clientY: number,
    shiftKey: boolean
  ) => {
    if (!dragState) return;

    const dx = (clientX - dragState.startClientX) / zoom;
    const dy = (clientY - dragState.startClientY) / zoom;

    if (dragState.mode === 'move') {
      let nextX = dragState.initialX + dx;
      let nextY = dragState.initialY + dy;

      const snapThreshold = 12;
      let snappedX: number | null = null;
      let snappedY: number | null = null;

      const centerX = nextX + dragState.initialW / 2;
      const rightX = nextX + dragState.initialW;
      const otherLayers = sortedLayers.filter((l) => l.id !== dragState.layerId);

      // 1. Snap X to other layers (left, center, right edges)
      for (const other of otherLayers) {
        const oLeft = other.x;
        const oCenter = other.x + other.width / 2;
        const oRight = other.x + other.width;

        // Left edge to other Left / Right / Center
        if (Math.abs(nextX - oLeft) < snapThreshold) {
          nextX = oLeft;
          snappedX = oLeft;
          break;
        }
        if (Math.abs(nextX - oRight) < snapThreshold) {
          nextX = oRight;
          snappedX = oRight;
          break;
        }
        if (Math.abs(nextX - oCenter) < snapThreshold) {
          nextX = oCenter;
          snappedX = oCenter;
          break;
        }
        // Right edge to other Left / Right / Center
        if (Math.abs(rightX - oLeft) < snapThreshold) {
          nextX = oLeft - dragState.initialW;
          snappedX = oLeft;
          break;
        }
        if (Math.abs(rightX - oRight) < snapThreshold) {
          nextX = oRight - dragState.initialW;
          snappedX = oRight;
          break;
        }
        if (Math.abs(rightX - oCenter) < snapThreshold) {
          nextX = oCenter - dragState.initialW;
          snappedX = oCenter;
          break;
        }
        // Center X to other Center / Left / Right
        if (Math.abs(centerX - oCenter) < snapThreshold) {
          nextX = oCenter - dragState.initialW / 2;
          snappedX = oCenter;
          break;
        }
      }

      // 2. Snap X to slide seams, borders, and slide centers
      if (snappedX === null) {
        for (let i = 0; i <= project.slidesCount; i++) {
          const seamX = i * slideW;
          if (Math.abs(centerX - seamX) < snapThreshold) {
            nextX = seamX - dragState.initialW / 2;
            snappedX = seamX;
            break;
          }
          if (Math.abs(nextX - seamX) < snapThreshold) {
            nextX = seamX;
            snappedX = seamX;
            break;
          }
          if (Math.abs(nextX + dragState.initialW - seamX) < snapThreshold) {
            nextX = seamX - dragState.initialW;
            snappedX = seamX;
            break;
          }
          if (i < project.slidesCount) {
            const slideMidX = i * slideW + slideW / 2;
            if (Math.abs(centerX - slideMidX) < snapThreshold) {
              nextX = slideMidX - dragState.initialW / 2;
              snappedX = slideMidX;
              break;
            }
          }
        }
      }

      const centerY = nextY + dragState.initialH / 2;
      const bottomY = nextY + dragState.initialH;
      const midY = totalHeight / 2;

      // 3. Snap Y to other layers (top, center, bottom edges)
      for (const other of otherLayers) {
        const oTop = other.y;
        const oMid = other.y + other.height / 2;
        const oBottom = other.y + other.height;

        // Top edge to other Top / Bottom / Center
        if (Math.abs(nextY - oTop) < snapThreshold) {
          nextY = oTop;
          snappedY = oTop;
          break;
        }
        if (Math.abs(nextY - oBottom) < snapThreshold) {
          nextY = oBottom;
          snappedY = oBottom;
          break;
        }
        if (Math.abs(nextY - oMid) < snapThreshold) {
          nextY = oMid;
          snappedY = oMid;
          break;
        }
        // Bottom edge to other Top / Bottom / Center
        if (Math.abs(bottomY - oTop) < snapThreshold) {
          nextY = oTop - dragState.initialH;
          snappedY = oTop;
          break;
        }
        if (Math.abs(bottomY - oBottom) < snapThreshold) {
          nextY = oBottom - dragState.initialH;
          snappedY = oBottom;
          break;
        }
        if (Math.abs(bottomY - oMid) < snapThreshold) {
          nextY = oMid - dragState.initialH;
          snappedY = oMid;
          break;
        }
        // Center Y to other Center
        if (Math.abs(centerY - oMid) < snapThreshold) {
          nextY = oMid - dragState.initialH / 2;
          snappedY = oMid;
          break;
        }
      }

      // 4. Snap Y to canvas top, bottom, and vertical center
      if (snappedY === null) {
        if (Math.abs(nextY) < snapThreshold) {
          nextY = 0;
          snappedY = 0;
        } else if (Math.abs(nextY + dragState.initialH - totalHeight) < snapThreshold) {
          nextY = totalHeight - dragState.initialH;
          snappedY = totalHeight;
        } else if (Math.abs(centerY - midY) < snapThreshold) {
          nextY = midY - dragState.initialH / 2;
          snappedY = midY;
        } else if (Math.abs(nextY + dragState.initialH) < snapThreshold) {
          nextY = -dragState.initialH;
          snappedY = 0;
        } else if (Math.abs(nextY - totalHeight) < snapThreshold) {
          nextY = totalHeight;
          snappedY = totalHeight;
        }
      }

      setActiveSnapX(snappedX);
      setActiveSnapY(snappedY);

      onUpdateLayer(
        dragState.layerId,
        (l) => ({
          ...l,
          x: Math.round(nextX),
          y: Math.round(nextY),
        }),
        false
      );
    } else if (dragState.mode.startsWith('resize-')) {
      const keepRatio = !shiftKey;
      const snapThreshold = 12;
      let snappedX: number | null = null;
      let snappedY: number | null = null;

      let newW = dragState.initialW;
      let newH = dragState.initialH;
      let newX = dragState.initialX;
      let newY = dragState.initialY;

      if (dragState.mode === 'resize-se') {
        newW = Math.max(40, dragState.initialW + dx);
        newH = keepRatio ? newW / dragState.aspectRatio : Math.max(40, dragState.initialH + dy);
      } else if (dragState.mode === 'resize-sw') {
        newW = Math.max(40, dragState.initialW - dx);
        newH = keepRatio ? newW / dragState.aspectRatio : Math.max(40, dragState.initialH + dy);
        newX = dragState.initialX + (dragState.initialW - newW);
      } else if (dragState.mode === 'resize-ne') {
        newW = Math.max(40, dragState.initialW + dx);
        newH = keepRatio ? newW / dragState.aspectRatio : Math.max(40, dragState.initialH - dy);
        newY = dragState.initialY + (dragState.initialH - newH);
      } else if (dragState.mode === 'resize-nw') {
        newW = Math.max(40, dragState.initialW - dx);
        newH = keepRatio ? newW / dragState.aspectRatio : Math.max(40, dragState.initialH - dy);
        newX = dragState.initialX + (dragState.initialW - newW);
        newY = dragState.initialY + (dragState.initialH - newH);
      } else if (dragState.mode === 'resize-e') {
        newW = Math.max(40, dragState.initialW + dx);
      } else if (dragState.mode === 'resize-w') {
        newW = Math.max(40, dragState.initialW - dx);
        newX = dragState.initialX + (dragState.initialW - newW);
      } else if (dragState.mode === 'resize-s') {
        newH = Math.max(40, dragState.initialH + dy);
      } else if (dragState.mode === 'resize-n') {
        newH = Math.max(40, dragState.initialH - dy);
        newY = dragState.initialY + (dragState.initialH - newH);
      }

      const otherLayers = sortedLayers.filter((l) => l.id !== dragState.layerId);

      // Snap top/bottom edges to other layers or canvas borders during resize
      for (const other of otherLayers) {
        const yPoints = [other.y, other.y + other.height / 2, other.y + other.height];
        for (const yp of yPoints) {
          if (dragState.mode.includes('n') && Math.abs(newY - yp) < snapThreshold) {
            const diff = newY - yp;
            newY = yp;
            newH += diff;
            if (keepRatio) newW = newH * dragState.aspectRatio;
            snappedY = yp;
            break;
          }
          if (dragState.mode.includes('s') && Math.abs(newY + newH - yp) < snapThreshold) {
            newH = yp - newY;
            if (keepRatio) newW = newH * dragState.aspectRatio;
            snappedY = yp;
            break;
          }
        }
        if (snappedY !== null) break;
      }

      if (snappedY === null) {
        if (dragState.mode.includes('n') && Math.abs(newY) < snapThreshold) {
          const diff = newY;
          newY = 0;
          newH += diff;
          if (keepRatio) newW = newH * dragState.aspectRatio;
          snappedY = 0;
        } else if (
          dragState.mode.includes('s') &&
          Math.abs(newY + newH - totalHeight) < snapThreshold
        ) {
          newH = totalHeight - newY;
          if (keepRatio) newW = newH * dragState.aspectRatio;
          snappedY = totalHeight;
        } else if (
          dragState.mode.includes('s') &&
          Math.abs(newY + newH - totalHeight / 2) < snapThreshold
        ) {
          newH = totalHeight / 2 - newY;
          if (keepRatio) newW = newH * dragState.aspectRatio;
          snappedY = totalHeight / 2;
        }
      }

      // Snap left/right edges to other layers or slide seams/borders during resize
      for (const other of otherLayers) {
        const xPoints = [other.x, other.x + other.width / 2, other.x + other.width];
        for (const xp of xPoints) {
          if (dragState.mode.includes('w') && Math.abs(newX - xp) < snapThreshold) {
            const diff = newX - xp;
            newX = xp;
            newW += diff;
            if (keepRatio) newH = newW / dragState.aspectRatio;
            snappedX = xp;
            break;
          }
          if (dragState.mode.includes('e') && Math.abs(newX + newW - xp) < snapThreshold) {
            newW = xp - newX;
            if (keepRatio) newH = newW / dragState.aspectRatio;
            snappedX = xp;
            break;
          }
        }
        if (snappedX !== null) break;
      }

      if (snappedX === null) {
        for (let i = 0; i <= project.slidesCount; i++) {
          const seamX = i * slideW;
          if (dragState.mode.includes('w') && Math.abs(newX - seamX) < snapThreshold) {
            const diff = newX - seamX;
            newX = seamX;
            newW += diff;
            if (keepRatio) newH = newW / dragState.aspectRatio;
            snappedX = seamX;
            break;
          }
          if (
            dragState.mode.includes('e') &&
            Math.abs(newX + newW - seamX) < snapThreshold
          ) {
            newW = seamX - newX;
            if (keepRatio) newH = newW / dragState.aspectRatio;
            snappedX = seamX;
            break;
          }
        }
      }

      setActiveSnapX(snappedX);
      setActiveSnapY(snappedY);

      onUpdateLayer(
        dragState.layerId,
        (l) => ({
          ...l,
          x: Math.round(newX),
          y: Math.round(newY),
          width: Math.round(newW),
          height: Math.round(newH),
        }),
        false
      );
    } else if (dragState.mode === 'rotate') {
      const nextRot = Math.round((dragState.initialRotation + dx * 0.45) % 360);
      onUpdateLayer(
        dragState.layerId,
        (l) => ({
          ...l,
          rotation: nextRot,
        }),
        false
      );
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!dragState) return;
    applyDragMove(e.clientX, e.clientY, e.shiftKey);
  };

  const endInteraction = () => {
    setDragState(null);
    setActiveSnapX(null);
    setActiveSnapY(null);
  };

  useEffect(() => {
    if (!dragState) return;
    const onWinPointerMove = (ev: PointerEvent) => {
      applyDragMove(ev.clientX, ev.clientY, ev.shiftKey);
    };
    const onWinPointerUp = () => {
      endInteraction();
    };
    window.addEventListener('pointermove', onWinPointerMove);
    window.addEventListener('pointerup', onWinPointerUp);
    window.addEventListener('pointercancel', onWinPointerUp);
    return () => {
      window.removeEventListener('pointermove', onWinPointerMove);
      window.removeEventListener('pointerup', onWinPointerUp);
      window.removeEventListener('pointercancel', onWinPointerUp);
    };
  });

  const handleWheel = (e: React.WheelEvent<HTMLElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = -e.deltaY * 0.0015;
      setZoom((z) => Math.max(0.12, Math.min(1.5, +(z + delta).toFixed(2))));
    }
  };

  const getSpannedSlidesBadge = (layer: CanvasLayer): string => {
    const startSlide = Math.max(1, Math.floor(layer.x / slideW) + 1);
    const endSlide = Math.min(
      project.slidesCount,
      Math.floor((layer.x + layer.width - 1) / slideW) + 1
    );
    if (startSlide !== endSlide && startSlide >= 1 && endSlide <= project.slidesCount) {
      return `Quadro ${startSlide} ↔ ${endSlide}`;
    }
    return `Quadro ${Math.max(1, Math.min(project.slidesCount, startSlide))}`;
  };

  const invScale = 1 / Math.max(0.18, zoom);

  return (
    <main
      ref={containerRef}
      tabIndex={0}
      onWheel={handleWheel}
      onDragOver={(e) => {
        e.preventDefault();
        if (e.dataTransfer.types.includes('Files')) {
          setIsDraggingFileOver(true);
        }
      }}
      onDragLeave={() => setIsDraggingFileOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingFileOver(false);
        const dropPt = clientToCanvasPoint(e.clientX, e.clientY);
        if (dropPt) onUpdateLastClickedPoint(dropPt);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          onAddFiles(e.dataTransfer.files, dropPt || undefined);
        }
      }}
      onPointerDown={(e) => {
        const pt = clientToCanvasPoint(e.clientX, e.clientY);
        if (pt) onUpdateLastClickedPoint(pt);
        if (
          e.target === e.currentTarget ||
          (e.target as HTMLElement).dataset.canvasBg
        ) {
          onSelectLayer(null);
        }
      }}
      className={`flex-1 bg-studio-bg overflow-auto relative flex items-center justify-start p-3 sm:p-6 md:p-10 focus:outline-none transition-colors ${
        isDraggingFileOver ? 'ring-2 ring-inset ring-accent bg-accent/5' : ''
      }`}
      style={{
        backgroundImage:
          'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
      <div
        data-canvas-bg="true"
        className="mx-auto my-auto relative shrink-0"
        style={{
          width: `${totalWidth * zoom + 40}px`,
          height: `${totalHeight * zoom + 88}px`,
          padding: '44px 20px 20px 20px',
        }}
      >
        {/* Minimal Slide Header Bar */}
        <div
          className="flex items-center mb-2"
          style={{ width: `${totalWidth * zoom}px` }}
        >
          {Array.from({ length: project.slidesCount }).map((_, idx) => (
            <div
              key={idx}
              style={{ width: `${slideW * zoom}px` }}
              className="flex items-center justify-between px-2 py-1 border-r last:border-r-0 border-studio-border"
            >
              <span className="text-[11px] font-mono font-medium text-zinc-400">
                {String(idx + 1).padStart(2, '0')}
              </span>
              <span className="text-[10px] font-mono text-zinc-600 hidden sm:inline">
                {slideW}×{slideH}
              </span>
            </div>
          ))}
        </div>

        {/* Panoramic Stage Wrapper:
            1) Base Clipped Layer renders what actually appears on the slides
            2) Top Overlay Layer renders crisp selection outlines, handles, and floating toolbar */}
        <div
          ref={stageWrapperRef}
          className="relative shadow-2xl ring-1 ring-white/10"
          style={{
            width: `${totalWidth * zoom}px`,
            height: `${totalHeight * zoom}px`,
          }}
        >
          {/* 1. Clipped Artwork Surface */}
          <div
            data-canvas-bg="true"
            style={{
              width: `${totalWidth}px`,
              height: `${totalHeight}px`,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              backgroundColor: project.backgroundColor,
              backgroundImage: project.backgroundGradient || undefined,
            }}
            className="relative overflow-hidden"
          >
            {sortedLayers.map((layer) => {
              const crop =
                layer.type === 'image' && layer.crop
                  ? layer.crop
                  : { x: 0, y: 0, width: 1, height: 1 };

              return (
                <div
                  key={layer.id}
                  onPointerDown={(e) => startInteraction(e, layer, 'move')}
                  onPointerMove={handlePointerMove}
                  onPointerUp={endInteraction}
                  onLostPointerCapture={endInteraction}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectLayer(layer.id);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (layer.type === 'image') {
                      onOpenCropModal(layer);
                    }
                  }}
                  style={{
                    position: 'absolute',
                    left: `${layer.x}px`,
                    top: `${layer.y}px`,
                    width: `${layer.width}px`,
                    height: `${layer.height}px`,
                    transform: `rotate(${layer.rotation}deg)`,
                    opacity: layer.opacity,
                    zIndex: layer.zIndex,
                    pointerEvents: 'auto',
                  }}
                  className={`canvas-drag-handle group ${
                    dragState?.layerId === layer.id ? 'dragging' : ''
                  } ${
                    layer.id !== selectedLayerId
                      ? 'hover:outline hover:outline-2 hover:outline-accent/55'
                      : ''
                  }`}
                >
                  {layer.type === 'image' ? (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        overflow: 'hidden',
                        borderRadius: `${layer.borderRadius || 0}px`,
                        border: layer.borderWidth
                          ? `${layer.borderWidth}px solid ${
                              layer.borderColor || '#ffffff'
                            }`
                          : undefined,
                        boxShadow: layer.shadowBlur
                          ? `0 12px ${layer.shadowBlur}px ${
                              layer.shadowColor || 'rgba(0,0,0,0.45)'
                            }`
                          : undefined,
                        transform: `scaleX(${layer.flipX ? -1 : 1}) scaleY(${
                          layer.flipY ? -1 : 1
                        })`,
                      }}
                      className="pointer-events-none select-none relative"
                    >
                      <img
                        src={layer.dataUrl}
                        alt={layer.name}
                        draggable={false}
                        style={{
                          width: `${100 / Math.max(0.01, crop.width)}%`,
                          height: `${100 / Math.max(0.01, crop.height)}%`,
                          maxWidth: 'none',
                          maxHeight: 'none',
                          transform: `translate(${-crop.x * 100}%, ${
                            -crop.y * 100
                          }%)`,
                        }}
                        className="pointer-events-none select-none block"
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: layer.backgroundColor || 'transparent',
                        borderRadius: `${layer.borderRadius || 12}px`,
                        color: layer.color,
                        fontSize: `${layer.fontSize}px`,
                        fontFamily: layer.fontFamily,
                        fontWeight: layer.fontWeight,
                        textAlign: layer.textAlign,
                        transform: `scaleX(${layer.flipX ? -1 : 1}) scaleY(${
                          layer.flipY ? -1 : 1
                        })`,
                        boxShadow: layer.shadowBlur
                          ? `0 8px ${layer.shadowBlur}px ${
                              layer.shadowColor || 'rgba(0,0,0,0.45)'
                            }`
                          : undefined,
                      }}
                      className="flex items-center justify-center p-6 whitespace-pre-wrap leading-tight pointer-events-none select-none"
                    >
                      {layer.text}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Subtle Seam Divider Guides */}
            {project.showSeamGuides &&
              Array.from({ length: project.slidesCount - 1 }).map((_, idx) => {
                const seamX = (idx + 1) * slideW;
                return (
                  <div
                    key={idx}
                    style={{ left: `${seamX}px` }}
                    className="absolute top-0 bottom-0 w-0 border-l-2 border-dashed border-white/35 pointer-events-none z-40"
                  />
                );
              })}
          </div>

          {/* 2. Unclipped Selection & Controls Overlay (never cut off at top/edges of canvas) */}
          <div
            style={{
              width: `${totalWidth}px`,
              height: `${totalHeight}px`,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
            }}
            className="absolute inset-0 pointer-events-none overflow-visible z-50"
          >
            {/* Magnetic Snap Lines (rendered in unclipped overlay so top/bottom/edge guides are always crisp) */}
            {activeSnapX !== null && (
              <div
                style={{
                  left: `${activeSnapX}px`,
                  width: `${1.5 * invScale}px`,
                  transform: 'translateX(-50%)',
                }}
                className="absolute top-0 bottom-0 bg-accent shadow-[0_0_8px_rgba(59,130,246,0.9)] pointer-events-none z-50"
              />
            )}
            {activeSnapY !== null && (
              <div
                style={{
                  top: `${activeSnapY}px`,
                  height: `${1.5 * invScale}px`,
                  transform: 'translateY(-50%)',
                }}
                className="absolute left-0 right-0 bg-accent shadow-[0_0_8px_rgba(59,130,246,0.9)] pointer-events-none z-50"
              />
            )}

            {/* Subtle Paste Target Crosshair at Last Clicked Point (when no layer is selected) */}
            {lastClickedPoint && !selectedLayerId && (
              <div
                style={{
                  left: `${lastClickedPoint.x}px`,
                  top: `${lastClickedPoint.y}px`,
                  transform: `translate(-50%, -50%) scale(${invScale})`,
                }}
                title={`Ponto de inserção Ctrl+V (${lastClickedPoint.x}, ${lastClickedPoint.y})`}
                className="absolute w-3.5 h-3.5 rounded-full border border-accent/70 bg-accent/20 flex items-center justify-center pointer-events-none z-40"
              >
                <div className="w-1 h-1 rounded-full bg-accent" />
              </div>
            )}
            {sortedLayers.map((layer) => {
              const isSelected = layer.id === selectedLayerId;
              if (!isSelected) return null;

              return (
                <div
                  key={`sel-${layer.id}`}
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
                  {/* Crisp 1.5px Selection Outline */}
                  <div
                    style={{
                      borderWidth: `${1.5 * invScale}px`,
                    }}
                    className="absolute inset-0 border border-accent pointer-events-none shadow-[0_0_0_1px_rgba(0,0,0,0.5)]"
                  />

                  {/* Floating Quick Action Bar */}
                  <div
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      transform: `scale(${invScale})`,
                      transformOrigin: 'bottom left',
                      top: `${-38 * invScale}px`,
                    }}
                    className="absolute left-0 bg-studio-panel/95 backdrop-blur-md text-zinc-100 px-2 py-1 rounded-lg border border-studio-border shadow-xl flex items-center gap-1 pointer-events-auto whitespace-nowrap"
                  >
                    {layer.locked && (
                      <Lock className="w-3 h-3 text-amber-400 mr-0.5" />
                    )}
                    <span className="text-[11px] font-mono text-zinc-400 pr-1.5 border-r border-studio-border">
                      {getSpannedSlidesBadge(layer)}
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
                        onUpdateLayer(layer.id, (l) => ({
                          ...l,
                          flipX: !l.flipX,
                        }))
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
                        onUpdateLayer(layer.id, (l) => ({
                          ...l,
                          flipY: !l.flipY,
                        }))
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
                      {/* 4 Corner Handles */}
                      {(['nw', 'ne', 'sw', 'se'] as const).map((dir) => {
                        const posStyle: React.CSSProperties = {
                          transform: `translate(-50%, -50%) scale(${invScale})`,
                          left: dir.includes('w') ? '0%' : '100%',
                          top: dir.includes('n') ? '0%' : '100%',
                        };
                        const cursorClass =
                          dir === 'nw' || dir === 'se'
                            ? 'cursor-nwse-resize'
                            : 'cursor-nesw-resize';

                        return (
                          <div
                            key={dir}
                            onPointerDown={(e) =>
                              startInteraction(e, layer, `resize-${dir}`)
                            }
                            onPointerMove={handlePointerMove}
                            onPointerUp={endInteraction}
                            style={posStyle}
                            className={`absolute ${cursorClass} w-3 h-3 bg-white border-2 border-accent rounded-xs shadow-sm pointer-events-auto z-20`}
                          />
                        );
                      })}

                      {/* 4 Side Handles */}
                      {(
                        [
                          {
                            dir: 'n',
                            left: '50%',
                            top: '0%',
                            cls: 'cursor-ns-resize w-5 h-2',
                          },
                          {
                            dir: 's',
                            left: '50%',
                            top: '100%',
                            cls: 'cursor-ns-resize w-5 h-2',
                          },
                          {
                            dir: 'w',
                            left: '0%',
                            top: '50%',
                            cls: 'cursor-ew-resize w-2 h-5',
                          },
                          {
                            dir: 'e',
                            left: '100%',
                            top: '50%',
                            cls: 'cursor-ew-resize w-2 h-5',
                          },
                        ] as const
                      ).map((side) => (
                        <div
                          key={side.dir}
                          onPointerDown={(e) =>
                            startInteraction(e, layer, `resize-${side.dir}`)
                          }
                          onPointerMove={handlePointerMove}
                          onPointerUp={endInteraction}
                          style={{
                            left: side.left,
                            top: side.top,
                            transform: `translate(-50%, -50%) scale(${invScale})`,
                          }}
                          className={`absolute ${side.cls} rounded-xs bg-white border border-accent shadow-sm pointer-events-auto z-20`}
                        />
                      ))}

                      {/* Bottom Rotate Handle */}
                      <div
                        onPointerDown={(e) =>
                          startInteraction(e, layer, 'rotate')
                        }
                        onPointerMove={handlePointerMove}
                        onPointerUp={endInteraction}
                        style={{
                          left: '50%',
                          top: '100%',
                          transform: `translate(-50%, ${14 * invScale}px) scale(${invScale})`,
                        }}
                        title="Arraste para girar livremente"
                        className="absolute w-6 h-6 rounded-full bg-studio-panel text-zinc-200 border border-studio-border hover:border-accent shadow-md cursor-ew-resize flex items-center justify-center text-xs pointer-events-auto z-20"
                      >
                        ↻
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
};
