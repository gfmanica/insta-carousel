import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Image as ImageIcon, SlidersHorizontal, Maximize2 } from 'lucide-react';
import type {
  CarouselProject,
  CanvasLayer,
  ImageLayer,
  ImageCrop,
} from '../types/carousel';
import { INSTAGRAM_FORMATS, MAX_SLIDES } from '../types/carousel';
import {
  isHeicFile,
  isSupportedImageFile,
  processImportedImageFiles,
  buildImportedAssetsAndLayers,
} from '../utils/imageImport';
import { useCarouselProject } from '../hooks/useCarouselProject';
import { useStudioShortcuts } from '../hooks/useStudioShortcuts';
import { TopToolbar } from './TopToolbar';
import { LeftSidebar } from './LeftSidebar';
import { PanoramicCanvas } from './PanoramicCanvas';
import { RightInspector } from './RightInspector';
import { ExportModal } from './ExportModal';
import { GifMakerModal } from './GifMakerModal';
import { CropModal } from './CropModal';
import { ShortcutsModal } from './ShortcutsModal';

const StudioMobileNav: React.FC<{
  assetsCount: number;
  layersCount: number;
  zoom: number;
  isLeftOpen: boolean;
  isRightOpen: boolean;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  onFitToScreen: () => void;
}> = ({
  assetsCount,
  layersCount,
  zoom,
  isLeftOpen,
  isRightOpen,
  onToggleLeft,
  onToggleRight,
  onFitToScreen,
}) => (
  <nav className="md:hidden h-12 bg-studio-panel border-t border-studio-border px-3 flex items-center justify-around shrink-0 z-20">
    <button
      type="button"
      onClick={onToggleLeft}
      className={`btn-press flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
        isLeftOpen
          ? 'bg-accent/15 text-accent border border-accent/30'
          : 'text-zinc-300 hover:text-white'
      }`}
    >
      <ImageIcon className="w-4 h-4" />
      <span>Biblioteca ({assetsCount})</span>
    </button>
    <button
      type="button"
      onClick={onFitToScreen}
      className="btn-press flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white"
    >
      <Maximize2 className="w-3.5 h-3.5" />
      <span>Ajustar ({Math.round(zoom * 100)}%)</span>
    </button>
    <button
      type="button"
      onClick={onToggleRight}
      className={`btn-press flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
        isRightOpen
          ? 'bg-accent/15 text-accent border border-accent/30'
          : 'text-zinc-300 hover:text-white'
      }`}
    >
      <SlidersHorizontal className="w-4 h-4" />
      <span>Camadas ({layersCount})</span>
    </button>
  </nav>
);

const StudioModals: React.FC<{
  project: CarouselProject;
  isExportOpen: boolean;
  isGifOpen: boolean;
  isShortcutsOpen: boolean;
  cropTargetLayer: ImageLayer | null;
  importingCount: number;
  onCloseExport: () => void;
  onCloseGif: () => void;
  onCloseShortcuts: () => void;
  onCloseCrop: () => void;
  onUpdateProject: (updater: (prev: CarouselProject) => CarouselProject) => void;
  onSelectLayer: (layerId: string | null) => void;
  onApplyCrop: (layerId: string, crop: ImageCrop, w: number, h: number) => void;
}> = ({
  project,
  isExportOpen,
  isGifOpen,
  isShortcutsOpen,
  cropTargetLayer,
  importingCount,
  onCloseExport,
  onCloseGif,
  onCloseShortcuts,
  onCloseCrop,
  onUpdateProject,
  onSelectLayer,
  onApplyCrop,
}) => (
  <>
    {importingCount > 0 && (
      <div className="fixed bottom-16 md:bottom-4 left-1/2 -translate-x-1/2 z-50 bg-studio-panel/95 backdrop-blur-md border border-accent/40 text-zinc-100 px-3.5 py-2 rounded-lg shadow-xl text-xs font-medium flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
        <span>
          Convertendo {importingCount}{' '}
          {importingCount === 1 ? 'foto HEIC' : 'fotos HEIC'}...
        </span>
      </div>
    )}
    {isExportOpen && (
      <ExportModal isOpen={isExportOpen} onClose={onCloseExport} project={project} />
    )}
    {isGifOpen && (
      <GifMakerModal
        isOpen={isGifOpen}
        onClose={onCloseGif}
        project={project}
        onUpdateProject={onUpdateProject}
        onSelectLayer={onSelectLayer}
      />
    )}
    {cropTargetLayer && (
      <CropModal
        layer={cropTargetLayer}
        onClose={onCloseCrop}
        onApplyCrop={onApplyCrop}
      />
    )}
    {isShortcutsOpen && (
      <ShortcutsModal isOpen={isShortcutsOpen} onClose={onCloseShortcuts} />
    )}
  </>
);

