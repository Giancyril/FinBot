import React, { useState, useRef, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";

export default function CustomDatePicker({
  value,
  onChange,
  placeholder = "Select date",
  max,
  min,
  openUp = false,
  size = "md",
}) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => value ? parseInt(value.split("-")[0]) : new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => value ? parseInt(value.split("-")[1]) - 1 : new Date().getMonth());
  const [shouldOpenUp, setShouldOpenUp] = useState(openUp);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const spaceAbove = rect.top;
      
      let parent = ref.current.parentElement;
      let insideScrollContainer = false;
      let parentTopSpace = 0;
      
      while (parent) {
        const style = window.getComputedStyle(parent);
        const overflowY = style.overflowY;
        if (overflowY === "auto" || overflowY === "scroll" || overflowY === "hidden") {
          insideScrollContainer = true;
          const parentRect = parent.getBoundingClientRect();
          parentTopSpace = rect.top - parentRect.top;
          break;
        }
        parent = parent.parentElement;
      }

      if (insideScrollContainer) {
        if (openUp && parentTopSpace >= 360) {
          setShouldOpenUp(true);
        } else {
          setShouldOpenUp(false);
        }
      } else {
        if (openUp && spaceAbove >= 360) {
          setShouldOpenUp(true);
        } else {
          setShouldOpenUp(false);
        }
      }
    }
  }, [open, openUp]);

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DAYS   = ["Su","Mo","Tu","We","Th","Fr","Sa"];

  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const isSelected = (day) => {
    if (!value) return false;
    const [y, m, d] = value.split("-").map(Number);
    return y === viewYear && (m - 1) === viewMonth && d === day;
  };

  const isToday = (day) => {
    const t = new Date();
    return t.getFullYear() === viewYear && t.getMonth() === viewMonth && t.getDate() === day;
  };

  const isDisabled = (day) => {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const dateStr = `${viewYear}-${mm}-${dd}`;
    if (max && dateStr > max) return true;
    if (min && dateStr < min) return true;
    return false;
  };

  const pick = (day) => {
    if (isDisabled(day)) return;
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    onChange(`${viewYear}-${mm}-${dd}`);
    setOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const display = (() => {
    if (!value) return placeholder;
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
  })();

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2 bg-gray-800/60 border border-white/5 rounded-xl cursor-pointer select-none transition-all duration-200 ${
          size === "sm" ? "px-3 py-2.5 text-xs" : "px-4 py-2.5 text-sm"
        } ${
          open ? "ring-2 ring-indigo-500/60 border-indigo-500/50" : "hover:border-white/10"
        } ${value ? "text-white" : "text-gray-500"}`}
      >
        <Calendar size={size === "sm" ? 11 : 13} className={value ? "text-indigo-400 shrink-0" : "text-gray-600 shrink-0"} />
        <span className={`${size === "sm" ? "text-xs" : "text-sm"} flex-1 truncate whitespace-nowrap text-left`}>{display}</span>
        {value && (
          <span
            role="button"
            onClick={e => { e.stopPropagation(); onChange(""); }}
            className="text-gray-500 hover:text-gray-300 transition-colors cursor-pointer shrink-0 animate-in fade-in zoom-in duration-100"
          >
            <X size={10} />
          </span>
        )}
      </div>

      {open && (
        <div className={`absolute z-[999] ${shouldOpenUp ? "bottom-full mb-2" : "top-full mt-2"} bg-gray-900 border border-white/10 rounded-2xl shadow-2xl shadow-black/60 w-72 overflow-hidden left-0 animate-in fade-in slide-in-from-top-1 duration-150`}>
          <div className="p-4">
            {/* Month/Year nav */}
            <div className="flex items-center justify-between mb-4">
              <button type="button" onClick={prevMonth}
                className="w-8 h-8 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                <ChevronLeft size={12} />
              </button>
              <span className="text-white text-sm font-bold">{MONTHS[viewMonth]} {viewYear}</span>
              <button type="button" onClick={nextMonth}
                className="w-8 h-8 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                <ChevronRight size={12} />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map(d => (
                <div key={d} className="text-center text-[10px] font-bold text-gray-500 uppercase py-1">{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((day, i) => (
                <div key={i}>
                  {day === null ? <div /> : (
                    <button
                      type="button"
                      onClick={() => pick(day)}
                      disabled={isDisabled(day)}
                      className={`w-full aspect-square rounded-xl text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                        isSelected(day)
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/40"
                          : isToday(day)
                            ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
                            : "text-gray-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {day}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Footer actions */}
            <div className="flex justify-between mt-4 pt-3 border-t border-white/5">
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false); }}
                className="text-xs text-gray-500 hover:text-gray-300 font-semibold transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => {
                  const t = new Date();
                  setViewYear(t.getFullYear());
                  setViewMonth(t.getMonth());
                  pick(t.getDate());
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors px-2 py-1 rounded-lg hover:bg-indigo-500/10"
              >
                Today
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
