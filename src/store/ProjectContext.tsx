import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  FrameLayoutId,
  Mode,
  PhotoFilter,
  PlacedSticker,
  Project,
  Slot,
} from '../types';
import {
  DEFAULT_FRAME_BG,
  DEFAULT_LAYOUT,
  FRAMES,
  getFrame,
  todayCaption,
} from '../frames/frames';

interface ProjectContextValue {
  project: Project;
  frame: ReturnType<typeof getFrame>;
  frames: typeof FRAMES;
  setMode: (mode: Mode) => void;
  setLayout: (layoutId: FrameLayoutId) => void;
  setCaption: (caption: string) => void;
  setSlotPhoto: (index: number, dataUrl: string | null) => void;
  addCapture: (dataUrl: string) => void;
  removeCapture: (index: number) => void;
  clearCaptures: () => void;
  setFrameBg: (color: string) => void;
  setFrameBgImage: (url: string | null) => void;
  setFilter: (filter: PhotoFilter) => void;
  addSticker: (stickerId: string) => void;
  moveSticker: (id: string, x: number, y: number) => void;
  scaleSticker: (id: string, scale: number) => void;
  rotateSticker: (id: string, rotation: number) => void;
  removeSticker: (id: string) => void;
  clearStickers: () => void;
  reset: () => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

function makeSlots(count: number): Slot[] {
  return Array.from({ length: count }, (_, i) => ({
    index: i,
    photo: null,
  }));
}

function initialProject(mode: Mode = 'default'): Project {
  const layoutId = DEFAULT_LAYOUT;
  const frame = getFrame(layoutId);
  return {
    mode,
    layoutId,
    caption: todayCaption(),
    slots: makeSlots(frame.count),
    captures: [],
    frameBg: DEFAULT_FRAME_BG,
    frameBgImage: null,
    filter: 'none',
    stickers: [],
  };
}

let stickerSeq = 0;
function nextStickerId(): string {
  stickerSeq += 1;
  return `s${Date.now()}-${stickerSeq}`;
}

const STORAGE_KEY = 'favoritecut:project:v1';

function loadStored(): Project | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Project>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.layoutId !== 'string') return null;
    if (!Array.isArray(parsed.slots) || !Array.isArray(parsed.captures)) return null;
    if (!Array.isArray(parsed.stickers)) return null;
    return parsed as Project;
  } catch {
    return null;
  }
}

function persist(project: Project) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  } catch {
    // Quota exceeded or storage disabled — skip silently.
  }
}

function clearStored() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [project, setProject] = useState<Project>(
    () => loadStored() ?? initialProject('default')
  );

  // Persist on every change so refresh / accidental tab close keeps state.
  useEffect(() => {
    persist(project);
  }, [project]);

  const setMode = useCallback((mode: Mode) => {
    setProject(() => initialProject(mode));
  }, []);

  const setLayout = useCallback((layoutId: FrameLayoutId) => {
    setProject((p) => {
      const frame = getFrame(layoutId);
      return { ...p, layoutId, slots: makeSlots(frame.count), captures: [] };
    });
  }, []);

  const setCaption = useCallback((caption: string) => {
    setProject((p) => ({ ...p, caption }));
  }, []);

  const setSlotPhoto = useCallback((index: number, dataUrl: string | null) => {
    setProject((p) => ({
      ...p,
      slots: p.slots.map((s) =>
        s.index === index ? { ...s, photo: dataUrl } : s
      ),
    }));
  }, []);

  const addCapture = useCallback((dataUrl: string) => {
    setProject((p) => ({ ...p, captures: [...p.captures, dataUrl] }));
  }, []);

  const removeCapture = useCallback((index: number) => {
    setProject((p) => ({
      ...p,
      captures: p.captures.filter((_, i) => i !== index),
    }));
  }, []);

  const clearCaptures = useCallback(() => {
    setProject((p) => ({ ...p, captures: [] }));
  }, []);

  const setFrameBg = useCallback((color: string) => {
    setProject((p) => ({ ...p, frameBg: color }));
  }, []);

  const setFrameBgImage = useCallback((url: string | null) => {
    setProject((p) => ({ ...p, frameBgImage: url }));
  }, []);

  const setFilter = useCallback((filter: PhotoFilter) => {
    setProject((p) => ({ ...p, filter }));
  }, []);

  const addSticker = useCallback((stickerId: string) => {
    setProject((p) => {
      const sticker: PlacedSticker = {
        id: nextStickerId(),
        stickerId,
        x: 0.5,
        y: 0.5,
        scale: 1.6,
        rotation: 0,
      };
      return { ...p, stickers: [...p.stickers, sticker] };
    });
  }, []);

  const moveSticker = useCallback((id: string, x: number, y: number) => {
    setProject((p) => ({
      ...p,
      stickers: p.stickers.map((s) => (s.id === id ? { ...s, x, y } : s)),
    }));
  }, []);

  const scaleSticker = useCallback((id: string, scale: number) => {
    setProject((p) => ({
      ...p,
      stickers: p.stickers.map((s) => (s.id === id ? { ...s, scale } : s)),
    }));
  }, []);

  const rotateSticker = useCallback((id: string, rotation: number) => {
    setProject((p) => ({
      ...p,
      stickers: p.stickers.map((s) => (s.id === id ? { ...s, rotation } : s)),
    }));
  }, []);

  const removeSticker = useCallback((id: string) => {
    setProject((p) => ({
      ...p,
      stickers: p.stickers.filter((s) => s.id !== id),
    }));
  }, []);

  const clearStickers = useCallback(() => {
    setProject((p) => ({ ...p, stickers: [] }));
  }, []);

  const reset = useCallback(() => {
    clearStored();
    setProject((p) => initialProject(p.mode));
  }, []);

  const value = useMemo<ProjectContextValue>(
    () => ({
      project,
      frame: getFrame(project.layoutId),
      frames: FRAMES,
      setMode,
      setLayout,
      setCaption,
      setSlotPhoto,
      addCapture,
      removeCapture,
      clearCaptures,
      setFrameBg,
      setFrameBgImage,
      setFilter,
      addSticker,
      moveSticker,
      scaleSticker,
      rotateSticker,
      removeSticker,
      clearStickers,
      reset,
    }),
    [
      project,
      setMode,
      setLayout,
      setCaption,
      setSlotPhoto,
      addCapture,
      removeCapture,
      clearCaptures,
      setFrameBg,
      setFrameBgImage,
      setFilter,
      addSticker,
      moveSticker,
      scaleSticker,
      rotateSticker,
      removeSticker,
      clearStickers,
      reset,
    ]
  );

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
}

export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used inside <ProjectProvider>');
  return ctx;
}
