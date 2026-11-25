import React, { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import type {
  CarouselProject,
  CanvasLayer,
  ImageLayer,
} from '../types/carousel';
import { INSTAGRAM_FORMATS, MAX_SLIDES } from '../types/carousel';
import type { SnapGuide } from '../utils/canvasTransform';
import { useCanvasInteractions } from '../hooks/useCanvasInteractions';
import { CanvasSelectionOverlay } from './CanvasSelectionOverlay';

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
  onAddSlide: () => void;
}

interface CanvasLayerNodeProps {
  layer: CanvasLayer;
  isSelected: boolean;
  isDragging: boolean;
  onStartMove: (e: React.PointerEvent<HTMLElement>, layer: CanvasLayer) => void;
  onSelect: (layerId: string) => void;
  onOpenCrop: (layer: ImageLayer) => void;
}

const CanvasImageLayerContent: React.FC<{ layer: ImageLayer }> = ({ layer }) => {
  const crop = layer.crop || { x: 0, y: 0, width: 1, height: 1 };
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        borderRadius: `${layer.borderRadius || 0}px`,
        border: layer.borderWidth
          ? `${layer.borderWidth}px solid ${layer.borderColor || '#ffffff'}`
          : undefined,
        boxShadow: layer.shadowBlur
          ? `0 12px ${layer.shadowBlur}px ${layer.shadowColor || 'rgba(0,0,0,0.45)'}`
          : undefined,
        transform: `scaleX(${layer.flipX ? -1 : 1}) scaleY(${layer.flipY ? -1 : 1})`,
      }}
      className="pointer-events-none select-none relative"
    >
      <img
        src={layer.dataUrl}
        alt={layer.name}
        draggable={false}
        decoding="async"
        style={{
          width: `${100 / Math.max(0.01, crop.width)}%`,
          height: `${100 / Math.max(0.01, crop.height)}%`,
          maxWidth: 'none',
          maxHeight: 'none',
          transform: `translate(${-crop.x * 100}%, ${-crop.y * 100}%)`,
        }}
        className="pointer-events-none select-none block"
      />
    </div>
  );
};

const CanvasTextLayerContent: React.FC<{
  layer: Extract<CanvasLayer, { type: 'text' }>;
}> = ({ layer }) => (
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
      transform: `scaleX(${layer.flipX ? -1 : 1}) scaleY(${layer.flipY ? -1 : 1})`,
      boxShadow: layer.shadowBlur
        ? `0 8px ${layer.shadowBlur}px ${layer.shadowColor || 'rgba(0,0,0,0.45)'}`
        : undefined,
    }}
    className="flex items-center justify-center p-6 whitespace-pre-wrap leading-tight pointer-events-none select-none"
  >
    {layer.text}
  </div>
);

const CanvasLayerNode = React.memo<CanvasLayerNodeProps>(
  ({ layer, isSelected, isDragging, onStartMove, onSelect, onOpenCrop }) => (
    <button
      type="button"
      aria-label={layer.name}
      onPointerDown={(e) => onStartMove(e, layer)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(layer.id);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (layer.type === 'image') onOpenCrop(layer);
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
        willChange: isDragging ? 'left, top, width, height, transform' : undefined,
        contain: 'layout style',
      }}
      className={`canvas-drag-handle group block p-0 border-0 bg-transparent text-left ${
        isDragging ? 'dragging' : ''
      } ${
        !isSelected ? 'hover:outline hover:outline-2 hover:outline-accent/55' : ''
      }`}
    >
      {layer.type === 'image' ? (
        <CanvasImageLayerContent layer={layer} />
      ) : (
        <CanvasTextLayerContent layer={layer} />
      )}
    </button>
  ),
  (prev, next) =>
    prev.layer === next.layer &&
    prev.isSelected === next.isSelected &&
    prev.isDragging === next.isDragging
);

const CanvasGuidesOverlay: React.FC<{
  activeSnapX: SnapGuide | null;
  activeSnapY: SnapGuide | null;
  lastClickedPoint: { x: number; y: number } | null;
  selectedLayerId: string | null;
  invScale: number;
}> = ({ activeSnapX, activeSnapY, lastClickedPoint, selectedLayerId, invScale }) => (
  <>
    {activeSnapX !== null && (
      <div
        style={{
          left: `${activeSnapX.pos}px`,
          width: `${(activeSnapX.kind === 'block' ? 2 : 1.5) * invScale}px`,
          transform: 'translateX(-50%)',
        }}
        className={`absolute top-0 bottom-0 pointer-events-none z-50 ${
          activeSnapX.kind === 'block'
            ? 'bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.95)]'
            : 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.85)]'
        }`}
      />
    )}
    {activeSnapY !== null && (
      <div
        style={{
          top: `${activeSnapY.pos}px`,
          height: `${(activeSnapY.kind === 'block' ? 2 : 1.5) * invScale}px`,
          transform: 'translateY(-50%)',
        }}
        className={`absolute left-0 right-0 pointer-events-none z-50 ${
          activeSnapY.kind === 'block'
            ? 'bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.95)]'
            : 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.85)]'
        }`}
      />
    )}
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
  </>
);

