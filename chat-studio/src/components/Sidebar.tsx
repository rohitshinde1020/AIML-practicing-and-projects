import React, { useState } from "react";
import {
  Plus,
  MessageSquare,
  Trash2,
  Edit2,
  Check,
  X,
  Settings,
  PanelLeftClose,
  Search,
  Bot,
} from "lucide-react";
import { Conversation } from "../types";

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onClearAll: () => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  isOpen,
  onClose,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
  onClearAll,
  onOpenSettings,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startRename = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const handleSaveRename = (id: string, e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteConversation(id);
  };

  // Group conversations by relative time
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  const groups: { label: string; items: Conversation[] }[] = [
    {
      label: "Today",
      items: filteredConversations.filter((c) => now - c.updatedAt < oneDay),
    },
    {
      label: "Yesterday",
      items: filteredConversations.filter(
        (c) => now - c.updatedAt >= oneDay && now - c.updatedAt < 2 * oneDay
      ),
    },
    {
      label: "Previous 7 Days",
      items: filteredConversations.filter(
        (c) => now - c.updatedAt >= 2 * oneDay && now - c.updatedAt < 7 * oneDay
      ),
    },
    {
      label: "Older",
      items: filteredConversations.filter((c) => now - c.updatedAt >= 7 * oneDay),
    },
  ].filter((g) => g.items.length > 0);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          id="sidebar-backdrop"
          onClick={onClose}
          className="fixed inset-0 bg-black/20 z-40 md:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="app-sidebar"
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col w-[270px] bg-slate-50/40 border-r border-slate-100 transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:w-[270px]"
        }`}
      >
        {/* Top Header */}
        <div className="p-3.5 flex items-center justify-between border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-xs">
              <Bot className="w-4 h-4" />
            </div>
            <span className="font-semibold text-slate-900 text-sm tracking-tight">
              Chat Studio
            </span>
          </div>

          <button
            id="close-sidebar-button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 md:hidden transition-colors"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* New Chat & Search */}
        <div className="p-3 space-y-2">
          <button
            id="new-chat-button"
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 768) onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-800 font-medium text-xs sm:text-sm shadow-xs transition-all group"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-slate-700 group-hover:text-slate-950" />
              <span>New chat</span>
            </div>
            <kbd className="hidden sm:inline-block text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
              Ctrl+K
            </kbd>
          </button>

          {conversations.length > 2 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                id="search-chats-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search history..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-300 transition-all"
              />
            </div>
          )}
        </div>

        {/* Conversations History List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-3 py-1">
          {conversations.length === 0 ? (
            <div className="text-center py-8 px-4 text-xs text-slate-400">
              No conversations yet. Start a new chat to get answers!
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400">
              No chats matching "{searchQuery}"
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.label} className="space-y-0.5">
                <div className="px-2.5 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {group.label}
                </div>
                {group.items.map((conv) => {
                  const isActive = conv.id === activeConversationId;
                  const isEditingThis = editingId === conv.id;

                  return (
                    <div
                      key={conv.id}
                      id={`conv-item-${conv.id}`}
                      onClick={() => {
                        onSelectConversation(conv.id);
                        if (window.innerWidth < 768) onClose();
                      }}
                      className={`group relative flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-all ${
                        isActive
                          ? "bg-white border border-slate-200/80 shadow-xs text-slate-900 font-semibold"
                          : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 font-medium"
                      }`}
                    >
                      {isEditingThis ? (
                        <div
                          className="flex items-center gap-1 w-full"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveRename(conv.id, e);
                              if (e.key === "Escape") handleCancelRename(e as unknown as React.MouseEvent);
                            }}
                            autoFocus
                            className="flex-1 px-1.5 py-0.5 text-xs rounded border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-400"
                          />
                          <button
                            onClick={(e) => handleSaveRename(conv.id, e)}
                            className="p-1 rounded text-emerald-600 hover:bg-emerald-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={handleCancelRename}
                            className="p-1 rounded text-slate-400 hover:bg-slate-200"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? "text-slate-700" : "text-slate-400"}`} />
                            <span className="truncate">{conv.title || "Untitled Chat"}</span>
                          </div>

                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => startRename(conv, e)}
                              aria-label="Rename chat"
                              title="Rename"
                              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/70"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => handleDelete(conv.id, e)}
                              aria-label="Delete chat"
                              title="Delete"
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Bottom Section */}
        <div className="p-3 border-t border-slate-100 bg-white space-y-1">
          {conversations.length > 0 && (
            confirmClear ? (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 space-y-1.5">
                <p className="font-medium">Clear all chats?</p>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      onClearAll();
                      setConfirmClear(false);
                    }}
                    className="px-2.5 py-1 bg-rose-600 text-white rounded-md text-[11px] font-medium hover:bg-rose-700 shadow-xs"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded-md text-[11px] hover:bg-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                id="clear-chats-button"
                onClick={() => setConfirmClear(true)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50/60 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear conversations</span>
              </button>
            )
          )}

          <button
            id="open-settings-button"
            onClick={onOpenSettings}
            className="w-full flex items-center justify-between px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100/80 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>Model & Settings</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono border border-slate-200/60">
              Config
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};
