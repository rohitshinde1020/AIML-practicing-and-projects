import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, ArrowDown } from "lucide-react";
import {
  ChatMessage,
  Conversation,
  AppSettings,
} from "./types";
import {
  loadConversations,
  saveConversations,
  loadActiveConversationId,
  saveActiveConversationId,
  loadSettings,
  saveSettings,
  DEFAULT_SETTINGS,
} from "./utils/storage";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { ChatMessageItem } from "./components/ChatMessageItem";
import { ChatInput } from "./components/ChatInput";
import { EmptyState } from "./components/EmptyState";
import { SettingsModal } from "./components/SettingsModal";

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    loadConversations()
  );
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    () => loadActiveConversationId()
  );
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [currentModel, setCurrentModel] = useState<string>(settings.model);
  const [useSearch, setUseSearch] = useState<boolean>(settings.useSearch);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync state to LocalStorage
  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    saveActiveConversationId(activeConversationId);
  }, [activeConversationId]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Adjust sidebar default based on screen size on mount
  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

  // Keyboard shortcut: Ctrl+K or Cmd+K to start new chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        handleNewChat();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Get active conversation object
  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  );
  const messages = activeConversation ? activeConversation.messages : [];

  // Scroll to bottom smoothly
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  }, []);

  // Handle scroll detection for "Scroll to bottom" floating button
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setShowScrollBottom(distanceFromBottom > 150);
  };

  // Scroll down whenever messages change
  useEffect(() => {
    if (!showScrollBottom) {
      scrollToBottom("smooth");
    }
  }, [messages, isStreaming, scrollToBottom, showScrollBottom]);

  // Create New Chat
  const handleNewChat = () => {
    if (isStreaming) {
      handleStopStreaming();
    }
    setActiveConversationId(null);
    setInput("");
  };

  // Select conversation
  const handleSelectConversation = (id: string) => {
    if (isStreaming) {
      handleStopStreaming();
    }
    setActiveConversationId(id);
    const selected = conversations.find((c) => c.id === id);
    if (selected) {
      setCurrentModel(selected.model || settings.model);
      if (typeof selected.useSearch === "boolean") {
        setUseSearch(selected.useSearch);
      }
    }
  };

  // Delete conversation
  const handleDeleteConversation = (id: string) => {
    const next = conversations.filter((c) => c.id !== id);
    setConversations(next);
    if (activeConversationId === id) {
      setActiveConversationId(next.length > 0 ? next[0].id : null);
    }
  };

  // Rename conversation
  const handleRenameConversation = (id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
    );
  };

  // Clear all conversations
  const handleClearAll = () => {
    if (isStreaming) {
      handleStopStreaming();
    }
    setConversations([]);
    setActiveConversationId(null);
  };

  // Stop streaming
  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);

    // Update active assistant message to not streaming
    if (activeConversationId) {
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id !== activeConversationId) return conv;
          const updatedMessages = conv.messages.map((m, idx) => {
            if (idx === conv.messages.length - 1 && m.isStreaming) {
              return { ...m, isStreaming: false };
            }
            return m;
          });
          return { ...conv, messages: updatedMessages };
        })
      );
    }
  };

  // Generate a concise title for new conversations
  const generateTitle = (text: string) => {
    const cleaned = text.replace(/\n+/g, " ").trim();
    if (cleaned.length <= 32) return cleaned;
    return cleaned.slice(0, 32) + "...";
  };

  // Core stream runner
  const executeStream = async (
    allMessages: ChatMessage[],
    convId: string,
    assistantMsgId: string
  ) => {
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setIsStreaming(true);

    try {
      // Format payload for backend
      const payloadMessages = allMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: payloadMessages,
          model: currentModel,
          systemInstruction: settings.systemInstruction,
          temperature: settings.temperature,
          useSearch,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error("No response body received from stream.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(trimmed.slice(6));

            if (data.type === "chunk" && data.text) {
              setConversations((prev) =>
                prev.map((c) => {
                  if (c.id !== convId) return c;
                  return {
                    ...c,
                    updatedAt: Date.now(),
                    messages: c.messages.map((m) =>
                      m.id === assistantMsgId
                        ? { ...m, content: m.content + data.text, isStreaming: true }
                        : m
                    ),
                  };
                })
              );
            } else if (data.type === "grounding" && data.sources) {
              setConversations((prev) =>
                prev.map((c) => {
                  if (c.id !== convId) return c;
                  return {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === assistantMsgId
                        ? { ...m, sources: data.sources }
                        : m
                    ),
                  };
                })
              );
            } else if (data.type === "error") {
              setConversations((prev) =>
                prev.map((c) => {
                  if (c.id !== convId) return c;
                  return {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === assistantMsgId
                        ? {
                            ...m,
                            error: data.error || "Generation error.",
                            isStreaming: false,
                          }
                        : m
                    ),
                  };
                })
              );
            } else if (data.type === "done") {
              // Completed stream
            }
          } catch (jsonErr) {
            console.error("Failed to parse SSE line:", jsonErr, trimmed);
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        console.log("Stream aborted by user.");
      } else {
        const message =
          err instanceof Error ? err.message : "Failed to connect to AI server.";
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== convId) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      error: message,
                      isStreaming: false,
                    }
                  : m
              ),
            };
          })
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;

      // Finalize assistant message streaming state
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== convId) return c;
          return {
            ...c,
            updatedAt: Date.now(),
            messages: c.messages.map((m) =>
              m.id === assistantMsgId ? { ...m, isStreaming: false } : m
            ),
          };
        })
      );
    }
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const promptText = (textToSend || input).trim();
    if (!promptText || isStreaming) return;

    setInput("");

    const now = Date.now();
    const userMsgId = `user-${now}`;
    const assistantMsgId = `asst-${now + 1}`;

    const userMessage: ChatMessage = {
      id: userMsgId,
      role: "user",
      content: promptText,
      timestamp: now,
    };

    const initialAssistantMessage: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: now + 1,
      isStreaming: true,
    };

    let targetConvId = activeConversationId;

    if (!targetConvId) {
      // Create new conversation
      targetConvId = `conv-${now}`;
      const newConv: Conversation = {
        id: targetConvId,
        title: generateTitle(promptText),
        messages: [userMessage, initialAssistantMessage],
        createdAt: now,
        updatedAt: now,
        model: currentModel,
        useSearch,
      };

      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(targetConvId);

      // Execute stream with new conversation messages
      executeStream([userMessage], targetConvId, assistantMsgId);
    } else {
      // Append to existing conversation
      const currentConv = conversations.find((c) => c.id === targetConvId);
      const updatedMessages = currentConv
        ? [...currentConv.messages, userMessage, initialAssistantMessage]
        : [userMessage, initialAssistantMessage];

      setConversations((prev) =>
        prev.map((c) =>
          c.id === targetConvId
            ? {
                ...c,
                updatedAt: now,
                messages: updatedMessages,
              }
            : c
        )
      );

      // Send all historical messages including the new user message
      const historyToSend = currentConv
        ? [...currentConv.messages, userMessage]
        : [userMessage];

      executeStream(historyToSend, targetConvId, assistantMsgId);
    }
  };

  // Regenerate last assistant response
  const handleRegenerate = () => {
    if (!activeConversation || isStreaming) return;

    const msgs = [...activeConversation.messages];
    if (msgs.length === 0) return;

    // Find the last assistant message
    const lastMsg = msgs[msgs.length - 1];
    let historyToUse: ChatMessage[] = [];
    const now = Date.now();
    const assistantMsgId = `asst-regen-${now}`;

    if (lastMsg.role === "assistant") {
      historyToUse = msgs.slice(0, -1);
    } else {
      historyToUse = msgs;
    }

    if (historyToUse.length === 0) return;

    const newAssistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: now,
      isStreaming: true,
    };

    const finalMessages = [...historyToUse, newAssistantMsg];

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? {
              ...c,
              updatedAt: now,
              messages: finalMessages,
            }
          : c
      )
    );

    executeStream(historyToUse, activeConversation.id, assistantMsgId);
  };

  // Edit user message and re-run conversation from that point
  const handleEditUserMessage = (messageId: string, newContent: string) => {
    if (!activeConversation || isStreaming) return;

    const msgIndex = activeConversation.messages.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) return;

    const updatedUserMessage: ChatMessage = {
      ...activeConversation.messages[msgIndex],
      content: newContent,
      timestamp: Date.now(),
    };

    const now = Date.now();
    const assistantMsgId = `asst-edit-${now}`;

    const newAssistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: now + 1,
      isStreaming: true,
    };

    // Trim conversation up to the edited message and append new assistant placeholder
    const truncatedHistory = [
      ...activeConversation.messages.slice(0, msgIndex),
      updatedUserMessage,
    ];

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? {
              ...c,
              updatedAt: now,
              messages: [...truncatedHistory, newAssistantMsg],
            }
          : c
      )
    );

    executeStream(truncatedHistory, activeConversation.id, assistantMsgId);
  };

  // Export current chat transcript as Markdown
  const handleExportChat = () => {
    if (!activeConversation || activeConversation.messages.length === 0) return;

    let markdown = `# ${activeConversation.title}\n\n`;
    markdown += `*Exported on ${new Date().toLocaleString()}*\n\n---\n\n`;

    activeConversation.messages.forEach((m) => {
      const sender = m.role === "user" ? "### User" : "### Assistant";
      markdown += `${sender}\n\n${m.content}\n\n---\n\n`;
    });

    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeConversation.title.replace(/[^a-zA-Z0-9]/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-slate-800 antialiased font-sans">
      {/* Left Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onClearAll={handleClearAll}
        onOpenSettings={() => setSettingsModalOpen(true)}
      />

      {/* Main Chat Workspace */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-white relative">
        {/* Sticky Top Header */}
        <Header
          currentModel={currentModel}
          onSelectModel={(modelId) => setCurrentModel(modelId)}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          onNewChat={handleNewChat}
          onOpenSettings={() => setSettingsModalOpen(true)}
          onExportChat={handleExportChat}
          hasMessages={messages.length > 0}
        />

        {/* Scrollable Conversation Content */}
        <main
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto bg-white flex flex-col"
        >
          {messages.length === 0 ? (
            <EmptyState
              onSelectPrompt={(prompt) => {
                handleSendMessage(prompt);
              }}
            />
          ) : (
            <div className="flex-1 pb-6 divide-y divide-slate-100">
              {messages.map((message, index) => (
                <ChatMessageItem
                  key={message.id}
                  message={message}
                  isLastAssistant={
                    message.role === "assistant" &&
                    index === messages.length - 1
                  }
                  onRegenerate={handleRegenerate}
                  onEditUserMessage={handleEditUserMessage}
                />
              ))}
              <div ref={messagesEndRef} className="h-1" />
            </div>
          )}
        </main>

        {/* Scroll to Bottom Floating Pill */}
        {showScrollBottom && (
          <button
            onClick={() => scrollToBottom("smooth")}
            aria-label="Scroll to bottom"
            className="absolute bottom-24 right-8 z-20 p-2 rounded-full bg-white border border-slate-200 text-slate-600 shadow-md hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        )}

        {/* Bottom Chat Input Bar */}
        <ChatInput
          input={input}
          setInput={setInput}
          onSend={() => handleSendMessage()}
          onStop={handleStopStreaming}
          isStreaming={isStreaming}
          useSearch={useSearch}
          setUseSearch={setUseSearch}
        />
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={(newSettings) => {
          setSettings(newSettings);
          setCurrentModel(newSettings.model);
          setUseSearch(newSettings.useSearch);
        }}
      />
    </div>
  );
}
