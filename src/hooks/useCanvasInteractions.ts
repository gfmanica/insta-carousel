import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CanvasLayer, CarouselProject, ImageCrop } from '../types/carousel';
import {
  computeDragTransform,
  type DragState,
  type InteractionMode,
  type LiveLayerPatch,
  type SnapGuide,
} from '../utils/canvasTransform';

export function applyPatchToLayer(
  l: CanvasLayer,
  patch: LiveLayerPatch
): CanvasLayer {
  const base = {
    x: patch.x ?? l.x,
    y: patch.y ?? l.y,
    width: patch.width ?? l.width,
    height: patch.height ?? l.height,
    rotation: patch.rotation ?? l.rotation,
  };
  return l.type === 'image'
    ? { ...l, ...base, crop: patch.crop ?? l.crop }
    : { ...l, ...base };
}

interface UseCanvasInteractionsOptions {
  project: CarouselProject;
  zoom: number;
  slideW: number;
  totalWidth: number;
  totalHeight: number;
  selectedLayerId: string | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  stageWrapperRef: React.RefObject<HTMLDivElement | null>;
  onSelectLayer: (layerId: string | null) => void;
  onUpdateLayer: (
    layerId: string,
    updater: (layer: CanvasLayer) => CanvasLayer,
    recordHistory?: boolean
  ) => void;
  onCommitHistory: () => void;
  onUpdateLastClickedPoint: (point: { x: number; y: number }) => void;
}

