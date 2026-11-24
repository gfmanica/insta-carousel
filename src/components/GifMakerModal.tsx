import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Film,
  Video,
  Upload,
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
  Scissors,
  Layers,
} from 'lucide-react';
import type {
  CarouselProject,
  GifFrameItem,
  ImageAsset,
  ImageLayer,
} from '../types/carousel';
import { INSTAGRAM_FORMATS } from '../types/carousel';
import { renderSlideToCanvas, formatBytes, triggerBlobDownload } from '../utils/canvasExport';
import {
  generateAnimatedGif,
  generateGifFromVideo,
  extractFramesFromVideo,
  type VideoFitMode,
} from '../utils/gifGenerator';

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
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  const [activeTab, setActiveTab] = useState<'frames' | 'video'>('frames');
  const [slideThumbnails, setSlideThumbnails] = useState<Record<number, string>>({});
  const [currentPreviewIdx, setCurrentPreviewIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isExtractingFrames, setIsExtractingFrames] = useState<boolean>(false);
  const [progressText, setProgressText] = useState<string>('');
  const [generatedGifUrl, setGeneratedGifUrl] = useState<string | null>(null);
  const [generatedGifBlob, setGeneratedGifBlob] = useState<Blob | null>(null);
  const [generatedGifDims, setGeneratedGifDims] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [savedToLibrary, setSavedToLibrary] = useState<boolean>(false);

  // Video-to-GIF state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoStart, setVideoStart] = useState<number>(0);
  const [videoEnd, setVideoEnd] = useState<number>(5);
  const [videoFps, setVideoFps] = useState<number>(10);
  const [videoFitMode, setVideoFitMode] = useState<VideoFitMode>('original');
  const [videoError, setVideoError] = useState<string | null>(null);

  const frames = project.gifFrames;
  const currentFormat = INSTAGRAM_FORMATS[project.formatId];

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  const handleLoadVideoFile = (file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setVideoError('Selecione um arquivo de vídeo válido (MP4, WebM, MOV).');
      return;
    }
    setVideoError(null);
    resetGeneratedState();
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    const nextUrl = URL.createObjectURL(file);
    setVideoFile(file);
    setVideoUrl(nextUrl);
    setVideoStart(0);
    setVideoEnd(5);
    setVideoDuration(0);
  };

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
    setGeneratedGifDims(null);
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
      const targetWidth = project.gifWidth || 720;
      const blob = await generateAnimatedGif({
        project,
        frames,
        targetWidth,
        loop: project.gifLoop,
        onProgress: (curr, total) => {
          setProgressText(`Frame ${curr}/${total}...`);
        },
      });

      if (generatedGifUrl) URL.revokeObjectURL(generatedGifUrl);
      const url = URL.createObjectURL(blob);
      setGeneratedGifBlob(blob);
      setGeneratedGifUrl(url);
      setGeneratedGifDims({
        width: targetWidth,
        height: Math.round(targetWidth * (currentFormat.height / currentFormat.width)),
      });
    } catch (err) {
      console.error('Erro ao gerar GIF:', err);
    } finally {
      setIsGenerating(false);
      setProgressText('');
    }
  };

  const handleGenerateGifFromVideo = async () => {
    if (!videoFile) return;
    setIsGenerating(true);
    setSavedToLibrary(false);
    setVideoError(null);
    setProgressText('Preparando vídeo...');

    try {
      const targetWidth = project.gifWidth || 480;
      const result = await generateGifFromVideo({
        file: videoFile,
        startTime: videoStart,
        endTime: Math.max(videoStart + 0.2, videoEnd),
        fps: videoFps,
        targetWidth,
        targetAspect: currentFormat.height / currentFormat.width,
        fitMode: videoFitMode,
        backgroundColor: project.backgroundColor || '#111113',
        loop: project.gifLoop,
        onProgress: (_curr, _total, stage) => {
          setProgressText(stage);
        },
      });

      if (generatedGifUrl) URL.revokeObjectURL(generatedGifUrl);
      const url = URL.createObjectURL(result.blob);
      setGeneratedGifBlob(result.blob);
      setGeneratedGifUrl(url);
      setGeneratedGifDims({ width: result.width, height: result.height });
    } catch (err) {
      console.error('Erro ao converter vídeo em GIF:', err);
      setVideoError(
        err instanceof Error
          ? err.message
          : 'Erro ao converter vídeo em GIF.'
      );
    } finally {
      setIsGenerating(false);
      setProgressText('');
    }
  };

  const handleExtractVideoFrames = async () => {
    if (!videoFile) return;
    setIsExtractingFrames(true);
    setVideoError(null);
    setProgressText('Extraindo frames...');

    try {
      const extracted = await extractFramesFromVideo(
        videoFile,
        videoStart,
        Math.max(videoStart + 0.2, videoEnd),
        12,
        (curr, total) => setProgressText(`Extraindo ${curr}/${total}...`)
      );
      resetGeneratedState();
      onUpdateProject((p) => ({
        ...p,
        gifFrames: [...p.gifFrames, ...extracted],
      }));
      setActiveTab('frames');
    } catch (err) {
      console.error('Erro ao extrair frames:', err);
      setVideoError('Não foi possível extrair os frames deste vídeo.');
    } finally {
      setIsExtractingFrames(false);
      setProgressText('');
    }
  };

  const handleDownloadGif = () => {
    if (!generatedGifBlob) return;
    const baseName =
      activeTab === 'video' && videoFile
        ? videoFile.name.replace(/\.[^/.]+$/, '')
        : project.title || 'carrossel';
    const safeTitle = baseName.toLowerCase().replace(/[^a-z0-9-_]+/g, '-');
    triggerBlobDownload(generatedGifBlob, `${safeTitle}.gif`);
  };

  // Save generated GIF into the browser image library (project.assets) and optionally place on canvas
  const handleSaveToAssetBank = (alsoInsertOnCanvas = false) => {
    if (!generatedGifBlob) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) return;

      const gifW = generatedGifDims?.width || Math.round(project.gifWidth || 720);
      const gifH =
        generatedGifDims?.height ||
        Math.round(gifW * (currentFormat.height / currentFormat.width));
      const assetId = `asset-gif-${Date.now()}`;
      const baseName =
        activeTab === 'video' && videoFile
          ? videoFile.name.replace(/\.[^/.]+$/, '')
          : project.title || 'animacao';
      const safeTitle = baseName.toLowerCase().replace(/[^a-z0-9-_]+/g, '-');
      const assetName =
        activeTab === 'video'
          ? `${safeTitle}-video.gif`
          : `${safeTitle}-${frames.length}f.gif`;

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
        <div className="px-4 sm:px-5 py-3 border-b border-studio-border flex flex-wrap items-center justify-between gap-2 bg-studio-panel">
          <div className="min-w-0">
            <h2 id="gif-dialog-title" className="text-sm font-semibold text-white">
              Criar GIF Animado
            </h2>
            <p className="text-[11px] sm:text-xs text-zinc-400">
              Monte uma sequência de quadros/imagens ou converta um vídeo em GIF
            </p>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <div className="flex items-center bg-studio-bg p-0.5 rounded-lg border border-studio-border">
              <button
                type="button"
                onClick={() => setActiveTab('frames')}
                className={`btn-press px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  activeTab === 'frames'
                    ? 'bg-studio-card text-white border border-studio-border'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Quadros e Imagens</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('video')}
                className={`btn-press px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  activeTab === 'video'
                    ? 'bg-studio-card text-white border border-studio-border'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Vídeo para GIF</span>
              </button>
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
        </div>

        {/* Body */}
        <div className="p-3 sm:p-5 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 bg-studio-bg">
          {/* Left Column (7 cols): Sources + Sequence OR Video Converter */}
          <div className="lg:col-span-7 space-y-4">
            {activeTab === 'video' ? (
              <div className="bg-studio-panel p-4 rounded-lg border border-studio-border space-y-4">
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    handleLoadVideoFile(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />

                {!videoUrl ? (
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleLoadVideoFile(e.dataTransfer.files?.[0]);
                    }}
                    className="btn-press w-full py-10 px-4 rounded-lg border border-dashed border-zinc-700 hover:border-accent bg-studio-card/50 hover:bg-studio-card flex flex-col items-center justify-center gap-2 text-center transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-accent/15 text-accent flex items-center justify-center">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-zinc-100">
                        Carregar vídeo do dispositivo
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        MP4, WebM ou MOV — 100% processado no navegador
                      </p>
                    </div>
                  </button>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-zinc-200 truncate">
                          {videoFile?.name}
                        </p>
                        <p className="text-[11px] font-mono text-zinc-500">
                          Duração: {videoDuration.toFixed(1)}s • Trecho:{' '}
                          {Math.max(0.1, videoEnd - videoStart).toFixed(1)}s (
                          {Math.min(
                            180,
                            Math.max(
                              2,
                              Math.round(
                                Math.max(0.1, videoEnd - videoStart) * videoFps
                              )
                            )
                          )}{' '}
                          frames)
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => videoInputRef.current?.click()}
                        className="btn-press px-2.5 py-1 rounded-md bg-studio-card hover:bg-studio-hover border border-studio-border text-[11px] font-medium text-zinc-200 shrink-0"
                      >
                        Trocar vídeo
                      </button>
                    </div>

                    <div className="rounded-lg overflow-hidden bg-black border border-studio-border">
                      <video
                        ref={videoPreviewRef}
                        src={videoUrl}
                        controls
                        playsInline
                        muted
                        onLoadedMetadata={(e) => {
                          const dur = e.currentTarget.duration || 0;
                          setVideoDuration(dur);
                          setVideoStart(0);
                          setVideoEnd(Math.min(dur, 6));
                        }}
                        className="w-full max-h-[240px] object-contain mx-auto"
                      />
                    </div>

                    {/* Trim Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-studio-card p-3 rounded-lg border border-studio-border">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-zinc-400 flex items-center gap-1">
                            <Scissors className="w-3 h-3 text-accent" />
                            Início
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-zinc-200">
                              {videoStart.toFixed(1)}s
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const t = videoPreviewRef.current?.currentTime ?? 0;
                                const nextStart = Math.min(t, Math.max(0, videoEnd - 0.2));
                                setVideoStart(+nextStart.toFixed(1));
                                resetGeneratedState();
                              }}
                              className="px-1.5 py-0.5 rounded bg-studio-panel hover:bg-studio-hover text-[10px] text-accent border border-studio-border"
                            >
                              Usar atual
                            </button>
                          </div>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={Math.max(0.2, +(videoDuration - 0.2).toFixed(1))}
                          step={0.1}
                          value={videoStart}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setVideoStart(val);
                            if (val >= videoEnd - 0.2) {
                              setVideoEnd(Math.min(videoDuration, +(val + 0.5).toFixed(1)));
                            }
                            if (videoPreviewRef.current) {
                              videoPreviewRef.current.currentTime = val;
                            }
                            resetGeneratedState();
                          }}
                          className="w-full cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-zinc-400 flex items-center gap-1">
                            <Scissors className="w-3 h-3 text-accent" />
                            Fim
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-zinc-200">
                              {videoEnd.toFixed(1)}s
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const t = videoPreviewRef.current?.currentTime ?? videoDuration;
                                const nextEnd = Math.max(videoStart + 0.2, t);
                                setVideoEnd(+Math.min(videoDuration, nextEnd).toFixed(1));
                                resetGeneratedState();
                              }}
                              className="px-1.5 py-0.5 rounded bg-studio-panel hover:bg-studio-hover text-[10px] text-accent border border-studio-border"
                            >
                              Usar atual
                            </button>
                          </div>
                        </div>
                        <input
                          type="range"
                          min={Math.min(videoDuration, +(videoStart + 0.2).toFixed(1))}
                          max={Math.max(0.5, +videoDuration.toFixed(1))}
                          step={0.1}
                          value={videoEnd}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setVideoEnd(Math.max(videoStart + 0.2, val));
                            if (videoPreviewRef.current) {
                              videoPreviewRef.current.currentTime = val;
                            }
                            resetGeneratedState();
                          }}
                          className="w-full cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* FPS & Fit Mode Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-studio-card p-2.5 rounded-lg border border-studio-border space-y-1.5">
                        <span className="text-[11px] text-zinc-400 block">
                          Taxa de quadros (FPS)
                        </span>
                        <div className="grid grid-cols-5 gap-1">
                          {[6, 8, 10, 12, 15].map((fpsVal) => (
                            <button
                              key={fpsVal}
                              type="button"
                              onClick={() => {
                                setVideoFps(fpsVal);
                                resetGeneratedState();
                              }}
                              className={`btn-press py-1 rounded text-[11px] font-mono border ${
                                videoFps === fpsVal
                                  ? 'bg-accent/15 border-accent text-white'
                                  : 'bg-studio-panel border-studio-border text-zinc-400 hover:text-zinc-200'
                              }`}
                            >
                              {fpsVal}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="bg-studio-card p-2.5 rounded-lg border border-studio-border space-y-1.5">
                        <span className="text-[11px] text-zinc-400 block">
                          Enquadramento
                        </span>
                        <div className="grid grid-cols-3 gap-1">
                          {(
                            [
                              { id: 'original', label: 'Original' },
                              { id: 'cover', label: 'Preencher' },
                              { id: 'contain', label: 'Conter' },
                            ] as const
                          ).map((mode) => (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => {
                                setVideoFitMode(mode.id);
                                resetGeneratedState();
                              }}
                              className={`btn-press py-1 px-1.5 rounded text-[11px] border truncate ${
                                videoFitMode === mode.id
                                  ? 'bg-accent/15 border-accent text-white'
                                  : 'bg-studio-panel border-studio-border text-zinc-400 hover:text-zinc-200'
                              }`}
                            >
                              {mode.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Optional: Extract frames to sequence */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-studio-border">
                      <span className="text-[11px] text-zinc-500">
                        Quer editar ou misturar frames do vídeo com quadros?
                      </span>
                      <button
                        type="button"
                        disabled={isExtractingFrames || isGenerating}
                        onClick={handleExtractVideoFrames}
                        className="btn-press px-2.5 py-1.5 rounded-md bg-studio-card hover:bg-studio-hover border border-studio-border text-[11px] font-medium text-zinc-200 disabled:opacity-40"
                      >
                        {isExtractingFrames
                          ? progressText || 'Extraindo...'
                          : 'Extrair 12 frames para sequência'}
                      </button>
                    </div>
                  </>
                )}

                {videoError && (
                  <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">
                    {videoError}
                  </p>
                )}
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>

          {/* Right Column (5 cols): Live Preview & Export */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-studio-panel p-4 rounded-lg border border-studio-border space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium text-zinc-300">
                  {activeTab === 'video' ? 'Resultado do GIF' : 'Pré-visualização'}
                </h3>
                {activeTab === 'frames' && (
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
                )}
              </div>

              {/* Animated Preview Stage */}
              <div className="aspect-square rounded-lg bg-studio-bg border border-studio-border overflow-hidden relative flex items-center justify-center">
                {generatedGifUrl ? (
                  <img
                    src={generatedGifUrl}
                    alt="GIF Gerado"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : activeTab === 'video' ? (
                  <div className="p-6 text-center space-y-1.5">
                    <Video className="w-7 h-7 text-zinc-600 mx-auto" />
                    <p className="text-xs text-zinc-400">
                      {videoFile
                        ? 'Clique em "Converter vídeo em .GIF" abaixo'
                        : 'Carregue um vídeo à esquerda para gerar o GIF'}
                    </p>
                  </div>
                ) : activePreviewFrame ? (
                  <img
                    src={getFramePreviewSrc(activePreviewFrame)}
                    alt={activePreviewFrame.label}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <p className="text-xs text-zinc-500">Sem frames</p>
                )}

                {activeTab === 'frames' && activePreviewFrame && !generatedGifUrl && (
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between px-2.5 py-1 rounded bg-black/75 text-[11px] font-mono text-zinc-200">
                    <span className="truncate">
                      {(currentPreviewIdx % frames.length) + 1}/{frames.length} •{' '}
                      {activePreviewFrame.label}
                    </span>
                    <span className="shrink-0 ml-2">{activePreviewFrame.delayMs}ms</span>
                  </div>
                )}

                {generatedGifDims && generatedGifUrl && (
                  <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-black/75 text-[10px] font-mono text-zinc-200">
                    {generatedGifDims.width}×{generatedGifDims.height}px
                  </div>
                )}
              </div>

              {/* Resolution & Loop Settings */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-studio-card p-2 rounded-md border border-studio-border">
                  <label className="block text-[10px] text-zinc-400 mb-1">
                    {activeTab === 'video' && videoFitMode === 'original'
                      ? 'Largura máx.'
                      : 'Resolução'}
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
                    <option value={360}>
                      {activeTab === 'video' && videoFitMode === 'original'
                        ? '360px (leve)'
                        : `360×${Math.round(360 * (currentFormat.height / currentFormat.width))}`}
                    </option>
                    <option value={480}>
                      {activeTab === 'video' && videoFitMode === 'original'
                        ? '480px (padrão)'
                        : `480×${Math.round(480 * (currentFormat.height / currentFormat.width))}`}
                    </option>
                    <option value={720}>
                      {activeTab === 'video' && videoFitMode === 'original'
                        ? '720px (alta)'
                        : `720×${Math.round(720 * (currentFormat.height / currentFormat.width))}`}
                    </option>
                    <option value={1080}>
                      {activeTab === 'video' && videoFitMode === 'original'
                        ? '1080px (Full HD)'
                        : `1080×${currentFormat.height}`}
                    </option>
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
                disabled={
                  isGenerating ||
                  isExtractingFrames ||
                  (activeTab === 'video' ? !videoFile : frames.length === 0)
                }
                onClick={
                  activeTab === 'video'
                    ? handleGenerateGifFromVideo
                    : handleGenerateGif
                }
                className="btn-press w-full py-2 px-4 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs disabled:opacity-40 flex items-center justify-center gap-1.5"
              >
                {activeTab === 'video' ? (
                  <Video className="w-3.5 h-3.5" />
                ) : (
                  <Film className="w-3.5 h-3.5" />
                )}
                <span>
                  {isGenerating
                    ? progressText || 'Renderizando...'
                    : generatedGifUrl
                    ? 'Regerar GIF'
                    : activeTab === 'video'
                    ? 'Converter vídeo em .GIF'
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
