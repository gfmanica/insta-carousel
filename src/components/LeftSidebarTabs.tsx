import React, { useRef, useState } from 'react';
import {
  Upload,
  Trash2,
  Plus,
  MoveHorizontal,
} from 'lucide-react';
import type { CarouselProject, ImageAsset } from '../types/carousel';

const PRESET_BACKGROUNDS = [
  { name: 'Grafite Escuro', color: '#111113', gradient: '' },
  { name: 'Preto Absoluto', color: '#050507', gradient: '' },
  { name: 'Off-White Editorial', color: '#F4F4F5', gradient: '' },
  { name: 'Areia Quente', color: '#E7E5E4', gradient: '' },
  {
    name: 'Noite Profunda',
    color: '#12131A',
    gradient: 'linear-gradient(135deg, #12131A 0%, #1F1B2E 50%, #16202A 100%)',
  },
  {
    name: 'Oceano Escuro',
    color: '#0F2027',
    gradient: 'linear-gradient(135deg, #0F2027 0%, #203A43 50%, #2C5364 100%)',
  },
];

interface AssetsLibraryTabProps {
  assets: ImageAsset[];
  slidesCount: number;
  scrollTop: number;
  onAddFiles: (
    files: FileList | File[],
    targetPoint?: { x: number; y: number }
  ) => void;
  onInsertAsset: (asset: ImageAsset, mode: 'slide' | 'seam', slideIdx: number) => void;
  onDeleteAsset: (assetId: string) => void;
}