export function useCanvasInteractions({
  project,
  zoom,
  slideW,
  totalWidth,
  totalHeight,
  selectedLayerId,
  containerRef,
  stageWrapperRef,
  onSelectLayer,
  onUpdateLayer,
  onCommitHistory,
  onUpdateLastClickedPoint,
}: UseCanvasInteractionsOptions) {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [livePatch, setLivePatch] = useState<LiveLayerPatch | null>(null);
  const livePatchRef = useRef<LiveLayerPatch | null>(null);
  const [activeSnapX, setActiveSnapX] = useState<SnapGuide | null>(null);
  const [activeSnapY, setActiveSnapY] = useState<SnapGuide | null>(null);
  const [viewportRange, setViewportRange] = useState({
    minX: -2000,
    maxX: 6000,
  });

  const scrollRafRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const pendingPointerRef = useRef<{
    clientX: number;
    clientY: number;
    shiftKey: boolean;
  } | null>(null);

  const updateViewportRange = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const bufferPx = slideW * 1.1;
    const minX = Math.max(0, (el.scrollLeft - 80) / zoom) - bufferPx;
    const maxX = (el.scrollLeft + el.clientWidth + 80) / zoom + bufferPx;
    setViewportRange((prev) =>
      Math.abs(prev.minX - minX) < 120 && Math.abs(prev.maxX - maxX) < 120
        ? prev
        : { minX, maxX }
    );
  }, [containerRef, slideW, zoom]);

  useEffect(() => {
    updateViewportRange();
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => updateViewportRange());
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateViewportRange, containerRef, project.slidesCount]);

  const handleContainerScroll = () => {
    if (scrollRafRef.current !== null) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      updateViewportRange();
    });
  };

  const clientToCanvasPoint = (clientX: number, clientY: number) => {
    const stageEl = stageWrapperRef.current;
    if (!stageEl) return null;
    const rect = stageEl.getBoundingClientRect();
    return {
      x: Math.round(Math.max(0, Math.min(totalWidth, (clientX - rect.left) / zoom))),
      y: Math.round(Math.max(0, Math.min(totalHeight, (clientY - rect.top) / zoom))),
    };
  };

  const sortedLayers = useMemo(
    () =>
      [...project.layers]
        .filter((l) => l.visible)
        .sort((a, b) => a.zIndex - b.zIndex),
    [project.layers]
  );

  const displayLayers = useMemo(() => {
    if (!livePatch) return sortedLayers;
    return sortedLayers.map((l) =>
      l.id === livePatch.layerId ? applyPatchToLayer(l, livePatch) : l
    );
  }, [sortedLayers, livePatch]);

  const visibleLayers = useMemo(
    () =>
      displayLayers.filter(
        (l) =>
          l.id === selectedLayerId ||
          l.id === dragState?.layerId ||
          (l.x + l.width >= viewportRange.minX && l.x <= viewportRange.maxX)
      ),
    [displayLayers, selectedLayerId, dragState?.layerId, viewportRange]
  );

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
      // Fallback handled by window listeners
    }
    const baseCrop: ImageCrop =
      layer.type === 'image' && layer.crop
        ? { ...layer.crop }
        : { x: 0, y: 0, width: 1, height: 1 };

    livePatchRef.current = null;
    setLivePatch(null);
    setDragState({
      layerId: layer.id,
      layerType: layer.type,
      mode,
      startClientX: e.clientX,
      startClientY: e.clientY,
      initialX: layer.x,
      initialY: layer.y,
      initialW: layer.width,
      initialH: layer.height,
      initialRotation: layer.rotation,
      aspectRatio: layer.width / Math.max(1, layer.height),
      initialCrop: baseCrop,
    });
  };

  const applyDragMove = (
    clientX: number,
    clientY: number,
    shiftKey: boolean
  ) => {
    if (!dragState) return;
    const otherLayers = sortedLayers.filter((l) => l.id !== dragState.layerId);
    const result = computeDragTransform(
      dragState,
      clientX,
      clientY,
      shiftKey,
      zoom,
      project.slidesCount,
      slideW,
      totalHeight,
      otherLayers
    );
    setActiveSnapX(result.snapX);
    setActiveSnapY(result.snapY);
    livePatchRef.current = result.patch;
    setLivePatch(result.patch);
  };

  const applyDragMoveRef = useRef(applyDragMove);
  useEffect(() => {
    applyDragMoveRef.current = applyDragMove;
  });

  const schedulePointerUpdate = useCallback(
    (clientX: number, clientY: number, shiftKey: boolean) => {
      pendingPointerRef.current = { clientX, clientY, shiftKey };
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          const p = pendingPointerRef.current;
          if (p) applyDragMoveRef.current(p.clientX, p.clientY, p.shiftKey);
        });
      }
    },
    []
  );

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!dragState) return;
    schedulePointerUpdate(e.clientX, e.clientY, e.shiftKey);
  };

  const endInteraction = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    pendingPointerRef.current = null;
    const finalPatch = livePatchRef.current;
    if (finalPatch) {
      onUpdateLayer(
        finalPatch.layerId,
        (l) => applyPatchToLayer(l, finalPatch),
        false
      );
    }
    livePatchRef.current = null;
    setLivePatch(null);
    setDragState(null);
    setActiveSnapX(null);
    setActiveSnapY(null);
  }, [onUpdateLayer]);

  const isDraggingActive = dragState !== null;
  useEffect(() => {
    if (!isDraggingActive) return;
    const onWinMove = (ev: PointerEvent) =>
      schedulePointerUpdate(ev.clientX, ev.clientY, ev.shiftKey);
    const onWinUp = () => endInteraction();
    window.addEventListener('pointermove', onWinMove);
    window.addEventListener('pointerup', onWinUp);
    window.addEventListener('pointercancel', onWinUp);
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      window.removeEventListener('pointermove', onWinMove);
      window.removeEventListener('pointerup', onWinUp);
      window.removeEventListener('pointercancel', onWinUp);
    };
  }, [isDraggingActive, schedulePointerUpdate, endInteraction]);

  return {
    dragState,
    activeSnapX,
    activeSnapY,
    displayLayers,
    visibleLayers,
    handleContainerScroll,
    clientToCanvasPoint,
    startInteraction,
    handlePointerMove,
    endInteraction,
  };
}
