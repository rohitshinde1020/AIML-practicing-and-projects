import React, { useRef, useEffect } from "react";
import { ArrowUp, Square, Globe } from "lucide-react";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  isStreaming: boolean;
  useSearch: boolean;
  setUseSearch: (val: boolean | ((prev: boolean) => boolean)) => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  onSend,
  onStop,
  isStreaming,
  useSearch,
  setUseSearch,
  disabled = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const nextHeight = Math.min(textareaRef.current.scrollHeight, 200);
      textareaRef.current.style.height = `${nextHeight}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && input.trim() && !disabled) {
        onSend();
      }
    }
  };

  return (
    <div className="w-full bg-white pt-2 pb-5 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        {/* Input box wrapper */}
        <div
          id="chat-input-box"
          className="relative flex flex-col rounded-2xl border border-slate-200 shadow-sm focus-within:border-slate-300 focus-within:ring-4 focus-within:ring-slate-100/80 bg-white p-3.5 transition-all"
        >
          <textarea
            ref={textareaRef}
            id="chat-prompt-textarea"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isStreaming ? "Generating response..." : "Ask anything..."}
            rows={1}
            disabled={disabled}
            className="w-full bg-transparent text-slate-900 placeholder:text-slate-400 text-sm sm:text-base resize-none focus:outline-hidden max-h-48 leading-relaxed"
          />

          {/* Bottom Toolbar inside the box */}
          <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-slate-100">
            {/* Left action tools */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                id="toggle-search-grounding"
                onClick={() => setUseSearch((prev) => !prev)}
                title="Toggle Google Web Search Grounding"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  useSearch
                    ? "bg-slate-900 text-white border border-slate-900 shadow-xs"
                    : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Globe className={`w-3.5 h-3.5 ${useSearch ? "text-slate-200" : "text-slate-500"}`} />
                <span>Search {useSearch ? "ON" : "OFF"}</span>
              </button>
            </div>

            {/* Right Action: Send or Stop */}
            <div className="flex items-center gap-2">
              {isStreaming ? (
                <button
                  type="button"
                  id="stop-generation-button"
                  onClick={onStop}
                  aria-label="Stop generation"
                  className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 transition-transform active:scale-95 shadow-xs"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              ) : (
                <button
                  type="button"
                  id="send-message-button"
                  onClick={onSend}
                  disabled={!input.trim() || disabled}
                  aria-label="Send message"
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                    input.trim() && !disabled
                      ? "bg-slate-900 text-white hover:bg-slate-800 cursor-pointer shadow-xs active:scale-95"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Disclaimer / footer */}
        <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400 px-1">
          <span>AI can make mistakes. Verify important information.</span>
          <span className="hidden sm:inline">Press Enter ↵ to send</span>
        </div>
      </div>
    </div>
  );
};
