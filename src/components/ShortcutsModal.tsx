import React, { useEffect, useRef } from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  title: string;
  items: { keys: string[]; label: string }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Camada selecionada',
    items: [
      { keys: ['←', '↑', '→', '↓'], label: 'Mover camada (2px)' },
      { keys: ['Shift', 'Setas'], label: 'Mover camada rápido (20px)' },
      { keys: ['R'], label: 'Girar +90° (Shift+R gira -90°)' },
      { keys: ['H'], label: 'Espelhar horizontalmente' },
      { keys: ['V'], label: 'Espelhar verticalmente' },
      { keys: ['C'], label: 'Cortar imagem selecionada' },
      { keys: ['L'], label: 'Bloquear / desbloquear camada' },
      { keys: ['Shift', 'H'], label: 'Ocultar / mostrar camada' },
      { keys: ['Ctrl/⌘', ']'], label: 'Trazer camada para frente' },
      { keys: ['Ctrl/⌘', '['], label: 'Enviar camada para trás' },
      { keys: ['Ctrl/⌘', 'D'], label: 'Duplicar camada' },
      { keys: ['Ctrl/⌘', 'C / V'], label: 'Copiar / colar no ponto clicado' },
      { keys: ['Delete'], label: 'Excluir camada selecionada' },
    ],
  },
  {
    title: 'Navegação e visualização',
    items: [
      { keys: ['+', '/ -'], label: 'Aumentar / diminuir zoom' },
      { keys: ['0'], label: 'Ajustar carrossel à tela' },
      { keys: ['1'], label: 'Zoom 100%' },
      { keys: ['G'], label: 'Mostrar / ocultar guias de corte' },
      { keys: ['['], label: 'Recolher / expandir Biblioteca' },
      { keys: [']'], label: 'Recolher / expandir Propriedades' },
      { keys: ['\\'], label: 'Alternar modo foco (ambos painéis)' },
      { keys: ['Tab'], label: 'Alternar entre camadas visíveis' },
      { keys: ['Esc'], label: 'Desselecionar camada' },
    ],
  },
  {
    title: 'Ações gerais',
    items: [
      { keys: ['Ctrl/⌘', 'Z'], label: 'Desfazer' },
      { keys: ['Ctrl/⌘', 'Shift', 'Z'], label: 'Refazer' },
      { keys: ['T'], label: 'Inserir camada de texto' },
      { keys: ['Ctrl/⌘', 'E'], label: 'Abrir exportação' },
      { keys: ['Ctrl/⌘', 'Shift', 'G'], label: 'Abrir criador de GIF / Vídeo' },
      { keys: ['?'], label: 'Abrir esta lista de atalhos' },
    ],
  },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

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

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: 'any' } as React.DialogHTMLAttributes<HTMLDialogElement>)}
      aria-labelledby="shortcuts-dialog-title"
      className="w-[95vw] max-w-[680px]"
    >
      <div className="flex flex-col max-h-[86vh]">
        <div className="px-4 sm:px-5 py-3.5 border-b border-studio-border flex items-center justify-between bg-studio-panel">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-accent" />
            <div>
              <h2
                id="shortcuts-dialog-title"
                className="text-sm font-semibold text-white"
              >
                Atalhos de Teclado
              </h2>
              <p className="text-[11px] text-zinc-400">
                Agilize a edição do carrossel diretamente pelo teclado
              </p>
            </div>
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

        <div className="p-4 sm:p-5 overflow-y-auto bg-studio-bg space-y-5">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title} className="space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                {group.title}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {group.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-studio-panel border border-studio-border"
                  >
                    <span className="text-xs text-zinc-300 truncate">
                      {item.label}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.keys.map((k, idx) => (
                        <kbd
                          key={`${k}-${idx}`}
                          className="px-1.5 py-0.5 rounded bg-studio-card border border-zinc-700 text-[10px] font-mono text-zinc-200"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </dialog>
  );
};