const CanvasSlideHeaderBar: React.FC<{
  slidesCount: number;
  slideW: number;
  slideH: number;
  totalWidth: number;
  zoom: number;
}> = ({ slidesCount, slideW, slideH, totalWidth, zoom }) => (
  <div
    className="flex items-center mb-2"
    style={{ width: `${totalWidth * zoom}px` }}
  >
    {Array.from({ length: slidesCount }).map((_, idx) => (
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
);

const CanvasAddSlideButton: React.FC<{
  slidesCount: number;
  onAddSlide: () => void;
}> = ({ slidesCount, onAddSlide }) =>
  slidesCount < MAX_SLIDES ? (
    <button
      type="button"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onAddSlide();
      }}
      title={`Adicionar novo quadro (${slidesCount + 1}/${MAX_SLIDES})`}
      aria-label="Adicionar novo quadro"
      className="btn-press w-13 shrink-0 rounded-xl border border-dashed border-zinc-700 hover:border-accent bg-studio-panel/50 hover:bg-accent/10 text-zinc-400 hover:text-accent flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer"
    >
      <div className="w-8 h-8 rounded-full bg-studio-card border border-studio-border flex items-center justify-center shadow-xs">
        <Plus className="w-4 h-4" />
      </div>
      <span className="text-[10px] font-mono">
        +{String(slidesCount + 1).padStart(2, '0')}
      </span>
    </button>
  ) : null;

export const PanoramicCanvas: React.FC<PanoramicCanvasProps> = React.memo(
  ({
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
    onAddSlide,
  }) => {
    const [isDraggingFileOver, setIsDraggingFileOver] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const stageWrapperRef = useRef<HTMLDivElement>(null);

    const currentFormat = INSTAGRAM_FORMATS[project.formatId];
    const slideW = currentFormat.width;
    const slideH = currentFormat.height;
    const totalWidth = slideW * project.slidesCount;
    const totalHeight = slideH;

    const {
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
    } = useCanvasInteractions({
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
    });

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
    const selectedDisplayLayer =
      displayLayers.find((l) => l.id === selectedLayerId) || null;

    return (
      <main
        ref={containerRef}
        tabIndex={0}
        onScroll={handleContainerScroll}
        onWheel={(e) => {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setZoom((z) =>
              Math.max(0.12, Math.min(1.5, +(z - e.deltaY * 0.0015).toFixed(2)))
            );
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (e.dataTransfer.types.includes('Files')) setIsDraggingFileOver(true);
        }}
        onDragLeave={() => setIsDraggingFileOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingFileOver(false);
          const dropPt = clientToCanvasPoint(e.clientX, e.clientY);
          if (dropPt) onUpdateLastClickedPoint(dropPt);
          if (e.dataTransfer.files?.length) {
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
            width: `${
              totalWidth * zoom + (project.slidesCount < MAX_SLIDES ? 104 : 40)
            }px`,
            height: `${totalHeight * zoom + 88}px`,
            padding: '44px 20px 20px 20px',
          }}
        >
          <CanvasSlideHeaderBar
            slidesCount={project.slidesCount}
            slideW={slideW}
            slideH={slideH}
            totalWidth={totalWidth}
            zoom={zoom}
          />

          <div className="flex items-stretch gap-3">
            <div
              ref={stageWrapperRef}
              className="relative shadow-2xl ring-1 ring-white/10 shrink-0"
              style={{
                width: `${totalWidth * zoom}px`,
                height: `${totalHeight * zoom}px`,
              }}
            >
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
                {visibleLayers.map((layer) => (
                  <CanvasLayerNode
                    key={layer.id}
                    layer={layer}
                    isSelected={layer.id === selectedLayerId}
                    isDragging={dragState?.layerId === layer.id}
                    onStartMove={(e, targetLayer) =>
                      startInteraction(e, targetLayer, 'move')
                    }
                    onSelect={onSelectLayer}
                    onOpenCrop={onOpenCropModal}
                  />
                ))}

                {project.showSeamGuides &&
                  Array.from({ length: project.slidesCount - 1 }).map((_, idx) => (
                    <div
                      key={idx}
                      style={{ left: `${(idx + 1) * slideW}px` }}
                      className="absolute top-0 bottom-0 w-0 border-l-2 border-dashed border-white/35 pointer-events-none z-40"
                    />
                  ))}
              </div>

              <div
                style={{
                  width: `${totalWidth}px`,
                  height: `${totalHeight}px`,
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                }}
                className="absolute inset-0 pointer-events-none overflow-visible z-50"
              >
                <CanvasGuidesOverlay
                  activeSnapX={activeSnapX}
                  activeSnapY={activeSnapY}
                  lastClickedPoint={lastClickedPoint}
                  selectedLayerId={selectedLayerId}
                  invScale={invScale}
                />

                {selectedDisplayLayer && (
                  <CanvasSelectionOverlay
                    layer={selectedDisplayLayer}
                    invScale={invScale}
                    spannedSlidesBadge={getSpannedSlidesBadge(selectedDisplayLayer)}
                    onStartInteraction={startInteraction}
                    onPointerMove={handlePointerMove}
                    onEndInteraction={endInteraction}
                    onUpdateLayer={onUpdateLayer}
                    onOpenCropModal={onOpenCropModal}
                    onDuplicateLayer={onDuplicateLayer}
                    onDeleteLayer={onDeleteLayer}
                  />
                )}
              </div>
            </div>

            <CanvasAddSlideButton
              slidesCount={project.slidesCount}
              onAddSlide={onAddSlide}
            />
          </div>
        </div>
      </main>
    );
  }
);
