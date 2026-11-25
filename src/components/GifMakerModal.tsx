import React, { useEffect, useRef } from 'react';
import { X, Video, Layers } from 'lucide-react';
import type { CarouselProject, ImageAsset } from '../types/carousel';
import { triggerBlobDownload } from '../utils/canvasExport';
import { useGifMaker } from '../hooks/useGifMaker';
import {
  VideoToGifPanel,
  FramesSequencePanel,
  GifPreviewPanel,
} from './GifMakerPanels';

interface GifMakerModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: CarouselProject;
  onUpdateProject: (updater: (prev: CarouselProject) => CarouselProject) => void;
  onSelectLayer?: (layerId: string | null) => void;
}

const GifMakerHeader: React.FC<{
  activeTab: 'frames' | 'video';
  onChangeTab: (tab: 'frames' | 'video') => void;
  onClose: () => void;
}> = ({ activeTab, onChangeTab, onClose }) => (
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
          onClick={() => onChangeTab('frames')}
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
          onClick={() => onChangeTab('video')}
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
        onClick={onClose}
        aria-label="Fechar"
        className="btn-press p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-studio-hover"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  </div>
);

function createGifFrameActions(
  framesLength: number,
  resetGeneratedState: () => void,
  onUpdateProject: (updater: (prev: CarouselProject) => CarouselProject) => void
) {
  return {
    onAddSlideFrame: (slideIdx: number) => {
      resetGeneratedState();
      onUpdateProject((p) => ({
        ...p,
        gifFrames: [
          ...p.gifFrames,
          {
            id: `gif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            sourceType: 'slide',
            slideIndex: slideIdx,
            label: `Quadro ${slideIdx + 1}`,
            delayMs: p.gifDefaultDelayMs || 600,
          },
        ],
      }));
    },
    onAddAssetFrame: (asset: ImageAsset) => {
      resetGeneratedState();
      onUpdateProject((p) => ({
        ...p,
        gifFrames: [
          ...p.gifFrames,
          {
            id: `gif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            sourceType: 'asset',
            assetId: asset.id,
            dataUrl: asset.dataUrl,
            label: asset.name.replace(/\.[^/.]+$/, ''),
            delayMs: p.gifDefaultDelayMs || 600,
          },
        ],
      }));
    },
    onReverseOrder: () => {
      resetGeneratedState();
      onUpdateProject((p) => ({ ...p, gifFrames: [...p.gifFrames].reverse() }));
    },
    onApplyGlobalDelay: (ms: number) => {
      resetGeneratedState();
      const clamped = Math.max(50, ms);
      onUpdateProject((p) => ({
        ...p,
        gifDefaultDelayMs: clamped,
        gifFrames: p.gifFrames.map((f) => ({ ...f, delayMs: clamped })),
      }));
    },
    onUpdateFrameDelay: (id: string, ms: number) => {
      resetGeneratedState();
      onUpdateProject((p) => ({
        ...p,
        gifFrames: p.gifFrames.map((f) =>
          f.id === id ? { ...f, delayMs: Math.max(50, ms) } : f
        ),
      }));
    },
    onMoveFrame: (index: number, dir: -1 | 1) => {
      const targetIdx = index + dir;
      if (targetIdx < 0 || targetIdx >= framesLength) return;
      resetGeneratedState();
      onUpdateProject((p) => {
        const copy = [...p.gifFrames];
        const [item] = copy.splice(index, 1);
        copy.splice(targetIdx, 0, item);
        return { ...p, gifFrames: copy };
      });
    },
    onRemoveFrame: (id: string) => {
      resetGeneratedState();
      onUpdateProject((p) => ({
        ...p,
        gifFrames: p.gifFrames.filter((f) => f.id !== id),
      }));
    },
  };
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

  const gif = useGifMaker({
    isOpen,
    project,
    onUpdateProject,
    onSelectLayer,
    onCloseDialog: () => dialogRef.current?.close(),
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      if (!dialog.open) dialog.showModal();
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
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);

  const frameActions = createGifFrameActions(
    gif.frames.length,
    gif.resetGeneratedState,
    onUpdateProject
  );

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: 'any' } as React.DialogHTMLAttributes<HTMLDialogElement>)}
      aria-labelledby="gif-dialog-title"
      className="w-[95vw] max-w-[960px]"
    >
      <div className="flex flex-col max-h-[90vh]">
        <GifMakerHeader
          activeTab={gif.activeTab}
          onChangeTab={gif.setActiveTab}
          onClose={() => dialogRef.current?.close()}
        />

        <div className="p-3 sm:p-5 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 bg-studio-bg">
          <div className="lg:col-span-7 space-y-4">
            {gif.activeTab === 'video' ? (
              <VideoToGifPanel
                videoFile={gif.videoFile}
                videoUrl={gif.videoUrl}
                videoDuration={gif.videoDuration}
                videoStart={gif.videoStart}
                videoEnd={gif.videoEnd}
                videoFps={gif.videoFps}
                videoFitMode={gif.videoFitMode}
                videoError={gif.videoError}
                isGenerating={gif.isGenerating}
                isExtractingFrames={gif.isExtractingFrames}
                progressText={gif.progressText}
                videoInputRef={videoInputRef}
                videoPreviewRef={videoPreviewRef}
                onLoadVideoFile={gif.handleLoadVideoFile}
                onLoadedMetadata={(dur) => {
                  gif.setVideoDuration(dur);
                  gif.setVideoStart(0);
                  gif.setVideoEnd(Math.min(dur, 6));
                }}
                onChangeStart={(val) => {
                  gif.setVideoStart(val);
                  if (val >= gif.videoEnd - 0.2) {
                    gif.setVideoEnd(
                      Math.min(gif.videoDuration, +(val + 0.5).toFixed(1))
                    );
                  }
                  if (videoPreviewRef.current) videoPreviewRef.current.currentTime = val;
                  gif.resetGeneratedState();
                }}
                onChangeEnd={(val) => {
                  gif.setVideoEnd(Math.max(gif.videoStart + 0.2, val));
                  if (videoPreviewRef.current) videoPreviewRef.current.currentTime = val;
                  gif.resetGeneratedState();
                }}
                onChangeFps={(fps) => {
                  gif.setVideoFps(fps);
                  gif.resetGeneratedState();
                }}
                onChangeFitMode={(mode) => {
                  gif.setVideoFitMode(mode);
                  gif.resetGeneratedState();
                }}
                onExtractFrames={gif.handleExtractVideoFrames}
              />
            ) : (
              <FramesSequencePanel
                project={project}
                slideThumbnails={gif.slideThumbnails}
                currentPreviewIdx={gif.currentPreviewIdx}
                getFramePreviewSrc={gif.getFramePreviewSrc}
                {...frameActions}
              />
            )}
          </div>

          <GifPreviewPanel
            activeTab={gif.activeTab}
            videoFile={gif.videoFile}
            videoFitMode={gif.videoFitMode}
            framesCount={gif.frames.length}
            currentPreviewIdx={gif.currentPreviewIdx}
            activePreviewFrame={
              gif.frames.length > 0
                ? gif.frames[gif.currentPreviewIdx % gif.frames.length]
                : null
            }
            getFramePreviewSrc={gif.getFramePreviewSrc}
            isPlaying={gif.isPlaying}
            onTogglePlaying={() => gif.setIsPlaying((p) => !p)}
            generatedGifUrl={gif.generatedGifUrl}
            generatedGifBlob={gif.generatedGifBlob}
            generatedGifDims={gif.generatedGifDims}
            gifWidth={project.gifWidth || 720}
            gifLoop={project.gifLoop}
            formatWidth={gif.currentFormat.width}
            formatHeight={gif.currentFormat.height}
            isGenerating={gif.isGenerating}
            isExtractingFrames={gif.isExtractingFrames}
            progressText={gif.progressText}
            savedToLibrary={gif.savedToLibrary}
            onChangeGifWidth={(w) => {
              gif.resetGeneratedState();
              onUpdateProject((p) => ({ ...p, gifWidth: w }));
            }}
            onToggleLoop={() => {
              gif.resetGeneratedState();
              onUpdateProject((p) => ({ ...p, gifLoop: !p.gifLoop }));
            }}
            onGenerate={gif.handleGenerate}
            onSaveToBank={gif.handleSaveToAssetBank}
            onDownload={() => {
              if (!gif.generatedGifBlob) return;
              const name = (
                gif.activeTab === 'video' && gif.videoFile
                  ? gif.videoFile.name.replace(/\.[^/.]+$/, '')
                  : project.title || 'carrossel'
              )
                .toLowerCase()
                .replace(/[^a-z0-9-_]+/g, '-');
              triggerBlobDownload(gif.generatedGifBlob, `${name}.gif`);
            }}
          />
        </div>
      </div>
    </dialog>
  );
};
