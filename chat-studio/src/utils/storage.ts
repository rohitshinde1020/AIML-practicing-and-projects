import { Conversation, AppSettings } from "../types";

const STORAGE_KEY_CONVERSATIONS = "chat_studio_conversations_v1";
const STORAGE_KEY_ACTIVE_ID = "chat_studio_active_conv_id_v1";
const STORAGE_KEY_SETTINGS = "chat_studio_settings_v1";

export const DEFAULT_SETTINGS: AppSettings = {
  model: "gemini-3.7-flash",
  temperature: 0.7,
  systemInstruction: "You are a helpful, knowledgeable, and concise AI assistant. Format your responses using clear Markdown, with headers, bullet points, and code blocks where appropriate.",
  useSearch: false,
};

export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONVERSATIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to load conversations from localStorage:", e);
    return [];
  }
}

export function saveConversations(conversations: Conversation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CONVERSATIONS, JSON.stringify(conversations));
  } catch (e) {
    console.error("Failed to save conversations to localStorage:", e);
  }
}

export function loadActiveConversationId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
  } catch {
    return null;
  }
}

export function saveActiveConversationId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEY_ACTIVE_ID, id);
    } else {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_ID);
    }
  } catch {}
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch {}
}
