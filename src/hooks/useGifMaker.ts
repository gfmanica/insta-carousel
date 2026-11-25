import { useEffect, useState } from 'react';
import type {
  CarouselProject,
  GifFrameItem,
  ImageAsset,
  ImageLayer,
} from '../types/carousel';
import { INSTAGRAM_FORMATS } from '../types/carousel';
import { renderSlideToCanvas } from '../utils/canvasExport';
import {
  extractFramesFromVideo,
  generateAnimatedGif,
  generateGifFromVideo,
  type VideoFitMode,
} from '../utils/gifGenerator';

function buildGifAssetAndLayer(
  prev: CarouselProject,
  dataUrl: string,
  assetName: string,
  gifW: number,
  gifH: number,
  formatWidth: number,
  formatHeight: number,
  alsoInsertOnCanvas: boolean
): { project: CarouselProject; layerId: string } {
  const assetId = `asset-gif-${Date.now()}`;
  const layerId = `layer-gif-${Date.now()}`;
  const newAsset: ImageAsset = {
    id: assetId,
    name: assetName,
    dataUrl,
    naturalWidth: gifW,
    naturalHeight: gifH,
    createdAt: Date.now(),
  };
  const nextAssets = [newAsset, ...prev.assets];
  if (!alsoInsertOnCanvas) {
    return { project: { ...prev, assets: nextAssets }, layerId };
  }

  const maxZ = prev.layers.reduce((m, l) => Math.max(m, l.zIndex), 0);
  const maxInitDim = Math.min(formatWidth * 0.72, 800);
  const ratio = gifW / Math.max(1, gifH);
  let w = maxInitDim;
  let h = maxInitDim / ratio;
  if (h > formatHeight * 0.78) {
    h = formatHeight * 0.78;
    w = h * ratio;
  }
  const newLayer: ImageLayer = {
    id: layerId,
    type: 'image',
    assetId,
    name: assetName.replace(/\.gif$/i, ''),
    dataUrl,
    naturalWidth: gifW,
    naturalHeight: gifH,
    x:
      prev.slidesCount > 1
        ? Math.round(formatWidth - w / 2)
        : Math.round((formatWidth - w) / 2),
    y: Math.round((formatHeight - h) / 2),
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
    project: { ...prev, assets: nextAssets, layers: [...prev.layers, newLayer] },
    layerId,
  };
}

interface UseGifMakerOptions {
  isOpen: boolean;
  project: CarouselProject;
  onUpdateProject: (updater: (prev: CarouselProject) => CarouselProject) => void;
  onSelectLayer?: (layerId: string | null) => void;
  onCloseDialog: () => void;
}

