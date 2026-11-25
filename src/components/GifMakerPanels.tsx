import React from 'react';
import {
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
} from 'lucide-react';
import type {
  CarouselProject,
  GifFrameItem,
  ImageAsset,
} from '../types/carousel';
import { formatBytes } from '../utils/canvasExport';
import type { VideoFitMode } from '../utils/gifGenerator';

interface VideoToGifPanelProps {
  videoFile: File | null;
  videoUrl: string | null;
  videoDuration: number;
  videoStart: number;
  videoEnd: number;
  videoFps: number;
  videoFitMode: VideoFitMode;
  videoError: string | null;
  isGenerating: boolean;
  isExtractingFrames: boolean;
  progressText: string;
  videoInputRef: React.RefObject<HTMLInputElement | null>;
  videoPreviewRef: React.RefObject<HTMLVideoElement | null>;
  onLoadVideoFile: (file: File | null | undefined) => void;
  onLoadedMetadata: (duration: number) => void;
  onChangeStart: (val: number) => void;
  onChangeEnd: (val: number) => void;
  onChangeFps: (fps: number) => void;
  onChangeFitMode: (mode: VideoFitMode) => void;
  onExtractFrames: () => void;
}

export const VideoToGifPanel: React.FC<VideoToGifPanelProps> = ({
  videoFile,
  videoUrl,
  videoDuration,
  videoStart,
  videoEnd,
  videoFps,
  videoFitMode,
  videoError,
  isGenerating,
  isExtractingFrames,
  progressText,
  videoInputRef,
  videoPreviewRef,
  onLoadVideoFile,
  onLoadedMetadata,
  onChangeStart,
  onChangeEnd,
  onChangeFps,
  onChangeFitMode,
  onExtractFrames,
}) => (
  <div className="bg-studio-panel p-4 rounded-lg border border-studio-border space-y-4">
    <input
      ref={videoInputRef}
      type="file"
      accept="video/*"
      className="hidden"
      onChange={(e) => {
        onLoadVideoFile(e.target.files?.[0]);
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
          onLoadVideoFile(e.dataTransfer.files?.[0]);
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
                  Math.round(Math.max(0.1, videoEnd - videoStart) * videoFps)
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
            onLoadedMetadata={(e) => onLoadedMetadata(e.currentTarget.duration || 0)}
            className="w-full max-h-[240px] object-contain mx-auto"
          />
        </div>

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
                  onClick={() =>
                    onChangeStart(
                      +(
                        Math.min(
                          videoPreviewRef.current?.currentTime ?? 0,
                          Math.max(0, videoEnd - 0.2)
                        )
                      ).toFixed(1)
                    )
                  }
                  className="px-1.5 py-0.5 rounded bg-studio-panel hover:bg-studio-hover text-[10px] text-accent border border-studio-border"
                >
                  Usar atual
                </button>
              </div>
            </div>
            <input
              id="gif-video-start"
              aria-label="Tempo inicial do vídeo"
              type="range"
              min={0}
              max={Math.max(0.2, +(videoDuration - 0.2).toFixed(1))}
              step={0.1}
              value={videoStart}
              onChange={(e) => onChangeStart(Number(e.target.value))}
              className="w-full cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <label
                htmlFor="gif-video-end"
                className="text-zinc-400 flex items-center gap-1"
              >
                <Scissors className="w-3 h-3 text-accent" />
                Fim
              </label>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-zinc-200">
                  {videoEnd.toFixed(1)}s
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onChangeEnd(
                      +Math.min(
                        videoDuration,
                        Math.max(
                          videoStart + 0.2,
                          videoPreviewRef.current?.currentTime ?? videoDuration
                        )
                      ).toFixed(1)
                    )
                  }
                  className="px-1.5 py-0.5 rounded bg-studio-panel hover:bg-studio-hover text-[10px] text-accent border border-studio-border"
                >
                  Usar atual
                </button>
              </div>
            </div>
            <input
              id="gif-video-end"
              type="range"
              min={Math.min(videoDuration, +(videoStart + 0.2).toFixed(1))}
              max={Math.max(0.5, +videoDuration.toFixed(1))}
              step={0.1}
              value={videoEnd}
              onChange={(e) => onChangeEnd(Number(e.target.value))}
              className="w-full cursor-pointer"
            />
          </div>
        </div>

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
                  onClick={() => onChangeFps(fpsVal)}
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
                  onClick={() => onChangeFitMode(mode.id)}
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

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-studio-border">
          <span className="text-[11px] text-zinc-500">
            Quer editar ou misturar frames do vídeo com quadros?
          </span>
          <button
            type="button"
            disabled={isExtractingFrames || isGenerating}
            onClick={onExtractFrames}
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
);

interface FramesSequencePanelProps {
  project: CarouselProject;
  slideThumbnails: Record<number, string>;
  currentPreviewIdx: number;
  getFramePreviewSrc: (frame: GifFrameItem) => string;
  onAddSlideFrame: (idx: number) => void;
  onAddAssetFrame: (asset: ImageAsset) => void;
  onReverseOrder: () => void;
  onApplyGlobalDelay: (ms: number) => void;
  onUpdateFrameDelay: (id: string, ms: number) => void;
  onMoveFrame: (idx: number, dir: -1 | 1) => void;
  onRemoveFrame: (id: string) => void;
}

export const FramesSequencePanel: React.FC<FramesSequencePanelProps> = ({
  project,
  slideThumbnails,
  currentPreviewIdx,
  getFramePreviewSrc,
  onAddSlideFrame,
  onAddAssetFrame,
  onReverseOrder,
  onApplyGlobalDelay,
  onUpdateFrameDelay,
  onMoveFrame,
  onRemoveFrame,
}) => {
  const frames = project.gifFrames;

  return (
    <>
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
                onClick={() => onAddSlideFrame(idx)}
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
                  onClick={() => onAddAssetFrame(asset)}
                  className="btn-press flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-studio-card hover:bg-studio-hover border border-studio-border text-xs text-zinc-300 max-w-[180px]"
                >
                  <img
                    src={asset.thumbnailUrl || asset.dataUrl}
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

      <div className="bg-studio-panel p-4 rounded-lg border border-studio-border space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium text-zinc-300">
            Ordem e tempo por imagem ({frames.length})
          </h3>
          <button
            type="button"
            onClick={onReverseOrder}
            disabled={frames.length < 2}
            className="btn-press px-2 py-1 rounded bg-studio-card hover:bg-studio-hover disabled:opacity-30 text-[11px] font-medium text-zinc-300 border border-studio-border flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Inverter ordem</span>
          </button>
        </div>

        <div className="bg-studio-card p-2.5 rounded-md border border-studio-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label htmlFor="gif-global-delay" className="text-xs text-zinc-300">
            Intervalo global (todos os frames)
          </label>
          <div className="flex items-center gap-2.5">
            <input
              id="gif-global-delay"
              type="range"
              min={100}
              max={2500}
              step={50}
              value={project.gifDefaultDelayMs || 600}
              onChange={(e) => onApplyGlobalDelay(Number(e.target.value))}
              className="w-28 cursor-pointer"
            />
            <span className="text-xs font-mono text-zinc-200 bg-studio-panel px-2 py-0.5 rounded border border-studio-border w-18 text-center">
              {project.gifDefaultDelayMs || 600} ms
            </span>
          </div>
        </div>

        {frames.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500 border border-dashed border-studio-border rounded-lg">
            Adicione quadros ou imagens acima para montar o GIF.
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
            {frames.map((frame, idx) => {
              const thumb = getFramePreviewSrc(frame);
              const isCurrentPreview =
                frames.length > 0 && currentPreviewIdx % frames.length === idx;

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
                    <p className="text-xs font-medium text-zinc-200 truncate">
                      {frame.label}
                    </p>
                  </div>

                  <label className="flex items-center gap-1 bg-studio-panel px-2 py-1 rounded border border-studio-border focus-within:border-accent">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    <input
                      type="number"
                      min={50}
                      max={10000}
                      step={50}
                      value={frame.delayMs}
                      onChange={(e) => {
                        const val = e.currentTarget.valueAsNumber;
                        if (!Number.isFinite(val)) return;
                        onUpdateFrameDelay(frame.id, val);
                      }}
                      aria-label={`Tempo da imagem ${idx + 1} em ms`}
                      className="w-13 bg-transparent text-xs font-mono text-zinc-100 text-right focus:outline-none"
                    />
                    <span className="text-[10px] font-mono text-zinc-500">
                      ms
                    </span>
                  </label>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => onMoveFrame(idx, -1)}
                      title="Subir na ordem"
                      className="btn-press p-1 rounded bg-studio-panel hover:bg-studio-hover disabled:opacity-30 text-zinc-300 border border-studio-border"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === frames.length - 1}
                      onClick={() => onMoveFrame(idx, 1)}
                      title="Descer na ordem"
                      className="btn-press p-1 rounded bg-studio-panel hover:bg-studio-hover disabled:opacity-30 text-zinc-300 border border-studio-border"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveFrame(frame.id)}
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
  );
};

interface GifPreviewPanelProps {
  activeTab: 'frames' | 'video';
  videoFile: File | null;
  videoFitMode: VideoFitMode;
  framesCount: number;
  currentPreviewIdx: number;
  activePreviewFrame: GifFrameItem | null;
  getFramePreviewSrc: (frame: GifFrameItem) => string;
  isPlaying: boolean;
  onTogglePlaying: () => void;
  generatedGifUrl: string | null;
  generatedGifBlob: Blob | null;
  generatedGifDims: { width: number; height: number } | null;
  gifWidth: number;
  gifLoop: boolean;
  formatWidth: number;
  formatHeight: number;
  isGenerating: boolean;
  isExtractingFrames: boolean;
  progressText: string;
  savedToLibrary: boolean;
  onChangeGifWidth: (width: number) => void;
  onToggleLoop: () => void;
  onGenerate: () => void;
  onSaveToBank: (insertOnCanvas: boolean) => void;
  onDownload: () => void;
}

const GifPreviewStage: React.FC<{
  activeTab: 'frames' | 'video';
  videoFile: File | null;
  framesCount: number;
  currentPreviewIdx: number;
  activePreviewFrame: GifFrameItem | null;
  getFramePreviewSrc: (frame: GifFrameItem) => string;
  generatedGifUrl: string | null;
  generatedGifDims: { width: number; height: number } | null;
}> = ({
  activeTab,
  videoFile,
  framesCount,
  currentPreviewIdx,
  activePreviewFrame,
  getFramePreviewSrc,
  generatedGifUrl,
  generatedGifDims,
}) => {
  let stageContent: React.ReactNode = (
    <p className="text-xs text-zinc-500">Sem frames</p>
  );
  if (generatedGifUrl) {
    stageContent = (
      <img
        src={generatedGifUrl}
        alt="GIF Gerado"
        className="max-w-full max-h-full object-contain"
      />
    );
  } else if (activeTab === 'video') {
    stageContent = (
      <div className="p-6 text-center space-y-1.5">
        <Video className="w-7 h-7 text-zinc-600 mx-auto" />
        <p className="text-xs text-zinc-400">
          {videoFile
            ? 'Clique em "Converter vídeo em .GIF" abaixo'
            : 'Carregue um vídeo à esquerda para gerar o GIF'}
        </p>
      </div>
    );
  } else if (activePreviewFrame) {
    stageContent = (
      <img
        src={getFramePreviewSrc(activePreviewFrame)}
        alt={activePreviewFrame.label}
        className="max-w-full max-h-full object-contain"
      />
    );
  }

  return (
    <div className="aspect-square rounded-lg bg-studio-bg border border-studio-border overflow-hidden relative flex items-center justify-center">
      {stageContent}

      {activeTab === 'frames' && activePreviewFrame && !generatedGifUrl && (
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between px-2.5 py-1 rounded bg-black/75 text-[11px] font-mono text-zinc-200">
          <span className="truncate">
            {(currentPreviewIdx % framesCount) + 1}/{framesCount} •{' '}
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
  );
};

const GifPreviewActions: React.FC<{
  activeTab: 'frames' | 'video';
  videoFile: File | null;
  framesCount: number;
  isGenerating: boolean;
  isExtractingFrames: boolean;
  progressText: string;
  generatedGifUrl: string | null;
  generatedGifBlob: Blob | null;
  savedToLibrary: boolean;
  onGenerate: () => void;
  onSaveToBank: (insertOnCanvas: boolean) => void;
  onDownload: () => void;
}> = ({
  activeTab,
  videoFile,
  framesCount,
  isGenerating,
  isExtractingFrames,
  progressText,
  generatedGifUrl,
  generatedGifBlob,
  savedToLibrary,
  onGenerate,
  onSaveToBank,
  onDownload,
}) => {
  const isDisabled =
    isGenerating ||
    isExtractingFrames ||
    (activeTab === 'video' ? !videoFile : framesCount === 0);
  let generateLabel =
    activeTab === 'video' ? 'Converter vídeo em .GIF' : 'Gerar arquivo .GIF';
  if (isGenerating) generateLabel = progressText || 'Renderizando...';
  else if (generatedGifUrl) generateLabel = 'Regerar GIF';

  return (
    <div className="space-y-2 pt-3 border-t border-studio-border">
      <button
        type="button"
        disabled={isDisabled}
        onClick={onGenerate}
        className="btn-press w-full py-2 px-4 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs disabled:opacity-40 flex items-center justify-center gap-1.5"
      >
        {activeTab === 'video' ? (
          <Video className="w-3.5 h-3.5" />
        ) : (
          <Film className="w-3.5 h-3.5" />
        )}
        <span>{generateLabel}</span>
      </button>

      {generatedGifBlob && (
        <div className="space-y-1.5 pt-1">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              disabled={savedToLibrary}
              onClick={() => onSaveToBank(false)}
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
              onClick={() => onSaveToBank(true)}
              title="Salva na biblioteca de imagens e já posiciona no carrossel"
              className="btn-press py-2 px-3 rounded-lg bg-studio-card hover:bg-studio-hover border border-studio-border text-zinc-100 text-xs font-medium flex items-center justify-center gap-1.5"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-accent" />
              <span>Usar no Canvas</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onDownload}
            className="btn-press w-full py-2 px-4 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold text-xs flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar GIF ({formatBytes(generatedGifBlob.size)})</span>
          </button>
        </div>
      )}
    </div>
  );
};

export const GifPreviewPanel: React.FC<GifPreviewPanelProps> = ({
  activeTab,
  videoFile,
  videoFitMode,
  framesCount,
  currentPreviewIdx,
  activePreviewFrame,
  getFramePreviewSrc,
  isPlaying,
  onTogglePlaying,
  generatedGifUrl,
  generatedGifBlob,
  generatedGifDims,
  gifWidth,
  gifLoop,
  formatWidth,
  formatHeight,
  isGenerating,
  isExtractingFrames,
  progressText,
  savedToLibrary,
  onChangeGifWidth,
  onToggleLoop,
  onGenerate,
  onSaveToBank,
  onDownload,
}) => {
  const isOriginalVideo = activeTab === 'video' && videoFitMode === 'original';

  return (
    <div className="lg:col-span-5 flex flex-col justify-between bg-studio-panel p-4 rounded-lg border border-studio-border space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium text-zinc-300">
            {activeTab === 'video' ? 'Resultado do GIF' : 'Pré-visualização'}
          </h3>
          {activeTab === 'frames' && (
            <button
              type="button"
              onClick={onTogglePlaying}
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

        <GifPreviewStage
          activeTab={activeTab}
          videoFile={videoFile}
          framesCount={framesCount}
          currentPreviewIdx={currentPreviewIdx}
          activePreviewFrame={activePreviewFrame}
          getFramePreviewSrc={getFramePreviewSrc}
          generatedGifUrl={generatedGifUrl}
          generatedGifDims={generatedGifDims}
        />

        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="bg-studio-card p-2 rounded-md border border-studio-border">
            <label
              htmlFor="gif-resolution-select"
              className="block text-[10px] text-zinc-400 mb-1"
            >
              {isOriginalVideo ? 'Largura máx.' : 'Resolução'}
            </label>
            <select
              id="gif-resolution-select"
              value={gifWidth || 720}
              onChange={(e) => onChangeGifWidth(Number(e.target.value))}
              className="w-full bg-studio-panel text-xs font-mono text-zinc-200 p-1 rounded border border-studio-border focus:outline-none"
            >
              {[360, 480, 720, 1080].map((w) => (
                <option key={w} value={w}>
                  {isOriginalVideo
                    ? `${w}px`
                    : `${w}×${Math.round(w * (formatHeight / formatWidth))}`}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-studio-card p-2 rounded-md border border-studio-border flex flex-col justify-between">
            <span className="block text-[10px] text-zinc-400">Repetição</span>
            <button
              type="button"
              onClick={onToggleLoop}
              className={`btn-press py-1 px-2 rounded text-xs font-medium flex items-center justify-center gap-1.5 border ${
                gifLoop
                  ? 'bg-accent/15 border-accent/40 text-accent'
                  : 'bg-studio-panel border-studio-border text-zinc-400'
              }`}
            >
              <Repeat className="w-3 h-3" />
              <span>{gifLoop ? 'Loop contínuo' : '1 vez'}</span>
            </button>
          </div>
        </div>
      </div>

      <GifPreviewActions
        activeTab={activeTab}
        videoFile={videoFile}
        framesCount={framesCount}
        isGenerating={isGenerating}
        isExtractingFrames={isExtractingFrames}
        progressText={progressText}
        generatedGifUrl={generatedGifUrl}
        generatedGifBlob={generatedGifBlob}
        savedToLibrary={savedToLibrary}
        onGenerate={onGenerate}
        onSaveToBank={onSaveToBank}
        onDownload={onDownload}
      />
    </div>
  );
};
