import { useEffect, useRef, useState } from 'react';
import {
  clamp01,
  hexToHsv,
  hexToRgb,
  hsvToHex,
  normalizeHex,
  type HSV,
} from '../utils/color';
import styles from './ColorPicker.module.css';

interface Props {
  value: string;
  presets?: string[];
  onChange: (color: string) => void;
}

const DEFAULT_PRESETS = [
  '#ffffff',
  '#fff8ec',
  '#ffd6e0',
  '#ffe8b3',
  '#cfeee3',
  '#cfe6ff',
  '#e3d9ff',
  '#1a1a1a',
];

export default function ColorPicker({ value, presets = DEFAULT_PRESETS, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const isPreset = presets.some((p) => p.toLowerCase() === value.toLowerCase());

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <div className={styles.swatchRow}>
        {presets.map((color) => {
          const active = color.toLowerCase() === value.toLowerCase();
          return (
            <button
              key={color}
              type="button"
              className={`${styles.swatch} ${active ? styles.active : ''}`}
              style={{ background: color }}
              onClick={() => onChange(color)}
              aria-label={`색상 ${color}`}
            />
          );
        })}
        <button
          type="button"
          className={`${styles.swatch} ${styles.customSwatch} ${!isPreset ? styles.active : ''}`}
          onClick={() => setOpen((o) => !o)}
          aria-label="커스텀 색상"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
      {open && <Popover value={value} onChange={onChange} />}
    </div>
  );
}

interface PopoverProps {
  value: string;
  onChange: (color: string) => void;
}

function Popover({ value, onChange }: PopoverProps) {
  const [hsv, setHsv] = useState<HSV>(() => hexToHsv(value));
  const [hexInput, setHexInput] = useState<string>(value.toUpperCase());
  const lastEmittedRef = useRef<string>(value.toLowerCase());

  // sync from outside (preset click while popover open, etc.)
  useEffect(() => {
    if (value.toLowerCase() !== lastEmittedRef.current) {
      setHsv(hexToHsv(value));
      setHexInput(value.toUpperCase());
      lastEmittedRef.current = value.toLowerCase();
    }
  }, [value]);

  const emit = (next: HSV) => {
    setHsv(next);
    const hex = hsvToHex(next);
    lastEmittedRef.current = hex.toLowerCase();
    setHexInput(hex.toUpperCase());
    onChange(hex);
  };

  // SV square drag
  const svRef = useRef<HTMLDivElement>(null);
  const svDraggingRef = useRef(false);

  const updateFromSvEvent = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!svRef.current) return;
    const rect = svRef.current.getBoundingClientRect();
    const s = clamp01((e.clientX - rect.left) / rect.width);
    const v = 1 - clamp01((e.clientY - rect.top) / rect.height);
    emit({ ...hsv, s, v });
  };

  const onSvDown = (e: React.PointerEvent<HTMLDivElement>) => {
    svDraggingRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    updateFromSvEvent(e);
  };
  const onSvMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!svDraggingRef.current) return;
    updateFromSvEvent(e);
  };
  const onSvUp = (e: React.PointerEvent<HTMLDivElement>) => {
    svDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  // Hue slider drag
  const hueRef = useRef<HTMLDivElement>(null);
  const hueDraggingRef = useRef(false);

  const updateFromHueEvent = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!hueRef.current) return;
    const rect = hueRef.current.getBoundingClientRect();
    const h = clamp01((e.clientX - rect.left) / rect.width) * 360;
    emit({ ...hsv, h });
  };

  const onHueDown = (e: React.PointerEvent<HTMLDivElement>) => {
    hueDraggingRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    updateFromHueEvent(e);
  };
  const onHueMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!hueDraggingRef.current) return;
    updateFromHueEvent(e);
  };
  const onHueUp = (e: React.PointerEvent<HTMLDivElement>) => {
    hueDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const onHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setHexInput(raw.toUpperCase());
    const norm = normalizeHex(raw);
    if (norm) {
      const next = hexToHsv(norm);
      lastEmittedRef.current = norm.toLowerCase();
      setHsv(next);
      onChange(norm);
    }
  };

  const previewHex = hsvToHex(hsv);
  const rgb = hexToRgb(previewHex);

  return (
    <div className={styles.popover}>
      <div
        ref={svRef}
        className={styles.svSquare}
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h}, 100%, 50%))`,
        }}
        onPointerDown={onSvDown}
        onPointerMove={onSvMove}
        onPointerUp={onSvUp}
        onPointerCancel={onSvUp}
      >
        <div
          className={styles.svDot}
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            background: previewHex,
          }}
        />
      </div>

      <div
        ref={hueRef}
        className={styles.hueSlider}
        onPointerDown={onHueDown}
        onPointerMove={onHueMove}
        onPointerUp={onHueUp}
        onPointerCancel={onHueUp}
      >
        <div
          className={styles.hueDot}
          style={{
            left: `${(hsv.h / 360) * 100}%`,
            background: `hsl(${hsv.h}, 100%, 50%)`,
          }}
        />
      </div>

      <div className={styles.hexRow}>
        <span className={styles.hashLabel}>HEX</span>
        <input
          type="text"
          className={styles.hexInput}
          value={hexInput.replace(/^#/, '')}
          onChange={(e) => {
            // user types without #
            onHexChange({
              ...e,
              target: { ...e.target, value: '#' + e.target.value },
            } as React.ChangeEvent<HTMLInputElement>);
          }}
          maxLength={6}
          spellCheck={false}
        />
      </div>

      <div className={styles.previewRow}>
        <div className={styles.previewSwatch} style={{ background: previewHex }} />
        <span className={styles.rgbText}>
          R {rgb.r}  G {rgb.g}  B {rgb.b}
        </span>
      </div>
    </div>
  );
}
