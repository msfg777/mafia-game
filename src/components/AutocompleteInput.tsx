'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}

export function AutocompleteInput({ value, onChange, placeholder }: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        inputRef.current && !inputRef.current.contains(e.target as Node) &&
        listRef.current && !listRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const updatePos = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropPos({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX, width: rect.width });
  }, []);

  const fetchSuggestions = useCallback(async (v: string) => {
    if (!v || v.length < 1) { setSuggestions([]); setOpen(false); return; }
    try {
      const res = await fetch(`/api/players?q=${encodeURIComponent(v)}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setSuggestions(list);
      if (list.length > 0) { updatePos(); setOpen(true); }
      else setOpen(false);
    } catch { setSuggestions([]); setOpen(false); }
  }, [updatePos]);

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); fetchSuggestions(e.target.value); }}
        onFocus={() => { if (value.length > 0) fetchSuggestions(value); }}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
      {open && suggestions.length > 0 && typeof window !== 'undefined' && (
        <div
          ref={listRef}
          style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, width: Math.max(dropPos.width, 140), zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded shadow-xl"
        >
          {suggestions.map(s => (
            <div key={s} className="px-2 py-1.5 text-xs hover:bg-blue-50 cursor-pointer"
              onMouseDown={e => { e.preventDefault(); onChange(s); setOpen(false); setSuggestions([]); }}>
              {s}
            </div>
          ))}
        </div>
      )}
    </>
  );
}