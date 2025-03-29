import { AppSettings, ChatSettings } from "./types/chat";

// Define available models - Group by Provider for UI
export const MODEL_PROVIDERS = {
   openai: {
      name: "OpenAI",
      models: [
         { id: 'gpt-4o-mini', name: 'GPT-4o mini' },
         { id: 'gpt-4o', name: 'GPT-4o' },
         { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
         { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
      ]
   },
   anthropic: {
      name: "Anthropic",
      models: [
         { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
         { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
         { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
      ]
   },
   groq: {
      name: "Groq",
      models: [
         { id: 'llama3-8b-8192', name: 'LLaMA3-8b' },
         { id: 'llama3-70b-8192', name: 'LLaMA3-70b' },
         { id: 'mixtral-8x7b-32768', name: 'Mixtral-8x7b' },
         { id: 'gemma-7b-it', name: 'Gemma-7b' },
      ]
   },
   // Add other providers like Google (Gemini) etc.
};

// Helper to get all models flat or find a specific one
export const getAllModels = () => Object.values(MODEL_PROVIDERS).flatMap(p => p.models.map(m => ({ ...m, provider: p.name.toLowerCase() })));
export const findModelById = (id: string) => getAllModels().find(m => m.id === id);
export const getProviderIdFromModel = (modelId: string): string | undefined => {
   const model = findModelById(modelId);
   return model ? getProviderForKey(model.provider) : undefined;
};
export const getProviderForKey = (providerName: string) => providerName.toLowerCase()

export const DEFAULT_MODEL_ID = 'gpt-4o-mini'; // Default model

// Define default global chat settings
export const DEFAULT_CHAT_SETTINGS: ChatSettings = {
   model: DEFAULT_MODEL_ID,
   temperature: 0.7,
   systemPrompt: '',
};

// Define default global application settings
export const DEFAULT_APP_SETTINGS: AppSettings = {
   defaultChatSettings: { ...DEFAULT_CHAT_SETTINGS }, // Clone default chat settings
   apiProviders: [],
   sendWithEnter: true, // Default to true
   uiDensity: 'comfortable', // Default density
};

// Local Storage Key for App Settings
export const APP_SETTINGS_KEY = "ai_chat_app_settings_v1";
export const ONBOARDING_COMPLETE_KEY = "ai_chat_onboarding_complete_v1";