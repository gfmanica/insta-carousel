import { useEffect } from 'react';
import type {
  CarouselProject,
  CanvasLayer,
  ImageAsset,
  ImageLayer,
  TextLayer,
} from '../types/carousel';
import { INSTAGRAM_FORMATS } from '../types/carousel';
import { isSupportedImageFile } from '../utils/imageImport';

interface UseStudioShortcutsParams {
  selectedLayerId: string | null;
  hasOpenModal: boolean;
  isLeftSidebarOpen: boolean;
  isRightSidebarOpen: boolean;
  projectRef: React.RefObject<CarouselProject>;
  lastClickedPointRef: React.RefObject<{ x: number; y: number } | null>;
  copiedLayerRef: React.MutableRefObject<CanvasLayer | null>;
  setSelectedLayerId: React.Dispatch<React.SetStateAction<string | null>>;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  setIsLeftSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsRightSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsExportModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsGifModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsShortcutsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setCropTargetLayer: React.Dispatch<React.SetStateAction<ImageLayer | null>>;
  onUndo: () => void;
  onRedo: () => void;
  onFitToScreen: () => void;
  onUpdateProject: (updater: (prev: CarouselProject) => CarouselProject) => void;
  onDuplicateLayer: (layer: CanvasLayer) => void;
  onDeleteLayer: (layerId: string) => void;
  onUpdateLayer: (
    layerId: string,
    updater: (layer: CanvasLayer) => CanvasLayer
  ) => void;
  onAddFiles: (
    files: FileList | File[],
    targetPoint?: { x: number; y: number }
  ) => void;
}

