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
  FavoriteOverlay,
  FrameLayoutId,
  Mode,
  PhotoFilter,
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

interface UserLibrary {
  stickers: string[];
  bgs: string[];
}

interface ProjectContextValue {
  project: Project;
  frame: ReturnType<typeof getFrame>;
  frames: typeof FRAMES;
  userLibrary: UserLibrary;
  setMode: (mode: Mode) => void;
  setLayout: (layoutId: FrameLayoutId) => void;
  setCaption: (caption: string) => void;
  setSlotPhoto: (index: number, dataUrl: string | null, captureIdx?: number | null) => void;
  setSlotFavorite: (index: number, favorite: FavoriteOverlay | null) => void;
  addCapture: (dataUrl: string) => void;
  removeCapture: (index: number) => void;
  clearCaptures: () => void;
  setFrameBg: (color: string) => void;
  setFrameBgImage: (url: string | null) => void;
  setFilter: (filter: PhotoFilter) => void;
  addSticker: (stickerId: string) => string;
  moveSticker: (id: string, x: number, y: number) => void;
  scaleSticker: (id: string, scale: number) => void;
  rotateSticker: (id: string, rotation: number) => void;
  removeSticker: (id: string) => void;
  clearStickers: () => void;
  addUserSticker: (dataUrl: string) => void;
  removeUserSticker: (dataUrl: string) => void;
  addUserBg: (dataUrl: string) => void;
  removeUserBg: (dataUrl: string) => void;
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
const USER_LIB_KEY = 'favoritecut:user-library:v1';

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

function loadUserLibrary(): UserLibrary {
  if (typeof window === 'undefined') return { stickers: [], bgs: [] };
  try {
    const raw = window.localStorage.getItem(USER_LIB_KEY);
    if (!raw) return { stickers: [], bgs: [] };
    const parsed = JSON.parse(raw) as Partial<UserLibrary>;
    return {
      stickers: Array.isArray(parsed.stickers) ? parsed.stickers.filter((s): s is string => typeof s === 'string') : [],
      bgs: Array.isArray(parsed.bgs) ? parsed.bgs.filter((s): s is string => typeof s === 'string') : [],
    };
  } catch {
    return { stickers: [], bgs: [] };
  }
}

function persistUserLibrary(lib: UserLibrary) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(USER_LIB_KEY, JSON.stringify(lib));
  } catch {
    // ignore quota
  }
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [project, setProject] = useState<Project>(
    () => loadStored() ?? initialProject('default')
  );
  const [userLibrary, setUserLibrary] = useState<UserLibrary>(() =>
    loadUserLibrary()
  );

  // Persist on every change so refresh / accidental tab close keeps state.
  useEffect(() => {
    persist(project);
  }, [project]);

  useEffect(() => {
    persistUserLibrary(userLibrary);
  }, [userLibrary]);

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

  const setSlotPhoto = useCallback(
    (index: number, dataUrl: string | null, captureIdx: number | null = null) => {
      setProject((p) => ({
        ...p,
        slots: p.slots.map((s) =>
          s.index === index
            ? { ...s, photo: dataUrl, captureIdx: dataUrl ? captureIdx : null }
            : s
        ),
      }));
    },
    []
  );

  const setSlotFavorite = useCallback(
    (index: number, favorite: FavoriteOverlay | null) => {
      setProject((p) => ({
        ...p,
        slots: p.slots.map((s) =>
          s.index === index
            ? { ...s, favorite: favorite ?? undefined }
            : s
        ),
      }));
    },
    []
  );

  const addCapture = useCallback((dataUrl: string) => {
    // 같은 카메라 프레임을 두 번 찍으면 dataURL이 동일할 수 있음.
    // 그러면 React key 충돌 + URL 기반 매칭이 어긋남.
    // hash(#)는 img/canvas 렌더에서 무시되므로 시각엔 영향 없고, 식별만 unique 보장.
    const unique = `${dataUrl}#cap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setProject((p) => ({ ...p, captures: [...p.captures, unique] }));
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

  const addSticker = useCallback((stickerId: string): string => {
    const newId = nextStickerId();
    setProject((p) => ({
      ...p,
      stickers: [
        ...p.stickers,
        {
          id: newId,
          stickerId,
          x: 0.5,
          y: 0.5,
          scale: 1.6,
          rotation: 0,
        },
      ],
    }));
    return newId;
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

  const addUserSticker = useCallback((dataUrl: string) => {
    if (!dataUrl.startsWith('data:image/')) return;
    setUserLibrary((lib) => {
      if (lib.stickers.includes(dataUrl)) return lib;
      return { ...lib, stickers: [dataUrl, ...lib.stickers] };
    });
  }, []);

  const removeUserSticker = useCallback((dataUrl: string) => {
    setUserLibrary((lib) => ({
      ...lib,
      stickers: lib.stickers.filter((s) => s !== dataUrl),
    }));
  }, []);

  const addUserBg = useCallback((dataUrl: string) => {
    if (!dataUrl.startsWith('data:image/')) return;
    setUserLibrary((lib) => {
      if (lib.bgs.includes(dataUrl)) return lib;
      return { ...lib, bgs: [dataUrl, ...lib.bgs] };
    });
  }, []);

  const removeUserBg = useCallback((dataUrl: string) => {
    setUserLibrary((lib) => ({
      ...lib,
      bgs: lib.bgs.filter((s) => s !== dataUrl),
    }));
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
      userLibrary,
      setMode,
      setLayout,
      setCaption,
      setSlotPhoto,
      setSlotFavorite,
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
      addUserSticker,
      removeUserSticker,
      addUserBg,
      removeUserBg,
      reset,
    }),
    [
      project,
      userLibrary,
      setMode,
      setLayout,
      setCaption,
      setSlotPhoto,
      setSlotFavorite,
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
      addUserSticker,
      removeUserSticker,
      addUserBg,
      removeUserBg,
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
