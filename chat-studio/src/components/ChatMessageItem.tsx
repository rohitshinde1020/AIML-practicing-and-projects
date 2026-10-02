import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check, RotateCcw, Edit2, Bot, User, Globe, AlertCircle } from "lucide-react";
import { ChatMessage } from "../types";
import { CodeBlock } from "./CodeBlock";

interface ChatMessageItemProps {
  message: ChatMessage;
  isLastAssistant: boolean;
  onRegenerate?: () => void;
  onEditUserMessage?: (messageId: string, newContent: string) => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  isLastAssistant,
  onRegenerate,
  onEditUserMessage,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const isUser = message.role === "user";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== message.content && onEditUserMessage) {
      onEditUserMessage(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  return (
    <div
      id={`message-${message.id}`}
      className={`group w-full py-5 px-4 sm:px-6 transition-colors ${
        isUser ? "bg-white" : "bg-slate-50/40 border-y border-slate-100"
      }`}
    >
      <div className="max-w-3xl mx-auto flex gap-4 items-start">
        {/* Avatar */}
        <div className="flex-shrink-0 pt-0.5">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-semibold text-xs shadow-xs">
              <User className="w-4 h-4 text-slate-100" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-emerald-600 flex items-center justify-center shadow-xs">
              <Bot className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Content Container */}
        <div className="flex-1 min-w-0">
          {/* Header Role Label */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-slate-900">
              {isUser ? "You" : "Chat Studio"}
            </span>
            <span className="text-xs text-slate-400">
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          {/* User Message Edit Mode */}
          {isUser && isEditing ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                className="w-full p-3 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-y"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-3.5 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
                >
                  Save & Submit
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-3.5 py-1.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* Rendered Content */
            <div className="text-slate-800 text-[15px] leading-relaxed">
              {isUser ? (
                <div className="whitespace-pre-wrap font-normal text-slate-800">
                  {message.content}
                </div>
              ) : (
                <div className="markdown-body">
                  <div className="markdown-content">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ className, children }) {
                          const match = /language-(\w+)/.exec(className || "");
                          const codeString = String(children).replace(/\n$/, "");
                          const isInline = !match && !String(children).includes("\n");

                          if (isInline) {
                            return <code>{children}</code>;
                          }

                          return (
                            <CodeBlock
                              language={match ? match[1] : ""}
                              value={codeString}
                            />
                          );
                        },
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                    {message.isStreaming && <span className="streaming-cursor" />}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Banner */}
          {message.error && (
            <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">{message.error}</p>
              </div>
              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-md font-medium text-xs transition-colors"
                >
                  Retry
                </button>
              )}
            </div>
          )}

          {/* Grounding Sources */}
          {message.sources && message.sources.length > 0 && (
            <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-slate-400" /> Sources:
              </span>
              {message.sources.map((src, idx) => (
                <a
                  key={idx}
                  href={src.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs rounded-full bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  <span className="max-w-[160px] truncate">
                    {src.title || src.uri || `Source ${idx + 1}`}
                  </span>
                </a>
              ))}
            </div>
          )}

          {/* Action Bar */}
          {!message.isStreaming && !isEditing && (
            <div className="flex items-center gap-1 mt-2.5 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleCopy}
                aria-label="Copy message"
                title="Copy text"
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>

              {isUser && onEditUserMessage && (
                <button
                  onClick={() => setIsEditing(true)}
                  aria-label="Edit message"
                  title="Edit prompt"
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}

              {!isUser && isLastAssistant && onRegenerate && (
                <button
                  onClick={onRegenerate}
                  aria-label="Regenerate response"
                  title="Regenerate answer"
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
