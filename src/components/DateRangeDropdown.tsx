'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface DateRangeOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface DateRangeDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DateRangeOption[];
}

export default function DateRangeDropdown({ value, onChange, options }: DateRangeDropdownProps) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-card border border-border-color hover:border-gold/30 rounded-lg text-xs font-semibold text-text-primary transition cursor-pointer"
      >
        {current?.label ?? 'Select range'}
        <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1.5 w-48 glass-card rounded-xl shadow-lg z-20 overflow-hidden animate-fade-in-up">
            {options.map((opt) => (
              <button
                key={opt.value}
                disabled={opt.disabled}
                title={opt.disabled ? 'Needs Hermes backend support for historical data' : undefined}
                onClick={() => {
                  if (opt.disabled) return;
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 text-xs font-medium transition ${
                  opt.disabled
                    ? 'text-text-muted/50 cursor-not-allowed'
                    : opt.value === value
                    ? 'bg-gold/10 text-gold'
                    : 'text-text-secondary hover:bg-bg-card hover:text-text-primary cursor-pointer'
                }`}
              >
                {opt.label}
                {opt.disabled && <span className="ml-1.5 text-[10px]">(coming soon)</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
