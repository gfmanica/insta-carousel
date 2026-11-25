import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Download,
  Archive,
  CheckSquare,
  Square,
} from 'lucide-react';
import type {
  CarouselProject,
  ExportImageFormat,
} from '../types/carousel';
import { INSTAGRAM_FORMATS } from '../types/carousel';
import {
  renderSlideToCanvas,
  canvasToBlob,
  formatBytes,
  getExtensionForMime,
  exportSlidesAsZip,
  triggerBlobDownload,
} from '../utils/canvasExport';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: CarouselProject;
}

interface SlidePreviewItem {
  slideIndex: number;
  dataUrl: string;
  blob: Blob;
  sizeBytes: number;
}

interface ExportSettingsPanelProps {
  format: ExportImageFormat;
  setFormat: (f: ExportImageFormat) => void;
  quality: number;
  setQuality: (q: number) => void;
  scale: number;
  setScale: (s: number) => void;
  baseWidth: number;
  baseHeight: number;
  selectedCount: number;
  totalSelectedBytes: number;
  isRendering: boolean;
}

const ExportSettingsPanel: React.FC<ExportSettingsPanelProps> = ({
  format,
  setFormat,
  quality,
  setQuality,
  scale,
  setScale,
  baseWidth,
  baseHeight,
  selectedCount,
  totalSelectedBytes,
  isRendering,
}) => (
  <div className="md:col-span-5 space-y-4 bg-studio-panel p-4 rounded-lg border border-studio-border">
    <div className="space-y-1.5">
      <span
        id="export-format-label"
        className="block text-xs font-medium text-zinc-300"
      >
        Formato de arquivo
      </span>
      <div
        role="group"
        aria-labelledby="export-format-label"
        className="grid grid-cols-3 gap-1.5"
      >
        {(
          [
            { id: 'image/jpeg', label: 'JPG', desc: 'Padrão' },
            { id: 'image/webp', label: 'WebP', desc: 'Otimizado' },
            { id: 'image/png', label: 'PNG', desc: 'Sem perdas' },
          ] as const
        ).map((fmt) => (
          <button
            key={fmt.id}
            type="button"
            onClick={() => setFormat(fmt.id)}
            className={`btn-press p-2 rounded-md border text-center transition-colors ${
              format === fmt.id
                ? 'bg-accent/15 border-accent text-white'
                : 'bg-studio-card border-studio-border text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <div className="text-xs font-semibold">{fmt.label}</div>
            <div className="text-[10px] text-zinc-500">{fmt.desc}</div>
          </button>
        ))}
      </div>
    </div>

    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label
          htmlFor="export-quality-range"
          className="text-xs font-medium text-zinc-300"
        >
          Qualidade de compressão
        </label>
        <span className="text-xs font-mono text-zinc-200">
          {format === 'image/png'
            ? '100% (Lossless)'
            : `${Math.round(quality * 100)}%`}
        </span>
      </div>

      {format === 'image/png' ? (
        <p className="text-[11px] text-zinc-400 bg-studio-card p-2.5 rounded-md border border-studio-border">
          PNG preserva todos os pixels sem compressão com perdas. Use JPG ou WebP para ajustar o peso do arquivo.
        </p>
      ) : (
        <>
          <input
            id="export-quality-range"
            type="range"
            min={0.1}
            max={1}
            step={0.02}
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="w-full cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
            <span>10%</span>
            <span>85%</span>
            <span>100%</span>
          </div>
        </>
      )}
    </div>

    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span
          id="export-scale-label"
          className="text-xs font-medium text-zinc-300"
        >
          Escala de resolução
        </span>
        <span className="text-[11px] font-mono text-zinc-400">
          {Math.round(baseWidth * scale)}×{Math.round(baseHeight * scale)}px
        </span>
      </div>
      <div
        role="group"
        aria-labelledby="export-scale-label"
        className="grid grid-cols-3 gap-1.5"
      >
        {[
          { val: 0.5, label: '0.5x' },
          { val: 1, label: '1x (1080p)' },
          { val: 2, label: '2x (2160p)' },
        ].map((s) => (
          <button
            key={s.val}
            type="button"
            onClick={() => setScale(s.val)}
            className={`btn-press py-1.5 px-2 rounded-md border text-xs font-mono ${
              scale === s.val
                ? 'bg-accent/15 border-accent text-white'
                : 'bg-studio-card border-studio-border text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>

    <div className="p-3 rounded-md bg-studio-card border border-studio-border flex items-center justify-between">
      <span className="text-xs text-zinc-400">
        Tamanho estimado ({selectedCount})
      </span>
      <span className="text-xs font-mono font-semibold text-white">
        {isRendering ? 'Calculando...' : formatBytes(totalSelectedBytes)}
      </span>
    </div>
  </div>
);

interface ExportSlideGridProps {
  slidesCount: number;
  selectedSlides: number[];
  previews: SlidePreviewItem[];
  onToggleAll: () => void;
  onToggleSlide: (idx: number) => void;
  onDownloadSingle: (item: SlidePreviewItem) => void;
}

const ExportSlideGrid: React.FC<ExportSlideGridProps> = ({
  slidesCount,
  selectedSlides,
  previews,
  onToggleAll,
  onToggleSlide,
  onDownloadSingle,
}) => {
  const selectedSlideSet = new Set(selectedSlides);
  return (
  <div className="md:col-span-7 flex flex-col space-y-2.5">
    <div className="flex items-center justify-between">
      <h3 className="text-xs font-medium text-zinc-400">
        Quadros ({slidesCount})
      </h3>
      <button
        type="button"
        onClick={onToggleAll}
        className="text-xs text-accent hover:underline font-medium"
      >
        {selectedSlides.length === slidesCount
          ? 'Desmarcar todos'
          : 'Selecionar todos'}
      </button>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
      {previews.map((item) => {
        const isChecked = selectedSlideSet.has(item.slideIndex);
        return (
          <div
            key={item.slideIndex}
            className={`rounded-lg p-2 border transition-colors flex flex-col gap-2 ${
              isChecked
                ? 'bg-studio-panel border-zinc-600'
                : 'bg-studio-card/40 border-studio-border opacity-50'
            }`}
          >
            <button
              type="button"
              aria-pressed={isChecked}
              aria-label={`Alternar seleção do Quadro ${item.slideIndex + 1}`}
              onClick={() => onToggleSlide(item.slideIndex)}
              className="relative rounded overflow-hidden bg-studio-bg border border-studio-border cursor-pointer aspect-square flex items-center justify-center w-full"
            >
              <img
                src={item.dataUrl}
                alt={`Quadro ${item.slideIndex + 1}`}
                className="max-w-full max-h-full object-contain"
              />
              <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/75 text-[10px] font-mono text-zinc-200">
                {String(item.slideIndex + 1).padStart(2, '0')}
              </div>
              <div className="absolute top-1.5 right-1.5 text-white bg-black/70 rounded p-0.5">
                {isChecked ? (
                  <CheckSquare className="w-3.5 h-3.5 text-accent" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-zinc-400" />
                )}
              </div>
            </button>

            <div className="flex items-center justify-between text-[11px]">
              <span className="font-mono text-zinc-400">
                {formatBytes(item.sizeBytes)}
              </span>
              <button
                type="button"
                onClick={() => onDownloadSingle(item)}
                className="btn-press px-2 py-0.5 rounded bg-studio-card hover:bg-studio-hover text-zinc-200 font-medium border border-studio-border"
              >
                Baixar
              </button>
            </div>
          </div>
        );
      })}
    </div>
  </div>
  );
};

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  project,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [format, setFormat] = useState<ExportImageFormat>('image/jpeg');
  const [quality, setQuality] = useState<number>(0.92);
  const [scale, setScale] = useState<number>(1);
  const [selectedSlides, setSelectedSlides] = useState<number[]>([]);
  const [previews, setPreviews] = useState<SlidePreviewItem[]>([]);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);

  const currentInstaFormat = INSTAGRAM_FORMATS[project.formatId];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
      setSelectedSlides(
        Array.from({ length: project.slidesCount }, (_, idx) => idx)
      );
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen, project.slidesCount]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = '';
      onClose();
    };
    dialog.addEventListener('close', handleClose);

    const needsBackdropFallback = !('closedBy' in HTMLDialogElement.prototype);
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
    if (needsBackdropFallback) {
      dialog.addEventListener('click', handleBackdropClick);
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
      if (needsBackdropFallback) {
        dialog.removeEventListener('click', handleBackdropClick);
      }
    };
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const createdUrls: string[] = [];

    const generatePreviews = async () => {
      setIsRendering(true);
      const rendered = await Promise.all(
        Array.from({ length: project.slidesCount }, async (_, i) => {
          const canvas = await renderSlideToCanvas(project, i, scale);
          const blob = await canvasToBlob(canvas, format, quality);
          return { slideIndex: i, blob, sizeBytes: blob.size };
        })
      );
      if (cancelled) return;
      const items: SlidePreviewItem[] = [];
      for (const r of rendered) {
        const dataUrl = URL.createObjectURL(r.blob);
        createdUrls.push(dataUrl);
        items.push({ ...r, dataUrl });
      }
      setPreviews(items);
      setIsRendering(false);
    };

    const timer = setTimeout(generatePreviews, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      for (const url of createdUrls) {
        URL.revokeObjectURL(url);
      }
    };
  }, [isOpen, project, format, quality, scale]);

  const toggleSlideSelection = (idx: number) => {
    setSelectedSlides((prev) =>
      prev.includes(idx)
        ? prev.filter((item) => item !== idx)
        : [...prev, idx].sort((a, b) => a - b)
    );
  };

  const handleDownloadSingle = (item: SlidePreviewItem) => {
    const ext = getExtensionForMime(format);
    const safeTitle = (project.title || 'carrossel')
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-');
    const num = String(item.slideIndex + 1).padStart(2, '0');
    triggerBlobDownload(item.blob, `${safeTitle}-quadro-${num}.${ext}`);
  };

  const handleDownloadAllZip = async () => {
    if (selectedSlides.length === 0) return;
    setIsExportingZip(true);
    try {
      const { blob, filename } = await exportSlidesAsZip(
        project,
        selectedSlides,
        format,
        quality,
        scale
      );
      triggerBlobDownload(blob, filename);
    } finally {
      setIsExportingZip(false);
    }
  };

  const selectedSlideSet = useMemo(
    () => new Set(selectedSlides),
    [selectedSlides]
  );

  const handleDownloadAllIndividual = () => {
    previews
      .filter((p) => selectedSlideSet.has(p.slideIndex))
      .forEach((p, idx) => {
        setTimeout(() => handleDownloadSingle(p), idx * 180);
      });
  };

  const totalSelectedBytes = previews
    .filter((p) => selectedSlideSet.has(p.slideIndex))
    .reduce((acc, p) => acc + p.sizeBytes, 0);

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: 'any' } as React.DialogHTMLAttributes<HTMLDialogElement>)}
      aria-labelledby="export-dialog-title"
      className="w-[95vw] max-w-[880px]"
    >
      <div className="flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-studio-border flex items-center justify-between bg-studio-panel">
          <div>
            <h2
              id="export-dialog-title"
              className="text-sm font-semibold text-white"
            >
              Exportar Quadros
            </h2>
            <p className="text-xs text-zinc-400">
              Configure o formato, resolução e compressão para publicação
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

        {/* Body */}
        <div className="p-3 sm:p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 bg-studio-bg">
          <ExportSettingsPanel
            format={format}
            setFormat={setFormat}
            quality={quality}
            setQuality={setQuality}
            scale={scale}
            setScale={setScale}
            baseWidth={currentInstaFormat.width}
            baseHeight={currentInstaFormat.height}
            selectedCount={selectedSlides.length}
            totalSelectedBytes={totalSelectedBytes}
            isRendering={isRendering}
          />

          <ExportSlideGrid
            slidesCount={project.slidesCount}
            selectedSlides={selectedSlides}
            previews={previews}
            onToggleAll={() =>
              setSelectedSlides(
                selectedSlides.length === project.slidesCount
                  ? []
                  : Array.from({ length: project.slidesCount }, (_, i) => i)
              )
            }
            onToggleSlide={toggleSlideSelection}
            onDownloadSingle={handleDownloadSingle}
          />
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-studio-border bg-studio-panel flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="btn-press px-3.5 py-1.5 rounded-lg bg-studio-card hover:bg-studio-hover text-xs font-medium text-zinc-300 border border-studio-border"
          >
            Fechar
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={selectedSlides.length === 0 || isRendering}
              onClick={handleDownloadAllIndividual}
              className="btn-press px-3.5 py-1.5 rounded-lg bg-studio-card hover:bg-studio-hover disabled:opacity-40 text-xs font-medium text-zinc-200 border border-studio-border flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Arquivos separados ({selectedSlides.length})</span>
            </button>

            <button
              type="button"
              disabled={selectedSlides.length === 0 || isExportingZip || isRendering}
              onClick={handleDownloadAllZip}
              className="btn-press px-4 py-1.5 rounded-lg bg-white hover:bg-zinc-200 disabled:opacity-40 text-xs font-semibold text-zinc-950 flex items-center gap-1.5"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>
                {isExportingZip
                  ? 'Compactando...'
                  : `Baixar .ZIP (${selectedSlides.length})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
};