export function useGifMaker({
  isOpen,
  project,
  onUpdateProject,
  onSelectLayer,
  onCloseDialog,
}: UseGifMakerOptions) {
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
    if (!videoFile) {
      setVideoUrl(null);
      return;
    }
    const nextUrl = URL.createObjectURL(videoFile);
    setVideoUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [videoFile]);

  useEffect(() => {
    if (!generatedGifBlob) {
      setGeneratedGifUrl(null);
      return;
    }
    const nextUrl = URL.createObjectURL(generatedGifBlob);
    setGeneratedGifUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [generatedGifBlob]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const buildThumbs = async () => {
      const entries = await Promise.all(
        Array.from({ length: project.slidesCount }, async (_, i) => {
          const canvas = await renderSlideToCanvas(project, i, 0.35);
          return [i, canvas.toDataURL('image/jpeg', 0.85)] as const;
        })
      );
      if (!cancelled) setSlideThumbnails(Object.fromEntries(entries));
    };
    buildThumbs();
    return () => {
      cancelled = true;
    };
  }, [isOpen, project]);

  useEffect(() => {
    if (!isOpen || !isPlaying || frames.length === 0) return;
    const currentFrame = frames[currentPreviewIdx % frames.length];
    const delay = Math.max(50, currentFrame?.delayMs || project.gifDefaultDelayMs || 500);
    const timer = setTimeout(() => {
      setCurrentPreviewIdx((prev) => (prev + 1) % frames.length);
    }, delay);
    return () => clearTimeout(timer);
  }, [isOpen, isPlaying, currentPreviewIdx, frames, project.gifDefaultDelayMs]);

  const resetGeneratedState = () => {
    setGeneratedGifBlob(null);
    setGeneratedGifDims(null);
    setSavedToLibrary(false);
  };

  const handleLoadVideoFile = (file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setVideoError('Selecione um arquivo de vídeo válido (MP4, WebM, MOV).');
      return;
    }
    setVideoError(null);
    resetGeneratedState();
    setVideoFile(file);
    setVideoStart(0);
    setVideoEnd(5);
    setVideoDuration(0);
  };

  const getFramePreviewSrc = (frame: GifFrameItem): string => {
    if (frame.sourceType === 'slide' && typeof frame.slideIndex === 'number') {
      return slideThumbnails[frame.slideIndex] || '';
    }
    if (frame.dataUrl) return frame.dataUrl;
    if (frame.assetId) {
      return project.assets.find((a) => a.id === frame.assetId)?.dataUrl || '';
    }
    return '';
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setSavedToLibrary(false);
    setVideoError(null);
    setProgressText('Codificando GIF...');
    try {
      const targetWidth = project.gifWidth || 480;
      const result =
        activeTab === 'video' && videoFile
          ? await generateGifFromVideo({
              file: videoFile,
              startTime: videoStart,
              endTime: Math.max(videoStart + 0.2, videoEnd),
              fps: videoFps,
              targetWidth,
              targetAspect: currentFormat.height / currentFormat.width,
              fitMode: videoFitMode,
              backgroundColor: project.backgroundColor || '#111113',
              loop: project.gifLoop,
              onProgress: (_c, _t, stage) => setProgressText(stage),
            })
          : {
              blob: await generateAnimatedGif({
                project,
                frames,
                targetWidth,
                loop: project.gifLoop,
                onProgress: (c, t) => setProgressText(`Frame ${c}/${t}...`),
              }),
              width: targetWidth,
              height: Math.round(
                targetWidth * (currentFormat.height / currentFormat.width)
              ),
            };

      setGeneratedGifBlob(result.blob);
      setGeneratedGifDims({ width: result.width, height: result.height });
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : 'Erro ao gerar GIF.');
    } finally {
      setIsGenerating(false);
      setProgressText('');
    }
  };

  const handleExtractVideoFrames = async () => {
    if (!videoFile) return;
    setIsExtractingFrames(true);
    setVideoError(null);
    try {
      const extracted = await extractFramesFromVideo(
        videoFile,
        videoStart,
        Math.max(videoStart + 0.2, videoEnd),
        12,
        (c, t) => setProgressText(`Extraindo ${c}/${t}...`)
      );
      resetGeneratedState();
      onUpdateProject((p) => ({ ...p, gifFrames: [...p.gifFrames, ...extracted] }));
      setActiveTab('frames');
    } catch {
      setVideoError('Não foi possível extrair os frames deste vídeo.');
    } finally {
      setIsExtractingFrames(false);
      setProgressText('');
    }
  };

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
      const baseName =
        activeTab === 'video' && videoFile
          ? videoFile.name.replace(/\.[^/.]+$/, '')
          : project.title || 'animacao';
      const assetName = `${baseName.toLowerCase().replace(/[^a-z0-9-_]+/g, '-')}.gif`;

      const { project: nextProject, layerId: createdLayerId } =
        buildGifAssetAndLayer(
          project,
          dataUrl,
          assetName,
          gifW,
          gifH,
          currentFormat.width,
          currentFormat.height,
          alsoInsertOnCanvas
        );
      onUpdateProject(() => nextProject);
      setSavedToLibrary(true);
      if (alsoInsertOnCanvas) {
        onSelectLayer?.(createdLayerId);
        onCloseDialog();
      }
    };
    reader.readAsDataURL(generatedGifBlob);
  };

  return {
    activeTab,
    setActiveTab,
    slideThumbnails,
    currentPreviewIdx,
    isPlaying,
    setIsPlaying,
    isGenerating,
    isExtractingFrames,
    progressText,
    generatedGifUrl,
    generatedGifBlob,
    generatedGifDims,
    savedToLibrary,
    videoFile,
    videoUrl,
    videoDuration,
    setVideoDuration,
    videoStart,
    setVideoStart,
    videoEnd,
    setVideoEnd,
    videoFps,
    setVideoFps,
    videoFitMode,
    setVideoFitMode,
    videoError,
    frames,
    currentFormat,
    resetGeneratedState,
    handleLoadVideoFile,
    getFramePreviewSrc,
    handleGenerate,
    handleExtractVideoFrames,
    handleSaveToAssetBank,
  };
}
