import React from "react";
import { Code, Sparkles, PenTool, Lightbulb, Compass, MessageSquare } from "lucide-react";

interface EmptyStateProps {
  onSelectPrompt: (prompt: string) => void;
}

interface Suggestion {
  icon: React.ReactNode;
  category: string;
  title: string;
  prompt: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onSelectPrompt }) => {
  const suggestions: Suggestion[] = [
    {
      icon: <Code className="w-4 h-4 text-slate-700" />,
      category: "Code & Build",
      title: "Write a TypeScript debounce hook",
      prompt: "Write a clean, production-ready custom React TypeScript hook for debouncing input values with full type annotations.",
    },
    {
      icon: <PenTool className="w-4 h-4 text-slate-700" />,
      category: "Draft & Write",
      title: "Craft a polite client follow-up email",
      prompt: "Draft a friendly yet professional follow-up email to a client regarding an outstanding project proposal and timeline.",
    },
    {
      icon: <Lightbulb className="w-4 h-4 text-slate-700" />,
      category: "Brainstorm",
      title: "Brainstorm names for a SaaS tool",
      prompt: "Brainstorm 10 catchy, modern brand names and domains for a developer productivity platform, explaining the rationale for each.",
    },
    {
      icon: <Compass className="w-4 h-4 text-slate-700" />,
      category: "Analyze & Explain",
      title: "Explain how vector databases work",
      prompt: "Explain how vector embeddings and vector databases work in simple terms with a clear mental analogy and real-world use cases.",
    },
  ];

  return (
    <div id="chat-empty-state" className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-3xl mx-auto w-full">
      {/* Icon & Title */}
      <div className="mb-8">
        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center mx-auto mb-4 text-slate-900">
          <Sparkles className="w-6 h-6 text-slate-900" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 mb-2">
          What can I help with today?
        </h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Start a conversation, write code, analyze topics, or brainstorm ideas with real-time AI streaming.
        </p>
      </div>

      {/* Suggestion Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
        {suggestions.map((item, index) => (
          <button
            key={index}
            id={`suggestion-prompt-${index}`}
            onClick={() => onSelectPrompt(item.prompt)}
            className="flex flex-col text-left p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 transition-all text-slate-900 shadow-xs group"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-1 rounded-md bg-slate-100 group-hover:bg-slate-200 transition-colors">
                {item.icon}
              </div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {item.category}
              </span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-800 line-clamp-1 group-hover:text-slate-950">
              {item.title}
            </p>
          </button>
        ))}
      </div>

      {/* Subtle Hint */}
      <div className="mt-8 flex items-center gap-1.5 text-xs text-slate-400">
        <MessageSquare className="w-3.5 h-3.5" />
        <span>Type a prompt below or select a suggestion to begin</span>
      </div>
    </div>
  );
};
