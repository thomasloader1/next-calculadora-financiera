'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

export type KnobVariant = 'needs' | 'wants' | 'savings';

interface VolumeKnobProps {
  value: number;
  onChange: (newValue: number) => void;
  label: string;
  variant: KnobVariant;
}

const VARIANT_INK_VAR: Record<KnobVariant, string> = {
  needs: 'var(--color-needs-ink)',
  wants: 'var(--color-wants-ink)',
  savings: 'var(--color-savings-ink)',
};

const VARIANT_TEXT_CLASS: Record<KnobVariant, string> = {
  needs: 'text-needs-ink',
  wants: 'text-wants-ink',
  savings: 'text-savings-ink',
};

const MIN_ANGLE = -135;
const MAX_ANGLE = 135;
const SWEEP_ANGLE = MAX_ANGLE - MIN_ANGLE; // 270°
const SIZE = 58;
const CENTER = SIZE / 2;
const ARC_RADIUS = 22.5;
const TICK_RADIUS = 26.5;
const TICK_COUNT = 11;

function polarToCartesian(cx: number, cy: number, r: number, angleDegFromTop: number) {
  const rad = ((angleDegFromTop - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const sweep = endAngle - startAngle;
  if (sweep <= 0.1) return '';
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArcFlag = sweep > 180 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

function pointerAngleDeg(cx: number, cy: number, clientX: number, clientY: number): number {
  return (Math.atan2(clientX - cx, -(clientY - cy)) * 180) / Math.PI;
}

function clampPercent(v: number): number {
  return Math.min(100, Math.max(0, Math.round(v)));
}

export const VolumeKnob: React.FC<VolumeKnobProps> = ({
  value,
  onChange,
  label,
  variant,
}) => {
  const clamped = clampPercent(value);
  const angle = MIN_ANGLE + (clamped / 100) * SWEEP_ANGLE;
  const inkColor = VARIANT_INK_VAR[variant];
  const textClass = VARIANT_TEXT_CLASS[variant];

  const knobRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftText, setDraftText] = useState(String(clamped));

  const dragStateRef = useRef<{
    pointerId: number;
    mode: 'rotary' | 'linear';
    startX: number;
    startY: number;
    startValue: number;
    accumValue: number;
    lastAngle: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraftText(String(clamped));
    }
  }, [clamped, isEditing]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  // Attach non-passive wheel listener so scrolling over the knob adjusts % smoothly without scrolling the page
  const valueRef = useRef(clamped);
  valueRef.current = clamped;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const el = knobRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (isEditing) return;
      e.preventDefault();
      const step = e.shiftKey ? 5 : 1;
      const dir = e.deltaY < 0 ? 1 : -1;
      const next = clampPercent(valueRef.current + dir * step);
      if (next !== valueRef.current) {
        onChangeRef.current(next);
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [isEditing]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isEditing) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dist = Math.hypot(e.clientX - cx, e.clientY - cy);

    e.currentTarget.setPointerCapture(e.pointerId);
    dragStateRef.current = {
      pointerId: e.pointerId,
      mode: dist >= 12 ? 'rotary' : 'linear',
      startX: e.clientX,
      startY: e.clientY,
      startValue: clamped,
      accumValue: clamped,
      lastAngle: pointerAngleDeg(cx, cy, e.clientX, e.clientY),
      moved: false,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = dragStateRef.current;
    if (!st || st.pointerId !== e.pointerId) return;

    const totalMove = Math.hypot(e.clientX - st.startX, e.clientY - st.startY);
    if (totalMove >= 4) {
      st.moved = true;
    }
    if (!st.moved) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    let nextVal: number;
    if (st.mode === 'rotary' && Math.hypot(e.clientX - cx, e.clientY - cy) >= 8) {
      const curAngle = pointerAngleDeg(cx, cy, e.clientX, e.clientY);
      let deltaAngle = curAngle - st.lastAngle;
      if (deltaAngle > 180) deltaAngle -= 360;
      if (deltaAngle < -180) deltaAngle += 360;
      st.lastAngle = curAngle;
      st.accumValue = Math.min(100, Math.max(0, st.accumValue + (deltaAngle / SWEEP_ANGLE) * 100));
      nextVal = clampPercent(st.accumValue);
    } else {
      const dy = st.startY - e.clientY;
      const dx = e.clientX - st.startX;
      nextVal = clampPercent(st.startValue + (dy + dx * 0.4) * 0.65);
    }

    if (nextVal !== valueRef.current) {
      onChange(nextVal);
    }
  };

  const finishPointer = (e: React.PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const st = dragStateRef.current;
    if (!st || st.pointerId !== e.pointerId) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const wasClick = !cancelled && !st.moved;
    dragStateRef.current = null;
    setIsDragging(false);

    if (wasClick) {
      setDraftText(String(clamped));
      setIsEditing(true);
    }
  };

  const commitDraft = useCallback(() => {
    setIsEditing(false);
    const parsed = Number(draftText.replace(/[^\d]/g, ''));
    if (!Number.isNaN(parsed) && draftText.trim() !== '') {
      const next = clampPercent(parsed);
      if (next !== clamped) {
        onChange(next);
      }
    }
  }, [draftText, clamped, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isEditing) return;
    const step = e.shiftKey ? 5 : 1;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      onChange(clampPercent(clamped + step));
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      onChange(clampPercent(clamped - step));
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(100);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setDraftText(String(clamped));
      setIsEditing(true);
    }
  };

  const trackPath = describeArc(CENTER, CENTER, ARC_RADIUS, MIN_ANGLE, MAX_ANGLE);
  const valuePath = describeArc(CENTER, CENTER, ARC_RADIUS, MIN_ANGLE, angle);

  return (
    <div
      ref={knobRef}
      role="slider"
      tabIndex={isEditing ? -1 : 0}
      aria-label={`Porcentaje de ${label}`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-valuetext={`${clamped}%`}
      title="Girar, desplazar o tocar para cambiar el porcentaje"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(e) => finishPointer(e, false)}
      onPointerCancel={(e) => finishPointer(e, true)}
      onKeyDown={handleKeyDown}
      className={`relative w-[58px] h-[58px] shrink-0 select-none touch-none rounded-full inline-flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
        isEditing ? 'cursor-text' : isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
    >
      {/* Outer scale ticks & progress arc */}
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
      >
        {/* Scale ticks around perimeter */}
        {Array.from({ length: TICK_COUNT }).map((_, i) => {
          const tickPct = (i / (TICK_COUNT - 1)) * 100;
          const tickAngle = MIN_ANGLE + (tickPct / 100) * SWEEP_ANGLE;
          const pt = polarToCartesian(CENTER, CENTER, TICK_RADIUS, tickAngle);
          const active = tickPct <= clamped;
          return (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={i % 5 === 0 ? 1.35 : 0.95}
              fill={active ? inkColor : 'var(--color-ink)'}
              opacity={active ? 0.85 : 0.22}
            />
          );
        })}

        {/* Track arc */}
        <path
          d={trackPath}
          fill="none"
          stroke="var(--color-surface)"
          strokeOpacity={0.75}
          strokeWidth={3.2}
          strokeLinecap="round"
        />

        {/* Active value arc */}
        {valuePath && (
          <path
            d={valuePath}
            fill="none"
            stroke={inkColor}
            strokeWidth={3.2}
            strokeLinecap="round"
          />
        )}
      </svg>

      {/* Physical moulded rotary cap */}
      <div
        className={`relative w-[38px] h-[38px] rounded-full bg-surface flex items-center justify-center transition-transform duration-75 ${
          isDragging ? 'scale-[0.97]' : 'hover:scale-[1.03]'
        }`}
        style={{
          boxShadow:
            'inset 0 1.5px 0 var(--glint), 0 0 0 1px var(--color-rule), 0 3px 6px -2px color-mix(in oklab, var(--color-ink) 26%, transparent)',
        }}
      >
        {/* Rotating indicator notch */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{ transform: `rotate(${angle}deg)` }}
        >
          <span
            className="block mx-auto mt-[2.5px] w-[2.5px] h-[5px] rounded-full"
            style={{ backgroundColor: inkColor }}
          />
        </div>

        {/* Center value readout or inline input */}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            aria-label={`Escribir porcentaje de ${label}`}
            value={draftText}
            onChange={(e) => setDraftText(e.target.value.slice(0, 3))}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') {
                e.preventDefault();
                commitDraft();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setIsEditing(false);
                setDraftText(String(clamped));
              }
            }}
            className={`w-8 bg-transparent text-center font-display font-bold text-[11px] leading-none tabular-nums focus:outline-none ${textClass}`}
          />
        ) : (
          <span className={`font-display font-bold text-[11px] leading-none tabular-nums pt-0.5 ${textClass}`}>
            {clamped}%
          </span>
        )}
      </div>
    </div>
  );
};
