import React, { useState } from "react";
import {
  PanelLeft,
  ChevronDown,
  Download,
  Plus,
  Settings,
  Share2,
  Check,
} from "lucide-react";
import { ModelOption } from "../types";

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: "gemini-3.7-flash",
    name: "Gemini 3.7 Flash",
    description: "Fast, intelligent, and optimized for real-time streaming",
    badge: "Recommended",
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash Lite",
    description: "Ultra-low latency lightweight model",
    badge: "Fast",
  },
  {
    id: "gemini-flash-latest",
    name: "Gemini Flash Latest",
    description: "Always points to the latest Gemini Flash release",
  },
];

interface HeaderProps {
  currentModel: string;
  onSelectModel: (modelId: string) => void;
  onToggleSidebar: () => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  onExportChat?: () => void;
  hasMessages: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentModel,
  onSelectModel,
  onToggleSidebar,
  onNewChat,
  onOpenSettings,
  onExportChat,
  hasMessages,
}) => {
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const activeModelObj =
    AVAILABLE_MODELS.find((m) => m.id === currentModel) || AVAILABLE_MODELS[0];

  const handleShareApp = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 sm:px-6 bg-white/90 backdrop-blur-xs border-b border-slate-100">
      {/* Left items: sidebar toggle + model picker */}
      <div className="flex items-center gap-2">
        <button
          id="sidebar-toggle-button"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        {/* Model Dropdown Trigger */}
        <div className="relative">
          <button
            id="model-selector-dropdown"
            onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-800 hover:bg-slate-100/70 transition-colors"
          >
            <span>{activeModelObj.name}</span>
            {activeModelObj.badge && (
              <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                {activeModelObj.badge}
              </span>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Dropdown Menu */}
          {modelDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setModelDropdownOpen(false)}
              />
              <div className="absolute left-0 top-full mt-1.5 w-72 bg-white rounded-xl border border-slate-200 shadow-lg z-50 p-1.5 space-y-1">
                <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Select Model
                </div>
                {AVAILABLE_MODELS.map((model) => {
                  const isSelected = model.id === currentModel;
                  return (
                    <button
                      key={model.id}
                      id={`model-option-${model.id}`}
                      onClick={() => {
                        onSelectModel(model.id);
                        setModelDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-lg text-xs transition-all ${
                        isSelected
                          ? "bg-slate-100 text-slate-950 font-semibold"
                          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-medium text-slate-900">{model.name}</span>
                        {model.badge && (
                          <span className="text-[10px] font-semibold px-1 py-0.2 rounded bg-slate-100 text-slate-600">
                            {model.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-normal line-clamp-1">
                        {model.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1">
        {hasMessages && onExportChat && (
          <button
            id="export-chat-button"
            onClick={onExportChat}
            aria-label="Export conversation"
            title="Download Chat Markdown"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
        )}

        <button
          id="share-link-button"
          onClick={handleShareApp}
          aria-label="Share link"
          title="Copy app link"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
        >
          {copiedShare ? (
            <Check className="w-4 h-4 text-emerald-600" />
          ) : (
            <Share2 className="w-4 h-4" />
          )}
        </button>

        <button
          id="header-settings-button"
          onClick={onOpenSettings}
          aria-label="Settings"
          title="Chat Settings"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>

        <button
          id="header-new-chat-button"
          onClick={onNewChat}
          aria-label="New chat"
          title="New conversation"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-medium transition-all shadow-xs ml-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New</span>
        </button>
      </div>
    </header>
  );
};
