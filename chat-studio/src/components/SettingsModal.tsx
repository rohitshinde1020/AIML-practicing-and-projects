import React, { useState, useEffect } from "react";
import { X, Sliders, Sparkles, RefreshCw, Check } from "lucide-react";
import { AppSettings } from "../types";
import { AVAILABLE_MODELS } from "./Header";
import { DEFAULT_SETTINGS } from "../utils/storage";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [current, setCurrent] = useState<AppSettings>(settings);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    setCurrent(settings);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings(current);
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      onClose();
    }, 400);
  };

  const handleReset = () => {
    setCurrent(DEFAULT_SETTINGS);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        id="settings-modal-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-black/30 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Dialog */}
      <div
        id="settings-modal-dialog"
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-slate-700" />
            <h2 className="text-base font-semibold text-slate-900">Settings & Model</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Default Model */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Default LLM Model
            </label>
            <select
              id="settings-model-select"
              value={current.model}
              onChange={(e) => setCurrent({ ...current, model: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
            >
              {AVAILABLE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.badge || "Standard"})
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Powered by Google Gemini models with full streaming support.
            </p>
          </div>

          {/* Temperature */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Temperature ({current.temperature})
              </label>
              <span className="text-xs font-medium text-slate-500">
                {current.temperature <= 0.2
                  ? "Precise & Deterministic"
                  : current.temperature >= 0.8
                  ? "Creative & Diverse"
                  : "Balanced"}
              </span>
            </div>
            <input
              id="settings-temperature-slider"
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={current.temperature}
              onChange={(e) =>
                setCurrent({ ...current, temperature: parseFloat(e.target.value) })
              }
              className="w-full accent-slate-900 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
              <span>0.0 (Precise)</span>
              <span>0.7 (Default)</span>
              <span>1.0 (Creative)</span>
            </div>
          </div>

          {/* System Instructions */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              System Instruction
            </label>
            <textarea
              id="settings-system-prompt"
              rows={3}
              value={current.systemInstruction}
              onChange={(e) =>
                setCurrent({ ...current, systemInstruction: e.target.value })
              }
              placeholder="e.g. You are an expert TypeScript engineer..."
              className="w-full p-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900 leading-relaxed resize-y"
            />
            <p className="text-xs text-slate-500 mt-1">
              Directs the overall persona, format, and behavior of the assistant.
            </p>
          </div>

          {/* Search Grounding Default */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/70">
            <div>
              <div className="text-xs font-semibold text-slate-900">
                Google Search Grounding
              </div>
              <div className="text-xs text-slate-500">
                Enable live Google Search grounding on upcoming queries
              </div>
            </div>
            <input
              type="checkbox"
              id="settings-search-checkbox"
              checked={current.useSearch}
              onChange={(e) =>
                setCurrent({ ...current, useSearch: e.target.checked })
              }
              className="w-4 h-4 accent-slate-900 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              id="save-settings-button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs"
            >
              {savedToast ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
