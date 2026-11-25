import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Image as ImageIcon, SlidersHorizontal, Maximize2 } from 'lucide-react';
import type {
  CarouselProject,
  CanvasLayer,
  ImageLayer,
  TextLayer,
  ImageCrop,
  ImageAsset,
} from '../types/carousel';
import { INSTAGRAM_FORMATS, MAX_SLIDES } from '../types/carousel';
import {
  createDefaultProject,
  loadProjectFromBrowser,
  saveProjectToBrowser,
  clearProjectInBrowser,
} from '../utils/storage';
import { TopToolbar } from './TopToolbar';
import { LeftSidebar } from './LeftSidebar';
import { PanoramicCanvas } from './PanoramicCanvas';
import { RightInspector } from './RightInspector';
import { ExportModal } from './ExportModal';
import { GifMakerModal } from './GifMakerModal';
import { CropModal } from './CropModal';
import { ShortcutsModal } from './ShortcutsModal';

export const CarouselStudio: React.FC = () => {
  const [project, setProject] = useState<CarouselProject>(() =>
    createDefaultProject()
  );
  const [past, setPast] = useState<CarouselProject[]>([]);
  const [future, setFuture] = useState<CarouselProject[]>([]);

  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [zoom, setZoom] = useState<number>(0.34);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(
    'layer-demo-1'
  );
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isGifModalOpen, setIsGifModalOpen] = useState<boolean>(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);
  const [cropTargetLayer, setCropTargetLayer] = useState<ImageLayer | null>(
    null
  );
  const [lastClickedPoint, setLastClickedPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [copiedLayer, setCopiedLayer] = useState<CanvasLayer | null>(null);
  const [importingCount, setImportingCount] = useState<number>(0);

  // Resizable & Collapsible Side Panels state
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState<boolean>(true);
  const [leftSidebarWidth, setLeftSidebarWidth] = useState<number>(288);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState<boolean>(true);
  const [rightSidebarWidth, setRightSidebarWidth] = useState<number>(288);
  const [layersPanelHeight, setLayersPanelHeight] = useState<number>(224);

  const projectRef = useRef(project);
  projectRef.current = project;
  const lastClickedPointRef = useRef(lastClickedPoint);
  lastClickedPointRef.current = lastClickedPoint;
  const copiedLayerRef = useRef(copiedLayer);
  copiedLayerRef.current = copiedLayer;

  // Load persisted project from IndexedDB / localStorage on mount
  useEffect(() => {
    let active = true;
    if (window.innerWidth < 768) {
      setIsLeftSidebarOpen(false);
      setIsRightSidebarOpen(false);
    }
    loadProjectFromBrowser().then((loaded) => {
      if (!active) return;
      setProject(loaded);
      if (loaded.layers.length > 0) {
        setSelectedLayerId(loaded.layers[0].id);
      }
      setIsLoaded(true);
      if (window.innerWidth < 768) {
        const fmt = INSTAGRAM_FORMATS[loaded.formatId];
        const totalW = fmt.width * loaded.slidesCount;
        const totalH = fmt.height;
        const availW = Math.max(260, window.innerWidth - 36);
        const availH = Math.max(240, window.innerHeight - 170);
        const nextZoom = Math.min(availW / totalW, availH / totalH, 0.85);
        setZoom(Math.max(0.12, +nextZoom.toFixed(2)));
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Auto-save to browser storage whenever project state changes
  useEffect(() => {
    if (!isLoaded) return;
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      saveProjectToBrowser(project).then(() => {
        setSaveStatus('saved');
      });
    }, 280);
    return () => clearTimeout(timer);
  }, [project, isLoaded]);

  const commitHistory = useCallback(() => {
    setPast((p) => [...p.slice(-29), projectRef.current]);
    setFuture([]);
  }, []);

  const handleUndo = useCallback(() => {
    setPast((prevPast) => {
      if (prevPast.length === 0) return prevPast;
      const previous = prevPast[prevPast.length - 1];
      setFuture((prevFuture) => [projectRef.current, ...prevFuture]);
      setProject(previous);
      return prevPast.slice(0, -1);
    });
  }, []);

  const handleRedo = useCallback(() => {
    setFuture((prevFuture) => {
      if (prevFuture.length === 0) return prevFuture;
      const next = prevFuture[0];
      setPast((prevPast) => [...prevPast.slice(-29), projectRef.current]);
      setProject(next);
      return prevFuture.slice(1);
    });
  }, []);

  const handleUpdateProject = useCallback(
    (updater: (prev: CarouselProject) => CarouselProject) => {
      setPast((p) => [...p.slice(-29), projectRef.current]);
      setFuture([]);
      setProject((prev) => updater(prev));
    },
    []
  );

  const handleUpdateLayer = useCallback(
    (
      layerId: string,
      updater: (layer: CanvasLayer) => CanvasLayer,
      recordHistory = true
    ) => {
      if (recordHistory) {
        setPast((p) => [...p.slice(-29), projectRef.current]);
        setFuture([]);
      }
      setProject((prev) => ({
        ...prev,
        layers: prev.layers.map((l) => (l.id === layerId ? updater(l) : l)),
      }));
    },
    []
  );

  const handleDeleteLayer = useCallback((layerId: string) => {
    setPast((p) => [...p.slice(-29), projectRef.current]);
    setFuture([]);
    setProject((prev) => ({
      ...prev,
      layers: prev.layers.filter((l) => l.id !== layerId),
    }));
    setSelectedLayerId((prevId) => (prevId === layerId ? null : prevId));
  }, []);

  const handleDuplicateLayer = useCallback((layer: CanvasLayer) => {
    setPast((p) => [...p.slice(-29), projectRef.current]);
    setFuture([]);
    const newId = `layer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setProject((prev) => {
      const maxZ = prev.layers.reduce((m, l) => Math.max(m, l.zIndex), 0);
      const copy: CanvasLayer = {
        ...layer,
        id: newId,
        name: `${layer.name} (cópia)`,
        x: layer.x + 60,
        y: layer.y + 60,
        zIndex: maxZ + 1,
      };
      return {
        ...prev,
        layers: [...prev.layers, copy],
      };
    });
    setSelectedLayerId(newId);
  }, []);

  const handleApplyCrop = useCallback(
    (
      layerId: string,
      crop: ImageCrop,
      newWidth: number,
      newHeight: number
    ) => {
      setPast((p) => [...p.slice(-29), projectRef.current]);
      setFuture([]);
      setProject((prev) => ({
        ...prev,
        layers: prev.layers.map((l) =>
          l.id === layerId && l.type === 'image'
            ? {
                ...l,
                crop,
                width: newWidth,
                height: newHeight,
              }
            : l
        ),
      }));
    },
    []
  );

  const isHeicFile = (file: File): boolean =>
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    /\.(heic|heif)$/i.test(file.name);

  const isSupportedImageFile = (file: File): boolean =>
    file.type.startsWith('image/') || isHeicFile(file);

  const blobToDataUrl = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => resolve((ev.target?.result as string) || '');
      reader.onerror = () => reject(new Error('Falha ao ler arquivo de imagem.'));
      reader.readAsDataURL(blob);
    });

  // Unified file upload / drop / clipboard paste handler (including HEIC/HEIF conversion)
  const handleAddFiles = useCallback(
    (files: FileList | File[], targetPoint?: { x: number; y: number }) => {
      const fileArray = Array.from(files).filter((f) =>
        isSupportedImageFile(f)
      );
      if (fileArray.length === 0) return;

      const resolvedPoint = targetPoint ?? lastClickedPointRef.current;

      setPast((p) => [...p.slice(-29), projectRef.current]);
      setFuture([]);

      fileArray.forEach(async (file, idx) => {
        const heic = isHeicFile(file);
        if (heic) setImportingCount((c) => c + 1);

        try {
          let blobToRead: Blob = file;
          let resolvedName = file.name;

          if (heic) {
            const { heicTo } = await import('heic-to');
            blobToRead = await heicTo({
              blob: file,
              type: 'image/jpeg',
              quality: 0.92,
            });
            resolvedName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
          }

          const dataUrl = await blobToDataUrl(blobToRead);
          if (!dataUrl) return;

          const img = new Image();
          img.onload = () => {
            const currentFormat = INSTAGRAM_FORMATS[projectRef.current.formatId];
            const totalW =
              currentFormat.width * projectRef.current.slidesCount;
            const totalH = currentFormat.height;

            const assetId = `asset-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 7)}`;
            const newAsset: ImageAsset = {
              id: assetId,
              name:
                resolvedName && resolvedName !== 'image.png'
                  ? resolvedName
                  : `imagem-colada-${new Date().toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}.png`,
              dataUrl,
              naturalWidth: img.naturalWidth || 800,
              naturalHeight: img.naturalHeight || 800,
              createdAt: Date.now(),
            };

            const maxInitDim = Math.min(currentFormat.width * 0.72, 820);
            const ratio =
              newAsset.naturalWidth / Math.max(1, newAsset.naturalHeight);
            let w = maxInitDim;
            let h = maxInitDim / ratio;
            if (h > currentFormat.height * 0.78) {
              h = currentFormat.height * 0.78;
              w = h * ratio;
            }

            const layerId = `layer-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 6)}`;

            const cascadeOffset = idx * 32;
            const xPos = resolvedPoint
              ? Math.round(
                  Math.max(
                    -w * 0.4,
                    Math.min(
                      totalW - w * 0.6,
                      resolvedPoint.x - w / 2 + cascadeOffset
                    )
                  )
                )
              : projectRef.current.slidesCount > 1
              ? Math.round(currentFormat.width - w / 2 + cascadeOffset)
              : Math.round((currentFormat.width - w) / 2 + cascadeOffset);

            const yPos = resolvedPoint
              ? Math.round(
                  Math.max(
                    -h * 0.4,
                    Math.min(
                      totalH - h * 0.6,
                      resolvedPoint.y - h / 2 + cascadeOffset
                    )
                  )
                )
              : Math.round((currentFormat.height - h) / 2 + cascadeOffset);

            setProject((prev) => {
              const maxZ = prev.layers.reduce((m, l) => Math.max(m, l.zIndex), 0);
              const newLayer: ImageLayer = {
                id: layerId,
                type: 'image',
                assetId,
                name: newAsset.name.replace(/\.[^/.]+$/, ''),
                dataUrl,
                naturalWidth: newAsset.naturalWidth,
                naturalHeight: newAsset.naturalHeight,
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
                assets: [newAsset, ...prev.assets],
                layers: [...prev.layers, newLayer],
              };
            });
            setSelectedLayerId(layerId);
          };
          img.src = dataUrl;
        } catch (err) {
          console.error('Erro ao importar imagem (incluindo HEIC):', err);
        } finally {
          if (heic) setImportingCount((c) => Math.max(0, c - 1));
        }
      });
    },
    []
  );

  // Fit canvas to available workspace area
  const handleFitToScreen = useCallback(() => {
    const fmt = INSTAGRAM_FORMATS[projectRef.current.formatId];
    const totalW = fmt.width * projectRef.current.slidesCount;
    const totalH = fmt.height;
    const isMobile = window.innerWidth < 768;
    const occupiedSidebars = isMobile
      ? 0
      : (isLeftSidebarOpen ? leftSidebarWidth : 32) +
        (isRightSidebarOpen ? rightSidebarWidth : 32);
    const availW = Math.max(
      260,
      window.innerWidth - occupiedSidebars - (isMobile ? 36 : 120)
    );
    const availH = Math.max(
      240,
      window.innerHeight - (isMobile ? 170 : 192)
    );
    const nextZoom = Math.min(availW / totalW, availH / totalH, 0.85);
    setZoom(Math.max(0.12, +nextZoom.toFixed(2)));
  }, [
    isLeftSidebarOpen,
    leftSidebarWidth,
    isRightSidebarOpen,
    rightSidebarWidth,
  ]);

  // Global keyboard shortcuts (Undo, Redo, Zoom, Panels, Modals, Layer transforms, Z-order, Paste)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isEditingInput =
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        activeTag === 'select';
      const hasOpenModal =
        isExportModalOpen ||
        isGifModalOpen ||
        isShortcutsModalOpen ||
        cropTargetLayer !== null;

      if (isEditingInput) return;

      const key = e.key.toLowerCase();
      const mod = e.metaKey || e.ctrlKey;

      // Shortcuts Help (?)
      if ((e.key === '?' || (e.shiftKey && key === '/')) && !mod) {
        e.preventDefault();
        setIsShortcutsModalOpen((open) => !open);
        return;
      }

      if (hasOpenModal) return;

      // Undo / Redo
      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if (mod && key === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Open Export Modal (Ctrl/Cmd + E)
      if (mod && key === 'e') {
        e.preventDefault();
        setIsExportModalOpen(true);
        return;
      }

      // Open GIF / Video Modal (Ctrl/Cmd + Shift + G)
      if (mod && e.shiftKey && key === 'g') {
        e.preventDefault();
        setIsGifModalOpen(true);
        return;
      }

      // Copy Layer (Ctrl+C / Cmd+C)
      if (mod && key === 'c') {
        if (!selectedLayerId) return;
        const target = projectRef.current.layers.find(
          (l) => l.id === selectedLayerId
        );
        if (target) {
          setCopiedLayer(target);
        }
        return;
      }

      // Duplicate (Ctrl+D / Cmd+D)
      if (mod && key === 'd') {
        if (!selectedLayerId) return;
        e.preventDefault();
        const target = projectRef.current.layers.find(
          (l) => l.id === selectedLayerId
        );
        if (target) handleDuplicateLayer(target);
        return;
      }

      // Z-Order: Bring Forward (Ctrl/Cmd + ] or PageUp) / Send Backward (Ctrl/Cmd + [ or PageDown)
      if (
        (mod && e.key === ']') ||
        e.key === 'PageUp' ||
        (mod && e.key === '[') ||
        e.key === 'PageDown'
      ) {
        if (!selectedLayerId) return;
        e.preventDefault();
        const isForward = e.key === ']' || e.key === 'PageUp';
        handleUpdateProject((prev) => {
          const ordered = [...prev.layers].sort((a, b) => b.zIndex - a.zIndex);
          const idx = ordered.findIndex((l) => l.id === selectedLayerId);
          if (idx === -1) return prev;
          const swapIdx = isForward ? idx - 1 : idx + 1;
          if (swapIdx < 0 || swapIdx >= ordered.length) return prev;
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

      // Escape: deselect active layer
      if (e.key === 'Escape') {
        if (selectedLayerId) {
          e.preventDefault();
          setSelectedLayerId(null);
        }
        return;
      }

      // Tab / Shift+Tab: cycle through visible layers
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

      // Zoom controls (+ / =, -, 0, 1)
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
        handleFitToScreen();
        return;
      }
      if (e.key === '1') {
        e.preventDefault();
        setZoom(1);
        return;
      }

      // Toggle Seam Guides (G)
      if (key === 'g' && !e.shiftKey) {
        e.preventDefault();
        handleUpdateProject((p) => ({
          ...p,
          showSeamGuides: !p.showSeamGuides,
        }));
        return;
      }

      // Toggle Side Panels ([ left, ] right, \ focus mode)
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

      // Quick Add Text Layer (T)
      if (key === 't' && !e.shiftKey) {
        e.preventDefault();
        const fmt = INSTAGRAM_FORMATS[projectRef.current.formatId];
        const pt = lastClickedPointRef.current;
        const w = 720;
        const h = 180;
        const layerId = `layer-text-${Date.now()}`;
        handleUpdateProject((prev) => {
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
          return {
            ...prev,
            layers: [...prev.layers, newText],
          };
        });
        setSelectedLayerId(layerId);
        return;
      }

      if (!selectedLayerId) return;

      // Layer transforms & actions (R rotate, H flipX, Shift+H visibility, V flipY, C crop, L lock)
      if (key === 'r') {
        e.preventDefault();
        const delta = e.shiftKey ? -90 : 90;
        handleUpdateLayer(selectedLayerId, (l) =>
          l.locked ? l : { ...l, rotation: ((l.rotation || 0) + delta) % 360 }
        );
        return;
      }

      if (key === 'h' && e.shiftKey) {
        e.preventDefault();
        handleUpdateLayer(selectedLayerId, (l) => ({
          ...l,
          visible: !l.visible,
        }));
        return;
      }

      if (key === 'h') {
        e.preventDefault();
        handleUpdateLayer(selectedLayerId, (l) =>
          l.locked ? l : { ...l, flipX: !l.flipX }
        );
        return;
      }

      if (key === 'v') {
        e.preventDefault();
        handleUpdateLayer(selectedLayerId, (l) =>
          l.locked ? l : { ...l, flipY: !l.flipY }
        );
        return;
      }

      if (key === 'l') {
        e.preventDefault();
        handleUpdateLayer(selectedLayerId, (l) => ({
          ...l,
          locked: !l.locked,
        }));
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

      // Delete / Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteLayer(selectedLayerId);
        return;
      }

      // Arrow keys nudging
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 20 : 2;
        handleUpdateLayer(selectedLayerId, (l) => {
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

      // 1. Extract image files/blobs from clipboard (e.g. screenshots, copied browser images, or OS files)
      const imageFiles: File[] = [];
      if (e.clipboardData?.items) {
        for (const item of Array.from(e.clipboardData.items)) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) imageFiles.push(file);
          }
        }
      }
      if (
        imageFiles.length === 0 &&
        e.clipboardData?.files &&
        e.clipboardData.files.length > 0
      ) {
        for (const file of Array.from(e.clipboardData.files)) {
          if (isSupportedImageFile(file)) {
            imageFiles.push(file);
          }
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        handleAddFiles(imageFiles, lastClickedPointRef.current ?? undefined);
        return;
      }

      // 2. Otherwise, paste an internal canvas layer copied with Ctrl+C
      const internalCopy = copiedLayerRef.current;
      if (internalCopy) {
        e.preventDefault();
        setPast((p) => [...p.slice(-29), projectRef.current]);
        setFuture([]);

        const newLayerId = `layer-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 6)}`;
        const pt = lastClickedPointRef.current;

        setProject((prev) => {
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

          const pastedTextLayer: CanvasLayer = {
            ...internalCopy,
            id: newLayerId,
            name: `${internalCopy.name} (colado)`,
            x: xPos,
            y: yPos,
            zIndex: maxZ + 1,
          };
          return {
            ...prev,
            layers: [...prev.layers, pastedTextLayer],
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
    isExportModalOpen,
    isGifModalOpen,
    isShortcutsModalOpen,
    cropTargetLayer,
    isLeftSidebarOpen,
    isRightSidebarOpen,
    handleUndo,
    handleRedo,
    handleFitToScreen,
    handleUpdateProject,
    handleDuplicateLayer,
    handleDeleteLayer,
    handleUpdateLayer,
    handleAddFiles,
  ]);

  const handleResetDemo = async () => {
    const fresh = await clearProjectInBrowser();
    setPast([]);
    setFuture([]);
    setProject(fresh);
    setSelectedLayerId(fresh.layers[0]?.id || null);
  };

  const handleToggleLeftSidebar = useCallback(() => {
    setIsLeftSidebarOpen((prev) => {
      const next = !prev;
      if (next && window.innerWidth < 768) {
        setIsRightSidebarOpen(false);
      }
      return next;
    });
  }, []);

  const handleToggleRightSidebar = useCallback(() => {
    setIsRightSidebarOpen((prev) => {
      const next = !prev;
      if (next && window.innerWidth < 768) {
        setIsLeftSidebarOpen(false);
      }
      return next;
    });
  }, []);

  return (
    <div className="h-[100dvh] w-screen flex flex-col bg-studio-bg text-zinc-100 overflow-hidden">
      {/* Top Toolbar */}
      <TopToolbar
        project={project}
        zoom={zoom}
        setZoom={setZoom}
        onFitToScreen={handleFitToScreen}
        saveStatus={saveStatus}
        canUndo={past.length > 0}
        canRedo={future.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onUpdateProject={handleUpdateProject}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenGifModal={() => setIsGifModalOpen(true)}
        onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
        onResetDemo={handleResetDemo}
        isLeftSidebarOpen={isLeftSidebarOpen}
        onToggleLeftSidebar={handleToggleLeftSidebar}
        isRightSidebarOpen={isRightSidebarOpen}
        onToggleRightSidebar={handleToggleRightSidebar}
      />

      {/* Main 3-Column Studio Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Backdrop when a drawer is open */}
        {(isLeftSidebarOpen || isRightSidebarOpen) && (
          <div
            onClick={() => {
              setIsLeftSidebarOpen(false);
              setIsRightSidebarOpen(false);
            }}
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-[1px] z-30"
          />
        )}

        <LeftSidebar
          project={project}
          onUpdateProject={handleUpdateProject}
          onSelectLayer={(id) => {
            setSelectedLayerId(id);
            if (window.innerWidth < 768) setIsLeftSidebarOpen(false);
          }}
          onAddFiles={handleAddFiles}
          lastClickedPoint={lastClickedPoint}
          width={leftSidebarWidth}
          isOpen={isLeftSidebarOpen}
          onToggleOpen={handleToggleLeftSidebar}
          onResizeWidth={setLeftSidebarWidth}
        />

        <PanoramicCanvas
          project={project}
          zoom={zoom}
          setZoom={setZoom}
          selectedLayerId={selectedLayerId}
          onSelectLayer={setSelectedLayerId}
          onUpdateLayer={handleUpdateLayer}
          onCommitHistory={commitHistory}
          onDeleteLayer={handleDeleteLayer}
          onDuplicateLayer={handleDuplicateLayer}
          onOpenCropModal={(layer) => setCropTargetLayer(layer)}
          onAddFiles={handleAddFiles}
          lastClickedPoint={lastClickedPoint}
          onUpdateLastClickedPoint={setLastClickedPoint}
          onAddSlide={() =>
            handleUpdateProject((prev) => ({
              ...prev,
              slidesCount: Math.min(MAX_SLIDES, prev.slidesCount + 1),
            }))
          }
        />

        <RightInspector
          project={project}
          selectedLayerId={selectedLayerId}
          onSelectLayer={setSelectedLayerId}
          onUpdateLayer={handleUpdateLayer}
          onUpdateProject={handleUpdateProject}
          onDeleteLayer={handleDeleteLayer}
          onDuplicateLayer={handleDuplicateLayer}
          onOpenCropModal={(layer) => setCropTargetLayer(layer)}
          width={rightSidebarWidth}
          isOpen={isRightSidebarOpen}
          onToggleOpen={handleToggleRightSidebar}
          onResizeWidth={setRightSidebarWidth}
          layersPanelHeight={layersPanelHeight}
          onResizeLayersPanelHeight={setLayersPanelHeight}
        />
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden h-12 bg-studio-panel border-t border-studio-border px-3 flex items-center justify-around shrink-0 z-20">
        <button
          type="button"
          onClick={handleToggleLeftSidebar}
          className={`btn-press flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
            isLeftSidebarOpen
              ? 'bg-accent/15 text-accent border border-accent/30'
              : 'text-zinc-300 hover:text-white'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Biblioteca ({project.assets.length})</span>
        </button>

        <button
          type="button"
          onClick={handleFitToScreen}
          className="btn-press flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Ajustar ({Math.round(zoom * 100)}%)</span>
        </button>

        <button
          type="button"
          onClick={handleToggleRightSidebar}
          className={`btn-press flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
            isRightSidebarOpen
              ? 'bg-accent/15 text-accent border border-accent/30'
              : 'text-zinc-300 hover:text-white'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Camadas ({project.layers.length})</span>
        </button>
      </nav>

      {/* HEIC Conversion Status Toast */}
      {importingCount > 0 && (
        <div className="fixed bottom-16 md:bottom-4 left-1/2 -translate-x-1/2 z-50 bg-studio-panel/95 backdrop-blur-md border border-accent/40 text-zinc-100 px-3.5 py-2 rounded-lg shadow-xl text-xs font-medium flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span>
            Convertendo {importingCount}{' '}
            {importingCount === 1 ? 'foto HEIC' : 'fotos HEIC'}...
          </span>
        </div>
      )}

      {/* Native <dialog> Modals */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        project={project}
      />

      <GifMakerModal
        isOpen={isGifModalOpen}
        onClose={() => setIsGifModalOpen(false)}
        project={project}
        onUpdateProject={handleUpdateProject}
        onSelectLayer={setSelectedLayerId}
      />

      <CropModal
        layer={cropTargetLayer}
        onClose={() => setCropTargetLayer(null)}
        onApplyCrop={handleApplyCrop}
      />

      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
};
