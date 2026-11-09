import React, { useState, useRef } from 'react';
import {
  Plus,
  Minus,
  Download,
  Film,
  RotateCcw,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Columns3,
  Maximize2,
  PanelLeft,
  PanelRight,
} from 'lucide-react';
import type { CarouselProject, InstagramFormatId } from '../types/carousel';
import { INSTAGRAM_FORMATS } from '../types/carousel';

interface TopToolbarProps {
  project: CarouselProject;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  onFitToScreen: () => void;
  saveStatus: 'saved' | 'saving';
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onUpdateProject: (updater: (prev: CarouselProject) => CarouselProject) => void;
  onOpenExportModal: () => void;
  onOpenGifModal: () => void;
  onResetDemo: () => void;
  isLeftSidebarOpen: boolean;
  onToggleLeftSidebar: () => void;
  isRightSidebarOpen: boolean;
  onToggleRightSidebar: () => void;
}

export const TopToolbar: React.FC<TopToolbarProps> = ({
  project,
  zoom,
  setZoom,
  onFitToScreen,
  saveStatus,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onUpdateProject,
  onOpenExportModal,
  onOpenGifModal,
  onResetDemo,
  isLeftSidebarOpen,
  onToggleLeftSidebar,
  isRightSidebarOpen,
  onToggleRightSidebar,
}) => {
  const [editingTitle, setEditingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const currentFormat = INSTAGRAM_FORMATS[project.formatId];

  const handleFormatChange = (newFormatId: InstagramFormatId) => {
    onUpdateProject((prev) => ({
      ...prev,
      formatId: newFormatId,
    }));
  };

  const handleSlidesCountChange = (delta: number) => {
    onUpdateProject((prev) => {
      const nextCount = Math.max(1, Math.min(10, prev.slidesCount + delta));
      return {
        ...prev,
        slidesCount: nextCount,
      };
    });
  };

  return (
    <header className="min-h-13 py-1.5 md:py-0 bg-studio-panel border-b border-studio-border px-2 sm:px-3 flex flex-wrap md:flex-nowrap items-center justify-between gap-1.5 sm:gap-2 shrink-0 z-30">
      {/* Left: Sidebar Toggle + Project Name + Undo/Redo */}
      <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 order-1">
        <button
          type="button"
          onClick={onToggleLeftSidebar}
          title={
            isLeftSidebarOpen
              ? 'Ocultar painel esquerdo (Biblioteca)'
              : 'Mostrar painel esquerdo (Biblioteca)'
          }
          className={`btn-press p-1.5 rounded-md border transition-colors ${
            isLeftSidebarOpen
              ? 'bg-studio-card text-zinc-200 border-studio-border hover:text-white'
              : 'bg-studio-bg text-zinc-500 border-transparent hover:text-zinc-200 hover:bg-studio-hover'
          }`}
        >
          <PanelLeft className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2 px-0.5 sm:px-1 min-w-0">
          <div className="w-6 h-6 rounded-md bg-white text-black flex items-center justify-center font-bold text-xs tracking-tighter shrink-0">
            IC
          </div>

          {editingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={project.title}
              onChange={(e) =>
                onUpdateProject((p) => ({ ...p, title: e.target.value }))
              }
              onBlur={() => setEditingTitle(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setEditingTitle(false);
              }}
              autoFocus
              className="bg-studio-card text-xs font-medium text-white px-2 py-1 rounded border border-accent focus:outline-none w-28 sm:w-36"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingTitle(true)}
              title="Renomear projeto"
              className="text-xs font-medium text-zinc-200 hover:text-white px-1 sm:px-1.5 py-1 rounded hover:bg-studio-hover transition-colors truncate max-w-[96px] sm:max-w-[160px]"
            >
              {project.title}
            </button>
          )}

          <span
            title={
              saveStatus === 'saving'
                ? 'Salvando no navegador...'
                : 'Salvo localmente no navegador'
            }
            className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${
              saveStatus === 'saving' ? 'bg-amber-400' : 'bg-emerald-500'
            }`}
          />
        </div>

        <div className="h-4 w-[1px] bg-studio-border mx-0.5 hidden sm:block" />

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Desfazer (Ctrl+Z / Cmd+Z)"
            className="btn-press p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-studio-hover disabled:opacity-30 disabled:pointer-events-none"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="Refazer (Ctrl+Shift+Z / Cmd+Shift+Z)"
            className="btn-press p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-studio-hover disabled:opacity-30 disabled:pointer-events-none"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Center: Format Selector, Slide Counter, Guides & Zoom */}
      <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto max-w-full w-full md:w-auto order-3 md:order-2 pb-0.5 md:pb-0 no-scrollbar justify-between md:justify-center">
        {/* Format Segmented Control */}
        <div className="flex items-center bg-studio-bg p-0.5 rounded-lg border border-studio-border shrink-0">
          {(Object.keys(INSTAGRAM_FORMATS) as InstagramFormatId[]).map((fId) => {
            const fmt = INSTAGRAM_FORMATS[fId];
            const active = project.formatId === fId;
            return (
              <button
                key={fId}
                type="button"
                onClick={() => handleFormatChange(fId)}
                title={fmt.description}
                className={`btn-press px-2 sm:px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
                  active
                    ? 'bg-studio-card text-white shadow-xs border border-studio-border'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span className="font-mono text-[11px]">{fmt.ratioLabel}</span>
                <span className="hidden xl:inline text-[11px] text-zinc-400">
                  {fmt.name.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Slide Count Stepper */}
        <div className="flex items-center gap-1 bg-studio-bg px-1.5 sm:px-2 py-0.5 rounded-lg border border-studio-border h-[30px] shrink-0">
          <span className="hidden sm:inline text-[11px] text-zinc-400">
            Quadros
          </span>
          <button
            type="button"
            onClick={() => handleSlidesCountChange(-1)}
            disabled={project.slidesCount <= 1}
            title="Remover último quadro"
            className="btn-press w-5 h-5 rounded hover:bg-studio-hover disabled:opacity-30 flex items-center justify-center text-zinc-300"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="text-xs font-mono font-medium text-white w-4 text-center">
            {project.slidesCount}
          </span>
          <button
            type="button"
            onClick={() => handleSlidesCountChange(1)}
            disabled={project.slidesCount >= 10}
            title="Adicionar quadro (máx 10)"
            className="btn-press w-5 h-5 rounded hover:bg-studio-hover disabled:opacity-30 flex items-center justify-center text-zinc-300"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Seam Guides Toggle */}
        <button
          type="button"
          onClick={() =>
            onUpdateProject((p) => ({
              ...p,
              showSeamGuides: !p.showSeamGuides,
            }))
          }
          title="Mostrar/ocultar linhas de corte entre os quadros"
          className={`btn-press h-[30px] px-2 sm:px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border shrink-0 ${
            project.showSeamGuides
              ? 'bg-accent/10 text-accent border-accent/30'
              : 'bg-studio-bg text-zinc-400 border-studio-border hover:text-zinc-200'
          }`}
        >
          <Columns3 className="w-3.5 h-3.5" />
          <span className="hidden md:inline text-[11px]">Guias</span>
        </button>

        {/* Zoom Controls (Visible on both mobile & desktop) */}
        <div className="flex items-center bg-studio-bg px-1 rounded-lg border border-studio-border h-[30px] shrink-0">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.12, +(z - 0.05).toFixed(2)))}
            title="Diminuir zoom"
            className="btn-press p-1 rounded text-zinc-400 hover:text-white"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onFitToScreen}
            title="Ajustar zoom à tela"
            className="text-[11px] font-mono text-zinc-300 hover:text-white px-1"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.05).toFixed(2)))}
            title="Aumentar zoom"
            className="btn-press p-1 rounded text-zinc-400 hover:text-white"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onFitToScreen}
            title="Centralizar e caber na tela"
            className="btn-press p-1 rounded text-zinc-400 hover:text-white border-l border-studio-border ml-0.5 pl-1.5"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Right: Reset, GIF Studio, Export */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 order-2 md:order-3">
        <button
          type="button"
          onClick={onResetDemo}
          title="Restaurar composição de exemplo"
          className="btn-press h-8 px-2 sm:px-2.5 rounded-lg bg-studio-card hover:bg-studio-hover text-zinc-400 hover:text-zinc-200 border border-studio-border text-xs flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">Resetar</span>
        </button>

        <button
          type="button"
          onClick={onOpenGifModal}
          className="btn-press h-8 px-2 sm:px-3 rounded-lg bg-studio-card hover:bg-studio-hover text-zinc-100 border border-studio-border flex items-center gap-1.5 text-xs font-medium"
        >
          <Film className="w-3.5 h-3.5 text-zinc-400" />
          <span className="hidden sm:inline">Criar GIF</span>
          <span className="sm:hidden">GIF</span>
        </button>

        <button
          type="button"
          onClick={onOpenExportModal}
          className="btn-press h-8 px-2.5 sm:px-3.5 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 flex items-center gap-1.5 text-xs font-semibold shadow-xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Exportar</span>
        </button>

        <button
          type="button"
          onClick={onToggleRightSidebar}
          title={
            isRightSidebarOpen
              ? 'Ocultar painel direito (Propriedades e Camadas)'
              : 'Mostrar painel direito (Propriedades e Camadas)'
          }
          className={`btn-press p-1.5 rounded-md border transition-colors ${
            isRightSidebarOpen
              ? 'bg-studio-card text-zinc-200 border-studio-border hover:text-white'
              : 'bg-studio-bg text-zinc-500 border-transparent hover:text-zinc-200 hover:bg-studio-hover'
          }`}
        >
          <PanelRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
