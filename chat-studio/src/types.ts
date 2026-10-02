export interface GroundingSource {
  uri?: string;
  title?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  sources?: GroundingSource[];
  isStreaming?: boolean;
  error?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  model: string;
  systemInstruction?: string;
  useSearch?: boolean;
}

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  badge?: string;
}

export interface AppSettings {
  model: string;
  temperature: number;
  systemInstruction: string;
  useSearch: boolean;
}
