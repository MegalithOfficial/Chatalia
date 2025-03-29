
export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isError?: boolean;
}

// Settings applicable to a chat session
export interface ChatSettings {
  model: string;
  temperature: number;
  systemPrompt?: string;
  maxTokens?: number;
  topP?: number; 
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  lastModified: Date;
  settings?: ChatSettings; // Overrides global defaults if present
}

export type ApiProviderStatus = 'unknown' | 'valid' | 'invalid' | 'testing';

export interface ApiProviderConfig {
  id: string; // Unique ID for this configuration (e.g., uuid)
  providerId: string; // Lowercase identifier (e.g., 'openai', 'anthropic', 'groq', 'google', 'ollama', 'custom')
  name: string; // User-defined name (e.g., "My OpenAI Key", "Local Llama3")
  apiKey: string;
  baseUrl?: string; // Optional Base URL for proxies or custom endpoints
  status: ApiProviderStatus; // Connection status
  lastTested?: Date;
}

// Global application settings
export interface AppSettings {
  defaultChatSettings: ChatSettings;
  apiProviders: ApiProviderConfig[];
  sendWithEnter: boolean;
  uiDensity: 'comfortable' | 'compact';
}