export const AssetsLibraryTab: React.FC<AssetsLibraryTabProps> = ({
  assets,
  slidesCount,
  scrollTop,
  onAddFiles,
  onInsertAsset,
  onDeleteAsset,
}) => {
  const [targetSeamSlide, setTargetSeamSlide] = useState<number>(0);
  const [dropzoneHeight, setDropzoneHeight] = useState<number>(88);
  const [isResizingDropzone, setIsResizingDropzone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startResizeDropzone = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const startH = dropzoneHeight;
    setIsResizingDropzone(true);

    const onMove = (ev: PointerEvent) => {
      const nextH = Math.max(56, Math.min(240, startH + (ev.clientY - startY)));
      setDropzoneHeight(nextH);
    };
    const onUp = () => {
      setIsResizingDropzone(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const ASSET_ITEM_HEIGHT = 106;
  const HEADER_ESTIMATE = dropzoneHeight + (slidesCount > 1 ? 82 : 34);
  const visibleCount =
    Math.ceil(
      (typeof window !== 'undefined' ? window.innerHeight : 800) /
        ASSET_ITEM_HEIGHT
    ) + 4;
  const startAssetIdx = Math.max(
    0,
    Math.floor((scrollTop - HEADER_ESTIMATE) / ASSET_ITEM_HEIGHT) - 3
  );
  const endAssetIdx = Math.min(
    assets.length,
    startAssetIdx + visibleCount + 4
  );
  const visibleAssets = assets.slice(startAssetIdx, endAssetIdx);
  const topSpacerPx = startAssetIdx * ASSET_ITEM_HEIGHT;
  const bottomSpacerPx = Math.max(
    0,
    (assets.length - endAssetIdx) * ASSET_ITEM_HEIGHT
  );

  return (
    <>
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.heic,.heif,.HEIC,.HEIF"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) onAddFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files) onAddFiles(e.dataTransfer.files);
          }}
          style={{ height: `${dropzoneHeight}px` }}
          className="btn-press w-full px-3 rounded-lg border border-dashed border-zinc-700 hover:border-zinc-500 bg-studio-card/50 hover:bg-studio-card flex flex-col items-center justify-center gap-1 text-center transition-colors overflow-hidden"
        >
          <Upload className="w-4 h-4 text-zinc-400 shrink-0" />
          <div>
            <p className="text-xs font-medium text-zinc-200">
              Adicionar imagens
            </p>
            {dropzoneHeight >= 76 && (
              <p className="text-[11px] text-zinc-500">
                Arraste arquivos ou cole com Ctrl+V
              </p>
            )}
          </div>
        </button>

        <div
          onPointerDown={startResizeDropzone}
          title="Arraste para ajustar a altura da área de upload"
          className="h-2.5 w-full cursor-row-resize flex items-center justify-center group mt-0.5"
        >
          <div
            className={`w-8 h-[2px] rounded-full transition-colors ${
              isResizingDropzone
                ? 'bg-accent'
                : 'bg-zinc-800 group-hover:bg-accent/70'
            }`}
          />
        </div>
      </div>

      {slidesCount > 1 && (
        <div className="bg-studio-card p-2.5 rounded-lg border border-studio-border flex items-center justify-between gap-2">
          <label
            htmlFor="target-seam-select"
            className="text-[11px] text-zinc-400 flex items-center gap-1.5"
          >
            <MoveHorizontal className="w-3.5 h-3.5 text-accent" />
            Divisória alvo:
          </label>
          <select
            id="target-seam-select"
            value={Math.min(targetSeamSlide, slidesCount - 2)}
            onChange={(e) => setTargetSeamSlide(Number(e.target.value))}
            className="bg-studio-panel text-xs text-zinc-200 px-2 py-1 rounded border border-studio-border focus:outline-none"
          >
            {Array.from({ length: slidesCount - 1 }).map((_, idx) => (
              <option key={idx} value={idx}>
                Quadro {idx + 1} ↔ {idx + 2}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <h3 className="text-[11px] font-medium text-zinc-400">
            Biblioteca ({assets.length})
          </h3>
        </div>

        <div
          style={{
            paddingTop: `${topSpacerPx}px`,
            paddingBottom: `${bottomSpacerPx}px`,
          }}
          className="space-y-2"
        >
          {visibleAssets.map((asset) => {
            const safeSeam = Math.min(
              targetSeamSlide,
              Math.max(0, slidesCount - 2)
            );
            return (
              <div
                key={asset.id}
                style={{ height: '98px' }}
                className="bg-studio-card rounded-lg p-2 border border-studio-border hover:border-zinc-700 transition-colors flex flex-col justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-11 h-11 rounded bg-studio-bg overflow-hidden shrink-0 border border-studio-border flex items-center justify-center">
                    <img
                      src={asset.thumbnailUrl || asset.dataUrl}
                      alt={asset.name}
                      decoding="async"
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-zinc-200 truncate">
                      {asset.name}
                    </p>
                    <p className="text-[11px] font-mono text-zinc-500">
                      {asset.naturalWidth}×{asset.naturalHeight}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteAsset(asset.id)}
                    title="Remover da biblioteca"
                    className="btn-press p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onInsertAsset(asset, 'slide', 0)}
                    className="btn-press py-1 px-2 rounded bg-studio-panel hover:bg-studio-hover text-[11px] font-medium text-zinc-300 flex items-center justify-center gap-1 border border-studio-border"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Inserir</span>
                  </button>

                  {slidesCount > 1 && (
                    <button
                      type="button"
                      onClick={() => onInsertAsset(asset, 'seam', safeSeam)}
                      className="btn-press py-1 px-2 rounded bg-accent/10 hover:bg-accent/20 text-[11px] font-medium text-accent flex items-center justify-center gap-1 border border-accent/25"
                    >
                      <MoveHorizontal className="w-3 h-3" />
                      <span>
                        Entre {safeSeam + 1}↔{safeSeam + 2}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export const TextPresetsTab: React.FC<{
  onAddText: (preset: 'heading' | 'badge' | 'seamTitle') => void;
}> = ({ onAddText }) => (
  <div className="space-y-2">
    <button
      type="button"
      onClick={() => onAddText('seamTitle')}
      className="btn-press w-full p-3 rounded-lg bg-studio-card hover:bg-studio-hover border border-studio-border text-left flex items-center justify-between"
    >
      <div>
        <p className="text-xs font-medium text-zinc-200">
          Título entre quadros
        </p>
        <p className="text-[11px] text-zinc-500 mt-0.5">
          Cruza a divisória do Quadro 1 para o 2
        </p>
      </div>
      <Plus className="w-4 h-4 text-zinc-400" />
    </button>

    <button
      type="button"
      onClick={() => onAddText('heading')}
      className="btn-press w-full p-3 rounded-lg bg-studio-card hover:bg-studio-hover border border-studio-border text-left flex items-center justify-between"
    >
      <div>
        <p className="text-xs font-medium text-zinc-200">Título simples</p>
        <p className="text-[11px] text-zinc-500 mt-0.5">
          Tipografia limpa sem fundo
        </p>
      </div>
      <Plus className="w-4 h-4 text-zinc-400" />
    </button>

    <button
      type="button"
      onClick={() => onAddText('badge')}
      className="btn-press w-full p-3 rounded-lg bg-studio-card hover:bg-studio-hover border border-studio-border text-left flex items-center justify-between"
    >
      <div>
        <p className="text-xs font-medium text-zinc-200">Etiqueta com fundo</p>
        <p className="text-[11px] text-zinc-500 mt-0.5">
          Caixa de texto com preenchimento
        </p>
      </div>
      <Plus className="w-4 h-4 text-zinc-400" />
    </button>
  </div>
);

export const BackgroundPresetsTab: React.FC<{
  backgroundColor: string;
  onUpdateProject: (updater: (prev: CarouselProject) => CarouselProject) => void;
}> = ({ backgroundColor, onUpdateProject }) => (
  <div className="space-y-4">
    <div className="space-y-1.5">
      <label
        htmlFor="bg-color-hex"
        className="block text-[11px] font-medium text-zinc-400"
      >
        Cor do fundo
      </label>
      <div className="flex items-center gap-2 bg-studio-card p-2 rounded-lg border border-studio-border">
        <input
          type="color"
          aria-label="Seletor de cor do fundo"
          value={backgroundColor}
          onChange={(e) =>
            onUpdateProject((p) => ({
              ...p,
              backgroundColor: e.target.value,
              backgroundGradient: '',
            }))
          }
          className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
        />
        <input
          id="bg-color-hex"
          type="text"
          value={backgroundColor}
          onChange={(e) =>
            onUpdateProject((p) => ({
              ...p,
              backgroundColor: e.target.value,
              backgroundGradient: '',
            }))
          }
          className="bg-studio-panel text-xs font-mono text-zinc-200 px-2 py-1 rounded border border-studio-border flex-1 focus:outline-none focus:border-accent"
        />
      </div>
    </div>

    <div className="space-y-1.5">
      <span
        id="bg-presets-label"
        className="block text-[11px] font-medium text-zinc-400"
      >
        Predefinições
      </span>
      <div
        role="group"
        aria-labelledby="bg-presets-label"
        className="grid grid-cols-2 gap-1.5"
      >
        {PRESET_BACKGROUNDS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            onClick={() =>
              onUpdateProject((p) => ({
                ...p,
                backgroundColor: preset.color,
                backgroundGradient: preset.gradient,
              }))
            }
            className="btn-press p-2 rounded-lg bg-studio-card border border-studio-border hover:border-zinc-600 flex items-center gap-2 text-left"
          >
            <div
              className="w-5 h-5 rounded border border-white/15 shrink-0"
              style={{ background: preset.gradient || preset.color }}
            />
            <span className="text-[11px] text-zinc-300 truncate">
              {preset.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  </div>
);
