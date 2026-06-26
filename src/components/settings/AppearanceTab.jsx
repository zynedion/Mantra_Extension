import React, { useEffect, useRef, useState } from 'react';

const FONTS = [
  { value: 'WildWords', label: 'WildWords (clean, modern)', googleName: 'Fredoka One' },
  { value: 'Heroika', label: 'Heroika (bold)', googleName: 'Fredoka' },
  { value: 'Shonen', label: 'Shonen (classic manga)', googleName: 'Fredoka Mono' },
  { value: 'KomikaJam', label: 'Komika Jam (playful)', googleName: 'Comfortaa' },
  { value: 'Bangers', label: 'Bangers (action)', googleName: 'Bangers' }
];

const ALIGNMENTS = ['left', 'center', 'right'];

function useDebouncedSetting(value, onChange, delay = 300) {
  const [local, setLocal] = useState(value);
  const timeoutRef = useRef(null);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  const update = (newVal) => {
    setLocal(newVal);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onChange(newVal);
    }, delay);
  };

  return [local, update];
}

export default function AppearanceTab({ settings, updateSetting }) {
  return (
    <div className="tab-pane">
      <h2>Appearance</h2>

      <section className="setting-group">
        <label>Font Family</label>
        <select
          value={settings.fontFamily}
          onChange={(e) => updateSetting('fontFamily', e.target.value)}
        >
          {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <div className="font-preview" style={{ fontFamily: FONTS.find(f => f.value === settings.fontFamily)?.googleName || 'sans-serif' }}>
          The quick brown fox jumps
        </div>
      </section>

      <SliderRow label="Font Size" min={6} max={48} unit="px" value={settings.fontSize} onChange={(v) => updateSetting('fontSize', v)} />

      <section className="setting-group setting-row">
        <label>Font Color</label>
        <input type="color" value={settings.fontColor} onChange={(e) => updateSetting('fontColor', e.target.value)} />
      </section>

      <section className="setting-group setting-row">
        <label>Stroke Color</label>
        <input type="color" value={settings.strokeColor} onChange={(e) => updateSetting('strokeColor', e.target.value)} />
      </section>

      <SliderRow label="Stroke Size" min={0} max={10} unit="px" value={settings.strokeSize} onChange={(v) => updateSetting('strokeSize', v)} />

      <section className="setting-group">
        <label>Text Alignment</label>
        <div className="button-group">
          {ALIGNMENTS.map(a => (
            <button
              key={a}
              type="button"
              className={`align-btn ${settings.textAlignment === a ? 'active' : ''}`}
              onClick={() => updateSetting('textAlignment', a)}
            >
              {a.charAt(0).toUpperCase() + a.slice(1)}
            </button>
          ))}
        </div>
      </section>

      <SliderRow label="Line Spacing" min={50} max={200} unit="%" value={settings.lineSpacing} onChange={(v) => updateSetting('lineSpacing', v)} />
      <SliderRow label="Letter Spacing" min={-2} max={10} unit="px" value={settings.letterSpacing} onChange={(v) => updateSetting('letterSpacing', v)} />
      <SliderRow label="Border Radius" min={0} max={20} unit="px" value={settings.borderRadius} onChange={(v) => updateSetting('borderRadius', v)} />
      <SliderRow label="Border Padding" min={0} max={20} unit="px" value={settings.borderPadding} onChange={(v) => updateSetting('borderPadding', v)} />
      <SliderRow label="Floating Icon Opacity" min={0.1} max={1} step={0.1} unit="" value={settings.iconOpacity} onChange={(v) => updateSetting('iconOpacity', v)} />
    </div>
  );
}

function SliderRow({ label, min, max, step = 1, unit, value, onChange }) {
  const [localValue, setLocalValue] = useDebouncedSetting(value, onChange, 300);

  return (
    <section className="setting-group">
      <div className="slider-header">
        <label>{label}</label>
        <span className="slider-value">{localValue}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={localValue}
        onChange={(e) => setLocalValue(parseFloat(e.target.value))}
      />
    </section>
  );
}
