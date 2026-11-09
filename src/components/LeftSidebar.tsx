import React, { useRef, useState } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Type,
  Palette,
  Trash2,
  Plus,
  MoveHorizontal,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type {
  CarouselProject,
  ImageAsset,
  ImageLayer,
  TextLayer,
} from '../types/carousel';
import { INSTAGRAM_FORMATS } from '../types/carousel';

interface LeftSidebarProps {
  project: CarouselProject;
  onUpdateProject: (updater: (prev: CarouselProject) => CarouselProject) => void;
  onSelectLayer: (layerId: string | null) => void;
  onAddFiles: (
    files: FileList | File[],
    targetPoint?: { x: number; y: number }
  ) => void;
  lastClickedPoint?: { x: number; y: number } | null;
  width: number;
  isOpen: boolean;
  onToggleOpen: () => void;
  onResizeWidth: (newWidth: number) => void;
}

const PRESET_BACKGROUNDS = [
  {
    name: 'Grafite Escuro',
    color: '#111113',
    gradient: '',
  },
  {
    name: 'Preto Absoluto',
    color: '#050507',
    gradient: '',
  },
  {
    name: 'Off-White Editorial',
    color: '#F4F4F5',
    gradient: '',
  },
  {
    name: 'Areia Quente',
    color: '#E7E5E4',
    gradient: '',
  },
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

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  project,
  onUpdateProject,
  onSelectLayer,
  onAddFiles,
  lastClickedPoint,
  width,
  isOpen,
  onToggleOpen,
  onResizeWidth,
}) => {
  const [activeTab, setActiveTab] = useState<'assets' | 'text' | 'background'>('assets');
  const [targetSeamSlide, setTargetSeamSlide] = useState<number>(0);
  const [dropzoneHeight, setDropzoneHeight] = useState<number>(88);
  const [isResizingWidth, setIsResizingWidth] = useState(false);
  const [isResizingDropzone, setIsResizingDropzone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startResizeWidth = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = width;
    setIsResizingWidth(true);

    const onMove = (ev: PointerEvent) => {
      const nextW = Math.max(210, Math.min(520, startW + (ev.clientX - startX)));
      onResizeWidth(nextW);
    };
    const onUp = () => {
      setIsResizingWidth(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

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

  const currentFormat = INSTAGRAM_FORMATS[project.formatId];

  const addAssetToCanvas = (
    asset: ImageAsset,
    mode: 'slide' | 'seam' = 'slide',
    slideIdx = 0
  ) => {
    const maxInitDim = Math.min(currentFormat.width * 0.75, 860);
    const ratio = asset.naturalWidth / Math.max(1, asset.naturalHeight);
    let w = maxInitDim;
    let h = maxInitDim / ratio;
    if (h > currentFormat.height * 0.8) {
      h = currentFormat.height * 0.8;
      w = h * ratio;
    }

    const seamX = (slideIdx + 1) * currentFormat.width;
    const xPos =
      mode === 'seam' && project.slidesCount > 1
        ? Math.round(seamX - w / 2)
        : lastClickedPoint
        ? Math.round(lastClickedPoint.x - w / 2)
        : Math.round(
            slideIdx * currentFormat.width + (currentFormat.width - w) / 2
          );
    const yPos =
      mode === 'seam'
        ? Math.round((currentFormat.height - h) / 2)
        : lastClickedPoint
        ? Math.round(lastClickedPoint.y - h / 2)
        : Math.round((currentFormat.height - h) / 2);

    const layerId = `layer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    onUpdateProject((prev) => {
      const maxZ = prev.layers.reduce((m, l) => Math.max(m, l.zIndex), 0);
      const newLayer: ImageLayer = {
        id: layerId,
        type: 'image',
        assetId: asset.id,
        name: asset.name.replace(/\.[^/.]+$/, ''),
        dataUrl: asset.dataUrl,
        naturalWidth: asset.naturalWidth,
        naturalHeight: asset.naturalHeight,
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
        layers: [...prev.layers, newLayer],
      };
    });
    onSelectLayer(layerId);
  };

  const handleDeleteAsset = (assetId: string) => {
    onUpdateProject((prev) => ({
      ...prev,
      assets: prev.assets.filter((a) => a.id !== assetId),
    }));
  };

  const handleAddTextLayer = (preset: 'heading' | 'badge' | 'seamTitle') => {
    const layerId = `layer-text-${Date.now()}`;
    const isSeam = preset === 'seamTitle' && project.slidesCount > 1;
    const w = isSeam ? 920 : 720;
    const h = preset === 'badge' ? 96 : 180;
    const x = isSeam
      ? Math.round(currentFormat.width - w / 2)
      : Math.round((currentFormat.width - w) / 2);
    const y =
      preset === 'badge'
        ? 110
        : Math.round(currentFormat.height / 2 - h / 2);

    onUpdateProject((prev) => {
      const maxZ = prev.layers.reduce((m, l) => Math.max(m, l.zIndex), 0);
      const newText: TextLayer = {
        id: layerId,
        type: 'text',
        name:
          preset === 'heading'
            ? 'Título'
            : preset === 'badge'
            ? 'Etiqueta'
            : 'Título Panorâmico',
        text:
          preset === 'heading'
            ? 'Título Principal'
            : preset === 'badge'
            ? 'DESTAQUE'
            : 'Continuidade Entre Quadros',
        x,
        y,
        width: w,
        height: h,
        rotation: 0,
        opacity: 1,
        zIndex: maxZ + 1,
        visible: true,
        locked: false,
        fontSize: preset === 'badge' ? 32 : 56,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontWeight: '700',
        color: '#FAFAFA',
        backgroundColor:
          preset === 'badge' ? '#18181B' : 'transparent',
        borderRadius: 12,
        textAlign: 'center',
        shadowBlur: preset === 'badge' ? 16 : 0,
        shadowColor: 'rgba(0,0,0,0.4)',
      };
      return {
        ...prev,
        layers: [...prev.layers, newText],
      };
    });
    onSelectLayer(layerId);
  };

  if (!isOpen) {
    return (
      <div className="hidden md:flex w-8 bg-studio-panel border-r border-studio-border flex-col items-center py-2.5 gap-3 shrink-0 select-none z-10">
        <button
          type="button"
          onClick={onToggleOpen}
          title="Expandir painel esquerdo (Biblioteca)"
          className="btn-press p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-studio-hover border border-transparent hover:border-studio-border"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <div
          onClick={onToggleOpen}
          className="cursor-pointer text-[10px] font-medium text-zinc-500 hover:text-zinc-300 tracking-wider uppercase [writing-mode:vertical-rl] rotate-180 py-2"
        >
          Biblioteca ({project.assets.length})
        </div>
      </div>
    );
  }

  return (
    <aside
      style={{ width: `${width}px` }}
      className="fixed md:relative inset-y-0 left-0 max-w-[86vw] md:max-w-none bg-studio-panel border-r border-studio-border flex flex-col shrink-0 select-none z-40 md:z-10 shadow-2xl md:shadow-none"
    >
      {/* Right Edge Horizontal Resizer */}
      <div
        onPointerDown={startResizeWidth}
        title="Arraste para ajustar a largura do painel"
        className={`absolute top-0 -right-1 bottom-0 w-2 cursor-col-resize z-30 group flex items-center justify-center`}
      >
        <div
          className={`w-[2px] h-full transition-colors ${
            isResizingWidth
              ? 'bg-accent'
              : 'bg-transparent group-hover:bg-accent/60'
          }`}
        />
      </div>

      {/* Segmented Sidebar Tabs + Collapse Button */}
      <div className="p-2 border-b border-studio-border flex items-center gap-1.5">
        <div className="flex-1 grid grid-cols-3 gap-1 bg-studio-bg p-1 rounded-lg border border-studio-border min-w-0">
          <button
            type="button"
            onClick={() => setActiveTab('assets')}
            className={`btn-press py-1.5 px-1.5 rounded-md text-xs font-medium flex items-center justify-center gap-1 truncate ${
              activeTab === 'assets'
                ? 'bg-studio-card text-white shadow-xs border border-studio-border'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Imagens</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`btn-press py-1.5 px-1.5 rounded-md text-xs font-medium flex items-center justify-center gap-1 truncate ${
              activeTab === 'text'
                ? 'bg-studio-card text-white shadow-xs border border-studio-border'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Type className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Texto</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('background')}
            className={`btn-press py-1.5 px-1.5 rounded-md text-xs font-medium flex items-center justify-center gap-1 truncate ${
              activeTab === 'background'
                ? 'bg-studio-card text-white shadow-xs border border-studio-border'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Palette className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Fundo</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onToggleOpen}
          title="Recolher painel esquerdo"
          className="btn-press p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-studio-hover shrink-0"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activeTab === 'assets' && (
          <>
            {/* Upload Dropzone with Vertical Height Resizer */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
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

              {/* Vertical Resizer Handle for Dropzone Height */}
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

            {/* Target Seam Selector */}
            {project.slidesCount > 1 && (
              <div className="bg-studio-card p-2.5 rounded-lg border border-studio-border flex items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                  <MoveHorizontal className="w-3.5 h-3.5 text-accent" />
                  Divisória alvo:
                </span>
                <select
                  value={Math.min(targetSeamSlide, project.slidesCount - 2)}
                  onChange={(e) => setTargetSeamSlide(Number(e.target.value))}
                  className="bg-studio-panel text-xs text-zinc-200 px-2 py-1 rounded border border-studio-border focus:outline-none"
                >
                  {Array.from({ length: project.slidesCount - 1 }).map((_, idx) => (
                    <option key={idx} value={idx}>
                      Quadro {idx + 1} ↔ {idx + 2}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Assets List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-0.5">
                <h3 className="text-[11px] font-medium text-zinc-400">
                  Biblioteca ({project.assets.length})
                </h3>
              </div>

              <div className="space-y-2">
                {project.assets.map((asset) => {
                  const safeSeam = Math.min(
                    targetSeamSlide,
                    Math.max(0, project.slidesCount - 2)
                  );
                  return (
                    <div
                      key={asset.id}
                      className="bg-studio-card rounded-lg p-2 border border-studio-border hover:border-zinc-700 transition-colors space-y-2"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-11 h-11 rounded bg-studio-bg overflow-hidden shrink-0 border border-studio-border flex items-center justify-center">
                          <img
                            src={asset.dataUrl}
                            alt={asset.name}
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
                          onClick={() => handleDeleteAsset(asset.id)}
                          title="Remover da biblioteca"
                          className="btn-press p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => addAssetToCanvas(asset, 'slide', 0)}
                          className="btn-press py-1 px-2 rounded bg-studio-panel hover:bg-studio-hover text-[11px] font-medium text-zinc-300 flex items-center justify-center gap-1 border border-studio-border"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Inserir</span>
                        </button>

                        {project.slidesCount > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              addAssetToCanvas(asset, 'seam', safeSeam)
                            }
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
        )}

        {activeTab === 'text' && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleAddTextLayer('seamTitle')}
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
              onClick={() => handleAddTextLayer('heading')}
              className="btn-press w-full p-3 rounded-lg bg-studio-card hover:bg-studio-hover border border-studio-border text-left flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-medium text-zinc-200">
                  Título simples
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Tipografia limpa sem fundo
                </p>
              </div>
              <Plus className="w-4 h-4 text-zinc-400" />
            </button>

            <button
              type="button"
              onClick={() => handleAddTextLayer('badge')}
              className="btn-press w-full p-3 rounded-lg bg-studio-card hover:bg-studio-hover border border-studio-border text-left flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-medium text-zinc-200">
                  Etiqueta com fundo
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Caixa de texto com preenchimento
                </p>
              </div>
              <Plus className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
        )}

        {activeTab === 'background' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium text-zinc-400">
                Cor do fundo
              </label>
              <div className="flex items-center gap-2 bg-studio-card p-2 rounded-lg border border-studio-border">
                <input
                  type="color"
                  value={project.backgroundColor}
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
                  type="text"
                  value={project.backgroundColor}
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
              <label className="block text-[11px] font-medium text-zinc-400">
                Predefinições
              </label>
              <div className="grid grid-cols-2 gap-1.5">
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
                      style={{
                        background: preset.gradient || preset.color,
                      }}
                    />
                    <span className="text-[11px] text-zinc-300 truncate">
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
