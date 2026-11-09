import React, { useEffect, useRef, useState } from 'react';
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

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const generatePreviews = async () => {
      setIsRendering(true);
      const items: SlidePreviewItem[] = [];
      for (let i = 0; i < project.slidesCount; i++) {
        if (cancelled) return;
        const canvas = await renderSlideToCanvas(project, i, scale);
        const blob = await canvasToBlob(canvas, format, quality);
        const dataUrl = URL.createObjectURL(blob);
        items.push({
          slideIndex: i,
          dataUrl,
          blob,
          sizeBytes: blob.size,
        });
      }
      if (!cancelled) {
        setPreviews((old) => {
          old.forEach((p) => URL.revokeObjectURL(p.dataUrl));
          return items;
        });
        setIsRendering(false);
      }
    };

    const timer = setTimeout(generatePreviews, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
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

  const handleDownloadAllIndividual = () => {
    previews
      .filter((p) => selectedSlides.includes(p.slideIndex))
      .forEach((p, idx) => {
        setTimeout(() => handleDownloadSingle(p), idx * 180);
      });
  };

  const totalSelectedBytes = previews
    .filter((p) => selectedSlides.includes(p.slideIndex))
    .reduce((acc, p) => acc + p.sizeBytes, 0);

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: 'any' } as React.DialogHTMLAttributes<HTMLDialogElement>)}
      aria-labelledby="export-dialog-title"
      className="w-[880px]"
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
        <div className="p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-5 bg-studio-bg">
          {/* Left Column: Quality & Format Controls */}
          <div className="md:col-span-5 space-y-4 bg-studio-panel p-4 rounded-lg border border-studio-border">
            {/* Image Format */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-300">
                Formato de arquivo
              </label>
              <div className="grid grid-cols-3 gap-1.5">
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

            {/* Compression Quality Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-300">
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

            {/* Resolution Multiplier */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-300">
                  Escala de resolução
                </label>
                <span className="text-[11px] font-mono text-zinc-400">
                  {Math.round(currentInstaFormat.width * scale)}×
                  {Math.round(currentInstaFormat.height * scale)}px
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
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

            {/* Total Estimated Size Summary */}
            <div className="p-3 rounded-md bg-studio-card border border-studio-border flex items-center justify-between">
              <span className="text-xs text-zinc-400">
                Tamanho estimado ({selectedSlides.length})
              </span>
              <span className="text-xs font-mono font-semibold text-white">
                {isRendering ? 'Calculando...' : formatBytes(totalSelectedBytes)}
              </span>
            </div>
          </div>

          {/* Right Column: Individual Slide Previews */}
          <div className="md:col-span-7 flex flex-col space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium text-zinc-400">
                Quadros ({project.slidesCount})
              </h3>
              <button
                type="button"
                onClick={() =>
                  setSelectedSlides(
                    selectedSlides.length === project.slidesCount
                      ? []
                      : Array.from({ length: project.slidesCount }, (_, i) => i)
                  )
                }
                className="text-xs text-accent hover:underline font-medium"
              >
                {selectedSlides.length === project.slidesCount
                  ? 'Desmarcar todos'
                  : 'Selecionar todos'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
              {previews.map((item) => {
                const isChecked = selectedSlides.includes(item.slideIndex);
                return (
                  <div
                    key={item.slideIndex}
                    className={`rounded-lg p-2 border transition-colors flex flex-col gap-2 ${
                      isChecked
                        ? 'bg-studio-panel border-zinc-600'
                        : 'bg-studio-card/40 border-studio-border opacity-50'
                    }`}
                  >
                    <div
                      onClick={() => toggleSlideSelection(item.slideIndex)}
                      className="relative rounded overflow-hidden bg-studio-bg border border-studio-border cursor-pointer aspect-square flex items-center justify-center"
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
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono text-zinc-400">
                        {formatBytes(item.sizeBytes)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDownloadSingle(item)}
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
