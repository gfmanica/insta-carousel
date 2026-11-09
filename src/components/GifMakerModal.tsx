import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Film,
  Play,
  Pause,
  ArrowUp,
  ArrowDown,
  Trash2,
  Clock,
  Download,
  RefreshCw,
  Repeat,
  FolderPlus,
  Check,
  LayoutGrid,
} from 'lucide-react';
import type {
  CarouselProject,
  GifFrameItem,
  ImageAsset,
  ImageLayer,
} from '../types/carousel';
import { INSTAGRAM_FORMATS } from '../types/carousel';
import { renderSlideToCanvas, formatBytes, triggerBlobDownload } from '../utils/canvasExport';
import { generateAnimatedGif } from '../utils/gifGenerator';

interface GifMakerModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: CarouselProject;
  onUpdateProject: (updater: (prev: CarouselProject) => CarouselProject) => void;
  onSelectLayer?: (layerId: string | null) => void;
}

export const GifMakerModal: React.FC<GifMakerModalProps> = ({
  isOpen,
  onClose,
  project,
  onUpdateProject,
  onSelectLayer,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [slideThumbnails, setSlideThumbnails] = useState<Record<number, string>>({});
  const [currentPreviewIdx, setCurrentPreviewIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progressText, setProgressText] = useState<string>('');
  const [generatedGifUrl, setGeneratedGifUrl] = useState<string | null>(null);
  const [generatedGifBlob, setGeneratedGifBlob] = useState<Blob | null>(null);
  const [savedToLibrary, setSavedToLibrary] = useState<boolean>(false);

  const frames = project.gifFrames;
  const currentFormat = INSTAGRAM_FORMATS[project.formatId];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

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

    const buildThumbs = async () => {
      const thumbs: Record<number, string> = {};
      for (let i = 0; i < project.slidesCount; i++) {
        if (cancelled) return;
        const canvas = await renderSlideToCanvas(project, i, 0.35);
        thumbs[i] = canvas.toDataURL('image/jpeg', 0.85);
      }
      if (!cancelled) {
        setSlideThumbnails(thumbs);
      }
    };
    buildThumbs();

    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    project.slidesCount,
    project.layers,
    project.formatId,
    project.backgroundColor,
    project.backgroundGradient,
  ]);

  useEffect(() => {
    if (!isOpen || !isPlaying || frames.length === 0) return;

    const safeIdx = currentPreviewIdx % frames.length;
    const currentFrame = frames[safeIdx];
    const delay = Math.max(50, currentFrame?.delayMs || project.gifDefaultDelayMs || 500);

    const timer = setTimeout(() => {
      setCurrentPreviewIdx((prev) => (prev + 1) % frames.length);
    }, delay);

    return () => clearTimeout(timer);
  }, [isOpen, isPlaying, currentPreviewIdx, frames, project.gifDefaultDelayMs]);

  const getFramePreviewSrc = (frame: GifFrameItem): string => {
    if (frame.sourceType === 'slide' && typeof frame.slideIndex === 'number') {
      return slideThumbnails[frame.slideIndex] || '';
    }
    if (frame.dataUrl) return frame.dataUrl;
    if (frame.assetId) {
      const asset = project.assets.find((a) => a.id === frame.assetId);
      return asset?.dataUrl || '';
    }
    return '';
  };

  const resetGeneratedState = () => {
    setGeneratedGifUrl(null);
    setGeneratedGifBlob(null);
    setSavedToLibrary(false);
  };

  const addSlideFrame = (slideIdx: number) => {
    resetGeneratedState();
    const newItem: GifFrameItem = {
      id: `gif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sourceType: 'slide',
      slideIndex: slideIdx,
      label: `Quadro ${slideIdx + 1}`,
      delayMs: project.gifDefaultDelayMs || 600,
    };
    onUpdateProject((p) => ({
      ...p,
      gifFrames: [...p.gifFrames, newItem],
    }));
  };

  const addAssetFrame = (asset: ImageAsset) => {
    resetGeneratedState();
    const newItem: GifFrameItem = {
      id: `gif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sourceType: 'asset',
      assetId: asset.id,
      dataUrl: asset.dataUrl,
      label: asset.name.replace(/\.[^/.]+$/, ''),
      delayMs: project.gifDefaultDelayMs || 600,
    };
    onUpdateProject((p) => ({
      ...p,
      gifFrames: [...p.gifFrames, newItem],
    }));
  };

  const moveFrame = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= frames.length) return;
    resetGeneratedState();

    onUpdateProject((p) => {
      const copy = [...p.gifFrames];
      const [item] = copy.splice(index, 1);
      copy.splice(targetIdx, 0, item);
      return {
        ...p,
        gifFrames: copy,
      };
    });
  };

  const reverseFramesOrder = () => {
    resetGeneratedState();
    onUpdateProject((p) => ({
      ...p,
      gifFrames: [...p.gifFrames].reverse(),
    }));
  };

  const removeFrame = (id: string) => {
    resetGeneratedState();
    onUpdateProject((p) => ({
      ...p,
      gifFrames: p.gifFrames.filter((f) => f.id !== id),
    }));
  };

  const updateFrameDelay = (id: string, delayMs: number) => {
    resetGeneratedState();
    onUpdateProject((p) => ({
      ...p,
      gifFrames: p.gifFrames.map((f) =>
        f.id === id ? { ...f, delayMs: Math.max(50, delayMs) } : f
      ),
    }));
  };

  const applyGlobalDelayToAll = (newDelayMs: number) => {
    resetGeneratedState();
    const clamped = Math.max(50, newDelayMs);
    onUpdateProject((p) => ({
      ...p,
      gifDefaultDelayMs: clamped,
      gifFrames: p.gifFrames.map((f) => ({ ...f, delayMs: clamped })),
    }));
  };

  const handleGenerateGif = async () => {
    if (frames.length === 0) return;
    setIsGenerating(true);
    setSavedToLibrary(false);
    setProgressText('Codificando GIF...');

    try {
      const blob = await generateAnimatedGif({
        project,
        frames,
        targetWidth: project.gifWidth || 720,
        loop: project.gifLoop,
        onProgress: (curr, total) => {
          setProgressText(`Frame ${curr}/${total}...`);
        },
      });

      if (generatedGifUrl) URL.revokeObjectURL(generatedGifUrl);
      const url = URL.createObjectURL(blob);
      setGeneratedGifBlob(blob);
      setGeneratedGifUrl(url);
    } catch (err) {
      console.error('Erro ao gerar GIF:', err);
    } finally {
      setIsGenerating(false);
      setProgressText('');
    }
  };

  const handleDownloadGif = () => {
    if (!generatedGifBlob) return;
    const safeTitle = (project.title || 'carrossel')
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-');
    triggerBlobDownload(generatedGifBlob, `${safeTitle}.gif`);
  };

  // Save generated GIF into the browser image library (project.assets) and optionally place on canvas
  const handleSaveToAssetBank = (alsoInsertOnCanvas = false) => {
    if (!generatedGifBlob) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) return;

      const gifW = Math.round(project.gifWidth || 720);
      const gifH = Math.round(gifW * (currentFormat.height / currentFormat.width));
      const assetId = `asset-gif-${Date.now()}`;
      const safeTitle = (project.title || 'animacao')
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, '-');
      const assetName = `${safeTitle}-${frames.length}f.gif`;

      const newAsset: ImageAsset = {
        id: assetId,
        name: assetName,
        dataUrl,
        naturalWidth: gifW,
        naturalHeight: gifH,
        createdAt: Date.now(),
      };

      const layerId = `layer-gif-${Date.now()}`;

      onUpdateProject((prev) => {
        const nextAssets = [newAsset, ...prev.assets];
        if (!alsoInsertOnCanvas) {
          return {
            ...prev,
            assets: nextAssets,
          };
        }

        const maxZ = prev.layers.reduce((m, l) => Math.max(m, l.zIndex), 0);
        const maxInitDim = Math.min(currentFormat.width * 0.72, 800);
        const ratio = gifW / Math.max(1, gifH);
        let w = maxInitDim;
        let h = maxInitDim / ratio;
        if (h > currentFormat.height * 0.78) {
          h = currentFormat.height * 0.78;
          w = h * ratio;
        }

        const xPos =
          prev.slidesCount > 1
            ? Math.round(currentFormat.width - w / 2)
            : Math.round((currentFormat.width - w) / 2);
        const yPos = Math.round((currentFormat.height - h) / 2);

        const newLayer: ImageLayer = {
          id: layerId,
          type: 'image',
          assetId,
          name: assetName.replace(/\.gif$/i, ''),
          dataUrl,
          naturalWidth: gifW,
          naturalHeight: gifH,
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
          assets: nextAssets,
          layers: [...prev.layers, newLayer],
        };
      });

      setSavedToLibrary(true);

      if (alsoInsertOnCanvas) {
        onSelectLayer?.(layerId);
        dialogRef.current?.close();
      }
    };

    reader.readAsDataURL(generatedGifBlob);
  };

  const activePreviewFrame =
    frames.length > 0 ? frames[currentPreviewIdx % frames.length] : null;

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: 'any' } as React.DialogHTMLAttributes<HTMLDialogElement>)}
      aria-labelledby="gif-dialog-title"
      className="w-[95vw] max-w-[960px]"
    >
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-studio-border flex items-center justify-between bg-studio-panel">
          <div>
            <h2 id="gif-dialog-title" className="text-sm font-semibold text-white">
              Criar GIF Animado
            </h2>
            <p className="text-xs text-zinc-400">
              Selecione quadros ou imagens da biblioteca, ordene a sequência e defina o intervalo em milissegundos
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
        <div className="p-5 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-5 bg-studio-bg">
          {/* Left Column (7 cols): Sources + Sequence */}
          <div className="lg:col-span-7 space-y-4">
            {/* Source Picker */}
            <div className="bg-studio-panel p-4 rounded-lg border border-studio-border space-y-3">
              <h3 className="text-xs font-medium text-zinc-300">
                Adicionar à sequência
              </h3>

              <div className="space-y-1.5">
                <span className="text-[11px] text-zinc-500 block">
                  Quadros do carrossel:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: project.slidesCount }).map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => addSlideFrame(idx)}
                      className="btn-press flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-studio-card hover:bg-studio-hover border border-studio-border text-xs text-zinc-200"
                    >
                      {slideThumbnails[idx] && (
                        <img
                          src={slideThumbnails[idx]}
                          alt=""
                          className="w-5 h-5 rounded-xs object-cover"
                        />
                      )}
                      <span>+ Quadro {idx + 1}</span>
                    </button>
                  ))}
                </div>
              </div>

              {project.assets.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-studio-border">
                  <span className="text-[11px] text-zinc-500 block">
                    Biblioteca de imagens:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {project.assets.map((asset) => (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => addAssetFrame(asset)}
                        className="btn-press flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-studio-card hover:bg-studio-hover border border-studio-border text-xs text-zinc-300 max-w-[180px]"
                      >
                        <img
                          src={asset.dataUrl}
                          alt=""
                          className="w-5 h-5 rounded-xs object-cover shrink-0"
                        />
                        <span className="truncate">+ {asset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Frame Sequence & Timing */}
            <div className="bg-studio-panel p-4 rounded-lg border border-studio-border space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium text-zinc-300">
                  Ordem e tempo por imagem ({frames.length})
                </h3>

                <button
                  type="button"
                  onClick={reverseFramesOrder}
                  disabled={frames.length < 2}
                  className="btn-press px-2 py-1 rounded bg-studio-card hover:bg-studio-hover disabled:opacity-30 text-[11px] font-medium text-zinc-300 border border-studio-border flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Inverter ordem</span>
                </button>
              </div>

              {/* Global Tempo Slider */}
              <div className="bg-studio-card p-2.5 rounded-md border border-studio-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs text-zinc-300">
                  Intervalo global (todos os frames)
                </span>

                <div className="flex items-center gap-2.5">
                  <input
                    type="range"
                    min={100}
                    max={2500}
                    step={50}
                    value={project.gifDefaultDelayMs || 600}
                    onChange={(e) =>
                      applyGlobalDelayToAll(Number(e.target.value))
                    }
                    className="w-28 cursor-pointer"
                  />
                  <span className="text-xs font-mono text-zinc-200 bg-studio-panel px-2 py-0.5 rounded border border-studio-border w-18 text-center">
                    {project.gifDefaultDelayMs || 600} ms
                  </span>
                </div>
              </div>

              {/* Reorderable Frame List */}
              {frames.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500 border border-dashed border-studio-border rounded-lg">
                  Adicione quadros ou imagens acima para montar o GIF.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                  {frames.map((frame, idx) => {
                    const thumb = getFramePreviewSrc(frame);
                    const isCurrentPreview =
                      frames.length > 0 &&
                      currentPreviewIdx % frames.length === idx;

                    return (
                      <div
                        key={frame.id}
                        className={`p-2 rounded-md border flex items-center justify-between gap-2.5 transition-colors ${
                          isCurrentPreview
                            ? 'bg-accent/10 border-accent/40'
                            : 'bg-studio-card border-studio-border'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="w-5 text-[11px] font-mono text-zinc-500 text-center shrink-0">
                            {String(idx + 1).padStart(2, '0')}
                          </span>

                          <div className="w-9 h-9 rounded-xs bg-studio-bg border border-studio-border overflow-hidden shrink-0 flex items-center justify-center">
                            {thumb ? (
                              <img
                                src={thumb}
                                alt={frame.label}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Film className="w-3.5 h-3.5 text-zinc-600" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs font-medium text-zinc-200 truncate">
                              {frame.label}
                            </p>
                          </div>
                        </div>

                        {/* Individual Frame Duration (ms) */}
                        <label className="flex items-center gap-1 bg-studio-panel px-2 py-1 rounded border border-studio-border focus-within:border-accent">
                          <Clock className="w-3 h-3 text-zinc-500" />
                          <input
                            type="number"
                            min={50}
                            max={10000}
                            step={50}
                            value={frame.delayMs}
                            onChange={(e) =>
                              updateFrameDelay(frame.id, Number(e.target.value))
                            }
                            aria-label={`Tempo da imagem ${idx + 1} em ms`}
                            className="w-13 bg-transparent text-xs font-mono text-zinc-100 text-right focus:outline-none"
                          />
                          <span className="text-[10px] font-mono text-zinc-500">
                            ms
                          </span>
                        </label>

                        {/* Reorder Up/Down & Delete */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveFrame(idx, -1)}
                            title="Subir na ordem"
                            className="btn-press p-1 rounded bg-studio-panel hover:bg-studio-hover disabled:opacity-30 text-zinc-300 border border-studio-border"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === frames.length - 1}
                            onClick={() => moveFrame(idx, 1)}
                            title="Descer na ordem"
                            className="btn-press p-1 rounded bg-studio-panel hover:bg-studio-hover disabled:opacity-30 text-zinc-300 border border-studio-border"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFrame(frame.id)}
                            title="Remover frame"
                            className="btn-press p-1 rounded hover:bg-red-500/20 text-zinc-400 hover:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (5 cols): Live Preview & Export */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-studio-panel p-4 rounded-lg border border-studio-border space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium text-zinc-300">
                  Pré-visualização
                </h3>
                <button
                  type="button"
                  onClick={() => setIsPlaying((p) => !p)}
                  className="btn-press px-2 py-1 rounded bg-studio-card hover:bg-studio-hover text-xs font-medium text-zinc-200 border border-studio-border flex items-center gap-1.5"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3 h-3 text-zinc-400" />
                      <span>Pausar</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 text-zinc-200" />
                      <span>Reproduzir</span>
                    </>
                  )}
                </button>
              </div>

              {/* Animated Preview Stage */}
              <div className="aspect-square rounded-lg bg-studio-bg border border-studio-border overflow-hidden relative flex items-center justify-center">
                {generatedGifUrl ? (
                  <img
                    src={generatedGifUrl}
                    alt="GIF Gerado"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : activePreviewFrame ? (
                  <img
                    src={getFramePreviewSrc(activePreviewFrame)}
                    alt={activePreviewFrame.label}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <p className="text-xs text-zinc-500">Sem frames</p>
                )}

                {activePreviewFrame && !generatedGifUrl && (
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between px-2.5 py-1 rounded bg-black/75 text-[11px] font-mono text-zinc-200">
                    <span>
                      {(currentPreviewIdx % frames.length) + 1}/{frames.length} •{' '}
                      {activePreviewFrame.label}
                    </span>
                    <span>{activePreviewFrame.delayMs}ms</span>
                  </div>
                )}
              </div>

              {/* Resolution & Loop Settings */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-studio-card p-2 rounded-md border border-studio-border">
                  <label className="block text-[10px] text-zinc-400 mb-1">
                    Resolução
                  </label>
                  <select
                    value={project.gifWidth || 720}
                    onChange={(e) => {
                      resetGeneratedState();
                      onUpdateProject((p) => ({
                        ...p,
                        gifWidth: Number(e.target.value),
                      }));
                    }}
                    className="w-full bg-studio-panel text-xs font-mono text-zinc-200 p-1 rounded border border-studio-border focus:outline-none"
                  >
                    <option value={480}>
                      480×
                      {Math.round(480 * (currentFormat.height / currentFormat.width))}
                    </option>
                    <option value={720}>
                      720×
                      {Math.round(720 * (currentFormat.height / currentFormat.width))}
                    </option>
                    <option value={1080}>1080×{currentFormat.height}</option>
                  </select>
                </div>

                <div className="bg-studio-card p-2 rounded-md border border-studio-border flex flex-col justify-between">
                  <span className="block text-[10px] text-zinc-400">
                    Repetição
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      resetGeneratedState();
                      onUpdateProject((p) => ({
                        ...p,
                        gifLoop: !p.gifLoop,
                      }));
                    }}
                    className={`btn-press py-1 px-2 rounded text-xs font-medium flex items-center justify-center gap-1.5 border ${
                      project.gifLoop
                        ? 'bg-accent/15 border-accent/40 text-accent'
                        : 'bg-studio-panel border-studio-border text-zinc-400'
                    }`}
                  >
                    <Repeat className="w-3 h-3" />
                    <span>{project.gifLoop ? 'Loop contínuo' : '1 vez'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Generate, Save to Image Bank & Download Buttons */}
            <div className="space-y-2 pt-3 border-t border-studio-border">
              <button
                type="button"
                disabled={frames.length === 0 || isGenerating}
                onClick={handleGenerateGif}
                className="btn-press w-full py-2 px-4 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs disabled:opacity-40 flex items-center justify-center gap-1.5"
              >
                <Film className="w-3.5 h-3.5" />
                <span>
                  {isGenerating
                    ? progressText || 'Renderizando...'
                    : generatedGifUrl
                    ? 'Regerar GIF'
                    : 'Gerar arquivo .GIF'}
                </span>
              </button>

              {generatedGifBlob && (
                <div className="space-y-1.5 pt-1">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      disabled={savedToLibrary}
                      onClick={() => handleSaveToAssetBank(false)}
                      className={`btn-press py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border transition-colors ${
                        savedToLibrary
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                          : 'bg-studio-card hover:bg-studio-hover border-studio-border text-zinc-100'
                      }`}
                    >
                      {savedToLibrary ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Salvo no Banco</span>
                        </>
                      ) : (
                        <>
                          <FolderPlus className="w-3.5 h-3.5 text-accent" />
                          <span>Salvar no Banco</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSaveToAssetBank(true)}
                      title="Salva na biblioteca de imagens e já posiciona no carrossel"
                      className="btn-press py-2 px-3 rounded-lg bg-studio-card hover:bg-studio-hover border border-studio-border text-zinc-100 text-xs font-medium flex items-center justify-center gap-1.5"
                    >
                      <LayoutGrid className="w-3.5 h-3.5 text-accent" />
                      <span>Usar no Canvas</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadGif}
                    className="btn-press w-full py-2 px-4 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold text-xs flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>
                      Baixar GIF ({formatBytes(generatedGifBlob.size)})
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
};