export const CarouselStudio: React.FC = () => {
  const [zoom, setZoom] = useState<number>(0.34);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(
    'layer-demo-1'
  );
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isGifModalOpen, setIsGifModalOpen] = useState<boolean>(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] =
    useState<boolean>(false);
  const [cropTargetLayer, setCropTargetLayer] = useState<ImageLayer | null>(
    null
  );
  const [lastClickedPoint, setLastClickedPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [importingCount, setImportingCount] = useState<number>(0);

  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState<boolean>(true);
  const [leftSidebarWidth, setLeftSidebarWidth] = useState<number>(288);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState<boolean>(true);
  const [rightSidebarWidth, setRightSidebarWidth] = useState<number>(288);
  const [layersPanelHeight, setLayersPanelHeight] = useState<number>(224);

  const lastClickedPointRef = useRef(lastClickedPoint);
  const copiedLayerRef = useRef<CanvasLayer | null>(null);

  useEffect(() => {
    lastClickedPointRef.current = lastClickedPoint;
  }, [lastClickedPoint]);

  const {
    project,
    setProject,
    projectRef,
    saveStatus,
    canUndo,
    canRedo,
    commitHistory,
    handleUndo,
    handleRedo,
    handleUpdateProject,
    handleUpdateLayer,
    handleDeleteLayer,
    handleDuplicateLayer,
    handleApplyCrop,
    handleResetDemo,
  } = useCarouselProject({
    setSelectedLayerId,
    setZoom,
    setIsLeftSidebarOpen,
    setIsRightSidebarOpen,
  });

  const handleAddFiles = useCallback(
    (files: FileList | File[], targetPoint?: { x: number; y: number }) => {
      const fileArray = Array.from(files).filter((f) => isSupportedImageFile(f));
      if (fileArray.length === 0) return;

      const resolvedPoint = targetPoint ?? lastClickedPointRef.current;
      const heicCount = fileArray.filter((f) => isHeicFile(f)).length;
      if (heicCount > 0) setImportingCount((c) => c + heicCount);

      commitHistory();

      const batchBaseTs = Date.now();
      processImportedImageFiles(fileArray, () =>
        setImportingCount((c) => Math.max(0, c - 1))
      ).then((validItems) => {
        if (validItems.length === 0) return;
        const { newAssets, newLayers } = buildImportedAssetsAndLayers(
          projectRef.current,
          validItems,
          resolvedPoint,
          batchBaseTs
        );
        setProject((prev) => ({
          ...prev,
          assets: [...newAssets, ...prev.assets],
          layers: [...prev.layers, ...newLayers],
        }));
        if (newLayers.length > 0) {
          setSelectedLayerId(newLayers[newLayers.length - 1].id);
        }
      });
    },
    [commitHistory, projectRef, setProject]
  );

  const handleFitToScreen = useCallback(() => {
    const fmt = INSTAGRAM_FORMATS[projectRef.current.formatId];
    const isMobile = window.innerWidth < 768;
    const occupied = isMobile
      ? 0
      : (isLeftSidebarOpen ? leftSidebarWidth : 32) +
        (isRightSidebarOpen ? rightSidebarWidth : 32);
    const availW = Math.max(260, window.innerWidth - occupied - (isMobile ? 36 : 120));
    const availH = Math.max(240, window.innerHeight - (isMobile ? 170 : 192));
    const nextZoom = Math.min(
      availW / (fmt.width * projectRef.current.slidesCount),
      availH / fmt.height,
      0.85
    );
    setZoom(Math.max(0.12, +nextZoom.toFixed(2)));
  }, [isLeftSidebarOpen, leftSidebarWidth, isRightSidebarOpen, rightSidebarWidth, projectRef]);

  useStudioShortcuts({
    selectedLayerId,
    hasOpenModal:
      isExportModalOpen ||
      isGifModalOpen ||
      isShortcutsModalOpen ||
      cropTargetLayer !== null,
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
    onUndo: handleUndo,
    onRedo: handleRedo,
    onFitToScreen: handleFitToScreen,
    onUpdateProject: handleUpdateProject,
    onDuplicateLayer: handleDuplicateLayer,
    onDeleteLayer: handleDeleteLayer,
    onUpdateLayer: handleUpdateLayer,
    onAddFiles: handleAddFiles,
  });

  const handleToggleLeftSidebar = useCallback(() => {
    const nextOpen = !isLeftSidebarOpen;
    setIsLeftSidebarOpen(nextOpen);
    if (nextOpen && window.innerWidth < 768) setIsRightSidebarOpen(false);
  }, [isLeftSidebarOpen]);

  const handleToggleRightSidebar = useCallback(() => {
    const nextOpen = !isRightSidebarOpen;
    setIsRightSidebarOpen(nextOpen);
    if (nextOpen && window.innerWidth < 768) setIsLeftSidebarOpen(false);
  }, [isRightSidebarOpen]);

  return (
    <div className="h-[100dvh] w-screen flex flex-col bg-studio-bg text-zinc-100 overflow-hidden">
      <TopToolbar
        project={project}
        zoom={zoom}
        setZoom={setZoom}
        onFitToScreen={handleFitToScreen}
        saveStatus={saveStatus}
        canUndo={canUndo}
        canRedo={canRedo}
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

      <div className="flex-1 flex overflow-hidden relative">
        {(isLeftSidebarOpen || isRightSidebarOpen) && (
          <button
            type="button"
            aria-label="Fechar painéis laterais"
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

      <StudioMobileNav
        assetsCount={project.assets.length}
        layersCount={project.layers.length}
        zoom={zoom}
        isLeftOpen={isLeftSidebarOpen}
        isRightOpen={isRightSidebarOpen}
        onToggleLeft={handleToggleLeftSidebar}
        onToggleRight={handleToggleRightSidebar}
        onFitToScreen={handleFitToScreen}
      />

      <StudioModals
        project={project}
        isExportOpen={isExportModalOpen}
        isGifOpen={isGifModalOpen}
        isShortcutsOpen={isShortcutsModalOpen}
        cropTargetLayer={cropTargetLayer}
        importingCount={importingCount}
        onCloseExport={() => setIsExportModalOpen(false)}
        onCloseGif={() => setIsGifModalOpen(false)}
        onCloseShortcuts={() => setIsShortcutsModalOpen(false)}
        onCloseCrop={() => setCropTargetLayer(null)}
        onUpdateProject={handleUpdateProject}
        onSelectLayer={setSelectedLayerId}
        onApplyCrop={handleApplyCrop}
      />
    </div>
  );
};