export function useStudioShortcuts({
  selectedLayerId,
  hasOpenModal,
  isLeftSidebarOpen,
  isRightSidebarOpen,
  projectRef,
  lastClickedPointRef,
  copiedLayerRef,
  setSelectedLayerId,
  setZoom,
  setIsLeftSidebarOpen,
  setIsRightSidebarOpen,
  setIsExportModalOpen,
  setIsGifModalOpen,
  setIsShortcutsModalOpen,
  setCropTargetLayer,
  onUndo,
  onRedo,
  onFitToScreen,
  onUpdateProject,
  onDuplicateLayer,
  onDeleteLayer,
  onUpdateLayer,
  onAddFiles,
}: UseStudioShortcutsParams) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        activeTag === 'select'
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      const mod = e.metaKey || e.ctrlKey;

      if ((e.key === '?' || (e.shiftKey && key === '/')) && !mod) {
        e.preventDefault();
        setIsShortcutsModalOpen((open) => !open);
        return;
      }

      if (hasOpenModal) return;

      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) onRedo();
        else onUndo();
        return;
      }

      if (mod && key === 'y') {
        e.preventDefault();
        onRedo();
        return;
      }

      if (mod && key === 'e') {
        e.preventDefault();
        setIsExportModalOpen(true);
        return;
      }

      if (mod && e.shiftKey && key === 'g') {
        e.preventDefault();
        setIsGifModalOpen(true);
        return;
      }

      if (mod && key === 'c') {
        if (!selectedLayerId) return;
        const target = projectRef.current.layers.find(
          (l) => l.id === selectedLayerId
        );
        if (target) copiedLayerRef.current = target;
        return;
      }

      if (mod && key === 'd') {
        if (!selectedLayerId) return;
        e.preventDefault();
        const target = projectRef.current.layers.find(
          (l) => l.id === selectedLayerId
        );
        if (target) onDuplicateLayer(target);
        return;
      }

      if (
        (mod && e.key === ']') ||
        e.key === 'PageUp' ||
        (mod && e.key === '[') ||
        e.key === 'PageDown'
      ) {
        if (!selectedLayerId) return;
        e.preventDefault();
        const isForward = e.key === ']' || e.key === 'PageUp';
        onUpdateProject((prev) => {
          const ordered = [...prev.layers].sort((a, b) => b.zIndex - a.zIndex);
          const idx = ordered.findIndex((l) => l.id === selectedLayerId);
          const swapIdx = isForward ? idx - 1 : idx + 1;
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
        return;
      }

      if (e.key === 'Escape') {
        if (selectedLayerId) {
          e.preventDefault();
          setSelectedLayerId(null);
        }
        return;
      }

      if (e.key === 'Tab' && !mod) {
        const visibleLayers = [...projectRef.current.layers]
          .filter((l) => l.visible)
          .sort((a, b) => b.zIndex - a.zIndex);
        if (visibleLayers.length === 0) return;
        e.preventDefault();
        const currentIdx = visibleLayers.findIndex(
          (l) => l.id === selectedLayerId
        );
        const nextIdx = e.shiftKey
          ? currentIdx <= 0
            ? visibleLayers.length - 1
            : currentIdx - 1
          : (currentIdx + 1) % visibleLayers.length;
        setSelectedLayerId(visibleLayers[nextIdx].id);
        return;
      }

      if (mod || e.altKey) return;

      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(2)));
        return;
      }
      if (e.key === '-') {
        e.preventDefault();
        setZoom((z) => Math.max(0.12, +(z - 0.1).toFixed(2)));
        return;
      }
      if (e.key === '0') {
        e.preventDefault();
        onFitToScreen();
        return;
      }
      if (e.key === '1') {
        e.preventDefault();
        setZoom(1);
        return;
      }
      if (key === 'g' && !e.shiftKey) {
        e.preventDefault();
        onUpdateProject((p) => ({ ...p, showSeamGuides: !p.showSeamGuides }));
        return;
      }
      if (e.key === '[') {
        e.preventDefault();
        setIsLeftSidebarOpen((o) => !o);
        return;
      }
      if (e.key === ']') {
        e.preventDefault();
        setIsRightSidebarOpen((o) => !o);
        return;
      }
      if (e.key === '\\') {
        e.preventDefault();
        const anyOpen = isLeftSidebarOpen || isRightSidebarOpen;
        setIsLeftSidebarOpen(!anyOpen);
        setIsRightSidebarOpen(!anyOpen);
        return;
      }

      if (key === 't' && !e.shiftKey) {
        e.preventDefault();
        const fmt = INSTAGRAM_FORMATS[projectRef.current.formatId];
        const pt = lastClickedPointRef.current;
        const w = 720;
        const h = 180;
        const layerId = `layer-text-${Date.now()}`;
        onUpdateProject((prev) => {
          const maxZ = prev.layers.reduce((m, l) => Math.max(m, l.zIndex), 0);
          const newText: TextLayer = {
            id: layerId,
            type: 'text',
            name: 'Título',
            text: 'Título Principal',
            x: pt ? Math.round(pt.x - w / 2) : Math.round((fmt.width - w) / 2),
            y: pt ? Math.round(pt.y - h / 2) : Math.round((fmt.height - h) / 2),
            width: w,
            height: h,
            rotation: 0,
            opacity: 1,
            zIndex: maxZ + 1,
            visible: true,
            locked: false,
            fontSize: 56,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: '700',
            color: '#FAFAFA',
            backgroundColor: 'transparent',
            borderRadius: 12,
            textAlign: 'center',
            shadowBlur: 0,
            shadowColor: 'rgba(0,0,0,0.4)',
          };
          return { ...prev, layers: [...prev.layers, newText] };
        });
        setSelectedLayerId(layerId);
        return;
      }

      if (!selectedLayerId) return;

      if (key === 'r') {
        e.preventDefault();
        const delta = e.shiftKey ? -90 : 90;
        onUpdateLayer(selectedLayerId, (l) =>
          l.locked ? l : { ...l, rotation: ((l.rotation || 0) + delta) % 360 }
        );
        return;
      }
      if (key === 'h' && e.shiftKey) {
        e.preventDefault();
        onUpdateLayer(selectedLayerId, (l) => ({ ...l, visible: !l.visible }));
        return;
      }
      if (key === 'h') {
        e.preventDefault();
        onUpdateLayer(selectedLayerId, (l) =>
          l.locked ? l : { ...l, flipX: !l.flipX }
        );
        return;
      }
      if (key === 'v') {
        e.preventDefault();
        onUpdateLayer(selectedLayerId, (l) =>
          l.locked ? l : { ...l, flipY: !l.flipY }
        );
        return;
      }
      if (key === 'l') {
        e.preventDefault();
        onUpdateLayer(selectedLayerId, (l) => ({ ...l, locked: !l.locked }));
        return;
      }
      if (key === 'c') {
        const target = projectRef.current.layers.find(
          (l) => l.id === selectedLayerId
        );
        if (target && target.type === 'image') {
          e.preventDefault();
          setCropTargetLayer(target);
        }
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDeleteLayer(selectedLayerId);
        return;
      }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 20 : 2;
        onUpdateLayer(selectedLayerId, (l) => {
          if (l.locked) return l;
          return {
            ...l,
            x:
              e.key === 'ArrowLeft'
                ? l.x - step
                : e.key === 'ArrowRight'
                ? l.x + step
                : l.x,
            y:
              e.key === 'ArrowUp'
                ? l.y - step
                : e.key === 'ArrowDown'
                ? l.y + step
                : l.y,
          };
        });
      }
    };

    const onPaste = (e: ClipboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      const imageFiles: File[] = [];
      if (e.clipboardData?.items) {
        for (const item of Array.from(e.clipboardData.items)) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) imageFiles.push(file);
          }
        }
      }
      if (imageFiles.length === 0 && e.clipboardData?.files?.length) {
        for (const file of Array.from(e.clipboardData.files)) {
          if (isSupportedImageFile(file)) imageFiles.push(file);
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        onAddFiles(imageFiles, lastClickedPointRef.current ?? undefined);
        return;
      }

      const internalCopy = copiedLayerRef.current;
      if (internalCopy) {
        e.preventDefault();
        const newLayerId = `layer-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 6)}`;
        const pt = lastClickedPointRef.current;

        onUpdateProject((prev) => {
          const maxZ = prev.layers.reduce((m, l) => Math.max(m, l.zIndex), 0);
          const xPos = pt
            ? Math.round(pt.x - internalCopy.width / 2)
            : internalCopy.x + 60;
          const yPos = pt
            ? Math.round(pt.y - internalCopy.height / 2)
            : internalCopy.y + 60;

          if (internalCopy.type === 'image') {
            const newAssetId = `asset-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 7)}`;
            const copiedAsset: ImageAsset = {
              id: newAssetId,
              name: `${internalCopy.name} (colado)`,
              dataUrl: internalCopy.dataUrl,
              thumbnailUrl: internalCopy.thumbnailUrl,
              naturalWidth: internalCopy.naturalWidth,
              naturalHeight: internalCopy.naturalHeight,
              createdAt: Date.now(),
            };
            const pastedImageLayer: ImageLayer = {
              ...internalCopy,
              id: newLayerId,
              assetId: newAssetId,
              name: `${internalCopy.name} (colado)`,
              x: xPos,
              y: yPos,
              zIndex: maxZ + 1,
            };
            return {
              ...prev,
              assets: [copiedAsset, ...prev.assets],
              layers: [...prev.layers, pastedImageLayer],
            };
          }

          return {
            ...prev,
            layers: [
              ...prev.layers,
              {
                ...internalCopy,
                id: newLayerId,
                name: `${internalCopy.name} (colado)`,
                x: xPos,
                y: yPos,
                zIndex: maxZ + 1,
              },
            ],
          };
        });
        setSelectedLayerId(newLayerId);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('paste', onPaste);
    };
  }, [
    selectedLayerId,
    hasOpenModal,
    isLeftSidebarOpen,
    isRightSidebarOpen,
    projectRef,
    lastClickedPointRef,
    copiedLayerRef,
    setSelectedLayerId,
    setZoom,
    setIsLeftSidebarOpen,
    setIsRightSidebarOpen,
    setIsExportModalOpen,
    setIsGifModalOpen,
    setIsShortcutsModalOpen,
    setCropTargetLayer,
    onUndo,
    onRedo,
    onFitToScreen,
    onUpdateProject,
    onDuplicateLayer,
    onDeleteLayer,
    onUpdateLayer,
    onAddFiles,
  ]);
}
