import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  CanvasLayer,
  CarouselProject,
  ImageCrop,
} from '../types/carousel';
import { INSTAGRAM_FORMATS } from '../types/carousel';
import {
  clearProjectInBrowser,
  createDefaultProject,
  loadProjectFromBrowser,
  saveProjectToBrowser,
} from '../utils/storage';

interface UseCarouselProjectOptions {
  setSelectedLayerId: React.Dispatch<React.SetStateAction<string | null>>;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  setIsLeftSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsRightSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

interface ProjectHistoryState {
  past: CarouselProject[];
  present: CarouselProject;
  future: CarouselProject[];
}

export function useCarouselProject({
  setSelectedLayerId,
  setZoom,
  setIsLeftSidebarOpen,
  setIsRightSidebarOpen,
}: UseCarouselProjectOptions) {
  const [history, setHistory] = useState<ProjectHistoryState>(() => ({
    past: [],
    present: createDefaultProject(),
    future: [],
  }));
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');

  const project = history.present;
  const projectRef = useRef(project);
  const saveStatusRef = useRef(saveStatus);

  useEffect(() => {
    projectRef.current = project;
    saveStatusRef.current = saveStatus;
  }, [project, saveStatus]);

  useEffect(() => {
    let active = true;
    if (window.innerWidth < 768) {
      setIsLeftSidebarOpen(false);
      setIsRightSidebarOpen(false);
    }
    loadProjectFromBrowser().then((loaded) => {
      if (!active) return;
      setHistory({ past: [], present: loaded, future: [] });
      if (loaded.layers.length > 0) setSelectedLayerId(loaded.layers[0].id);
      setIsLoaded(true);
      if (window.innerWidth < 768) {
        const fmt = INSTAGRAM_FORMATS[loaded.formatId];
        const nextZoom = Math.min(
          Math.max(260, window.innerWidth - 36) / (fmt.width * loaded.slidesCount),
          Math.max(240, window.innerHeight - 170) / fmt.height,
          0.85
        );
        setZoom(Math.max(0.12, +nextZoom.toFixed(2)));
      }
    });
    return () => {
      active = false;
    };
  }, [setIsLeftSidebarOpen, setIsRightSidebarOpen, setSelectedLayerId, setZoom]);

  useEffect(() => {
    if (!isLoaded) return;
    if (saveStatusRef.current !== 'saving') setSaveStatus('saving');
    const timer = setTimeout(() => {
      saveProjectToBrowser(project).then(() => setSaveStatus('saved'));
    }, 700);
    return () => clearTimeout(timer);
  }, [project, isLoaded]);

  const setProject = useCallback(
    (updater: React.SetStateAction<CarouselProject>) => {
      setHistory((prev) => ({
        ...prev,
        present:
          typeof updater === 'function' ? updater(prev.present) : updater,
      }));
    },
    []
  );

  const commitHistory = useCallback(() => {
    setHistory((prev) => ({
      past: [...prev.past.slice(-29), prev.present],
      present: prev.present,
      future: [],
    }));
  }, []);

  const handleUndo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev;
      const previous = prev.past[prev.past.length - 1];
      return {
        past: prev.past.slice(0, -1),
        present: previous,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  const handleRedo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev;
      const next = prev.future[0];
      return {
        past: [...prev.past.slice(-29), prev.present],
        present: next,
        future: prev.future.slice(1),
      };
    });
  }, []);

  const handleUpdateProject = useCallback(
    (updater: (prev: CarouselProject) => CarouselProject) => {
      setHistory((prev) => ({
        past: [...prev.past.slice(-29), prev.present],
        present: updater(prev.present),
        future: [],
      }));
    },
    []
  );

  const handleUpdateLayer = useCallback(
    (
      layerId: string,
      updater: (layer: CanvasLayer) => CanvasLayer,
      recordHistory = true
    ) => {
      setHistory((prev) => ({
        past: recordHistory ? [...prev.past.slice(-29), prev.present] : prev.past,
        present: {
          ...prev.present,
          layers: prev.present.layers.map((l) =>
            l.id === layerId ? updater(l) : l
          ),
        },
        future: recordHistory ? [] : prev.future,
      }));
    },
    []
  );

  const handleDeleteLayer = useCallback(
    (layerId: string) => {
      setHistory((prev) => ({
        past: [...prev.past.slice(-29), prev.present],
        present: {
          ...prev.present,
          layers: prev.present.layers.filter((l) => l.id !== layerId),
        },
        future: [],
      }));
      setSelectedLayerId((prevId) => (prevId === layerId ? null : prevId));
    },
    [setSelectedLayerId]
  );

  const handleDuplicateLayer = useCallback(
    (layer: CanvasLayer) => {
      const newId = `layer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setHistory((prev) => {
        const maxZ = prev.present.layers.reduce((m, l) => Math.max(m, l.zIndex), 0);
        return {
          past: [...prev.past.slice(-29), prev.present],
          present: {
            ...prev.present,
            layers: [
              ...prev.present.layers,
              {
                ...layer,
                id: newId,
                name: `${layer.name} (cópia)`,
                x: layer.x + 60,
                y: layer.y + 60,
                zIndex: maxZ + 1,
              },
            ],
          },
          future: [],
        };
      });
      setSelectedLayerId(newId);
    },
    [setSelectedLayerId]
  );

  const handleApplyCrop = useCallback(
    (layerId: string, crop: ImageCrop, newWidth: number, newHeight: number) => {
      setHistory((prev) => ({
        past: [...prev.past.slice(-29), prev.present],
        present: {
          ...prev.present,
          layers: prev.present.layers.map((l) =>
            l.id === layerId && l.type === 'image'
              ? { ...l, crop, width: newWidth, height: newHeight }
              : l
          ),
        },
        future: [],
      }));
    },
    []
  );

  const handleResetDemo = useCallback(async () => {
    const fresh = await clearProjectInBrowser();
    setHistory({ past: [], present: fresh, future: [] });
    setSelectedLayerId(fresh.layers[0]?.id || null);
  }, [setSelectedLayerId]);

  return {
    project,
    setProject,
    projectRef,
    saveStatus,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    commitHistory,
    handleUndo,
    handleRedo,
    handleUpdateProject,
    handleUpdateLayer,
    handleDeleteLayer,
    handleDuplicateLayer,
    handleApplyCrop,
    handleResetDemo,
  };
}
