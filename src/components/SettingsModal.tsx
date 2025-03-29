import React, { useState, useEffect, useCallback, ChangeEvent, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X as CloseIcon, KeyRound, SlidersHorizontal, Info, Database, HelpCircle, Plus, Trash2, CheckCircle, AlertCircle, RotateCw, Eye, EyeOff, ChevronDown } from 'lucide-react'; // Added icons
import { AppSettings, ChatSettings, ApiProviderConfig, ApiProviderStatus } from '../types/chat'; // Import types
import { MODEL_PROVIDERS, DEFAULT_CHAT_SETTINGS, getProviderIdFromModel } from '../config';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import clsx from 'clsx';

// Props (Updated - no more direct theme props needed)
interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appSettings: AppSettings;
  onAppSettingsChange: (newSettings: AppSettings) => void;
}

// --- Reusable UI Components ---

interface SettingsSectionProps {
  title: string;
  description?: string; // Make description optional
  children: React.ReactNode;
  noBorder?: boolean; // Flag to skip top border
}
const SettingsSection: React.FC<SettingsSectionProps> = ({ title, description, children, noBorder = false }) => (
  <div className={clsx(!noBorder && "border-t border-neutral-700/60 pt-6 mt-6")}> {/* Added mt-6 for spacing */}
    <h3 className="text-base font-semibold leading-7 text-neutral-100">{title}</h3>
    {description && <p className="mt-1 text-sm leading-6 text-neutral-400">{description}</p>}
    <div className={clsx("mt-5 space-y-6", noBorder && "border-t border-neutral-700/60 pt-6")}> {/* Add border/padding if no title description */}
      {children}
    </div>
  </div>
);

interface SettingsFieldProps { label: string; htmlFor: string; children: React.ReactNode; description?: string; }
const SettingsField: React.FC<SettingsFieldProps> = ({ label, htmlFor, children, description }) => (
  <div>
    <label htmlFor={htmlFor} className="block text-sm font-medium leading-6 text-neutral-200 mb-1.5">{label}</label>
    {children}
    {description && <p className="mt-1.5 text-xs text-neutral-500">{description}</p>}
  </div>
);

interface ToggleSwitchProps { id: string; checked: boolean; onChange: (checked: boolean) => void; label: string; description?: string; }
const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ id, checked, onChange, label, description }) => (
  <label htmlFor={id} className="relative flex items-start cursor-pointer group"> {/* Added group for potential styling */}
    <div className="flex h-6 items-center">
      <button
        type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={clsx('relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-neutral-800', checked ? 'bg-sky-600' : 'bg-neutral-600')} >
        <span aria-hidden="true" className={clsx('pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out', checked ? 'translate-x-4' : 'translate-x-0')} />
      </button>
    </div>
    <div className="ml-3 text-sm leading-6">
      <span className="font-medium text-neutral-200 group-hover:text-white transition-colors">{label}</span>
      {description && <p className="text-neutral-400">{description}</p>}
    </div>
  </label>
);

// --- Settings Tab Components ---

// ** UPDATED **: Merged Defaults and Send with Enter
const DefaultsAndBehaviorTabContent: React.FC<{
  settings: AppSettings; // Pass full appSettings
  onChange: (keyPath: string, value: any) => void; // Use generic handler
}> = ({ settings, onChange }) => {

  // Local state to track selected provider for filtering models
  const [selectedProviderId, setSelectedProviderId] = useState<string>(() => {
      // Initialize with the provider of the current default model
      return getProviderIdFromModel(settings.defaultChatSettings.model) || Object.keys(MODEL_PROVIDERS)[0]; // Fallback to first provider
  });

  // Memoize available models for the selected provider
  const availableModels = useMemo(() => {
      return MODEL_PROVIDERS[selectedProviderId as keyof typeof MODEL_PROVIDERS]?.models || [];
  }, [selectedProviderId]);

  // Handler when provider dropdown changes
  const handleProviderSelect = (e: ChangeEvent<HTMLSelectElement>) => {
      const newProviderId = e.target.value;
      setSelectedProviderId(newProviderId);
      // Find the first model of the new provider
      const firstModel = MODEL_PROVIDERS[newProviderId as keyof typeof MODEL_PROVIDERS]?.models[0];
      if (firstModel) {
          // Update the default model ID in the main settings state
          onChange('defaultChatSettings.model', firstModel.id);
      } else {
           // Handle case where provider has no models (shouldn't happen with config)
           onChange('defaultChatSettings.model', '');
      }
  };

  // Generic handler for changing default chat settings
  const handleChatSettingChange = (key: keyof ChatSettings, value: string | number | undefined) => {
      onChange(`defaultChatSettings.${key}`, value);
  };

  const handleSendWithEnterChange = (checked: boolean) => onChange('sendWithEnter', checked);

  // State for toggling advanced section
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
      <div className='space-y-8'>
          {/* Model Selection */}
          <SettingsSection title="Default Model Selection" description="Choose the default AI provider and model for new chats." noBorder>
              <SettingsField label="Default Provider" htmlFor="default-provider">
                   <select id="default-provider" value={selectedProviderId} onChange={handleProviderSelect} className="form-select block w-full rounded-md border-0 py-1.5 bg-neutral-700 text-neutral-100 shadow-sm ring-1 ring-inset ring-neutral-600 focus:ring-2 focus:ring-inset focus:ring-sky-500 sm:text-sm sm:leading-6">
                       {Object.entries(MODEL_PROVIDERS).map(([key, provider]) => (
                          <option key={key} value={key}>{provider.name}</option>
                       ))}
                       {/* Add option for 'any configured' later? */}
                   </select>
              </SettingsField>
              <SettingsField label="Default Model" htmlFor="default-model">
                   <select id="default-model" value={settings.defaultChatSettings.model} onChange={(e) => handleChatSettingChange('model', e.target.value)}
                      className="form-select block w-full rounded-md border-0 py-1.5 bg-neutral-700 text-neutral-100 shadow-sm ring-1 ring-inset ring-neutral-600 focus:ring-2 focus:ring-inset focus:ring-sky-500 sm:text-sm sm:leading-6"
                      disabled={availableModels.length === 0} // Disable if no models for provider
                   >
                      {availableModels.length === 0 && <option>No models found for provider</option>}
                      {availableModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                   </select>
              </SettingsField>
          </SettingsSection>

          {/* Basic Parameters */}
          <SettingsSection title="Basic Parameters" description="Core settings influencing AI responses.">
               <SettingsField label={`Default Temperature (${settings.defaultChatSettings.temperature.toFixed(1)})`} htmlFor="default-temperature">
                   <input id="default-temperature" type="range" min="0" max="2" step="0.1" value={settings.defaultChatSettings.temperature} onChange={(e) => handleChatSettingChange('temperature', parseFloat(e.target.value))} className="form-range w-full h-2 bg-neutral-600 rounded-lg cursor-pointer accent-sky-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-800 focus:ring-sky-500" />
                   <p className="mt-1.5 text-xs text-neutral-500">Controls randomness. Lower is more focused, higher is more creative.</p>
               </SettingsField>
               <SettingsField label="Default System Prompt (Optional)" htmlFor="default-system-prompt" description="Custom instructions prepended to all new chats.">
                   <textarea id="default-system-prompt" rows={4} value={settings.defaultChatSettings.systemPrompt || ''} onChange={(e) => handleChatSettingChange('systemPrompt', e.target.value)} placeholder="e.g., You are a helpful assistant. Respond concisely." className="form-textarea block w-full rounded-md border-0 py-1.5 bg-neutral-700 text-neutral-100 shadow-sm ring-1 ring-inset ring-neutral-600 placeholder:text-neutral-500 focus:ring-2 focus:ring-inset focus:ring-sky-500 sm:text-sm sm:leading-6 custom-scrollbar" />
               </SettingsField>
          </SettingsSection>

           {/* Advanced Parameters (Collapsible) */}
          <SettingsSection title="Advanced Parameters" description="Fine-tune model behavior (optional).">
               <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center justify-between w-full text-sm font-medium text-neutral-300 hover:text-neutral-100 mb-4">
                   <span>{showAdvanced ? 'Hide' : 'Show'} Advanced Parameters</span>
                   <ChevronDown size={16} className={clsx("transition-transform", showAdvanced && "rotate-180")}/>
               </button>
               <AnimatePresence>
                  {showAdvanced && (
                      <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden space-y-6"
                      >
                           <SettingsField label={`Max Tokens (Optional)`} htmlFor="default-max-tokens" description="Maximum number of tokens to generate. Leave blank to use model's default.">
                              <input id="default-max-tokens" type="number" min="1" step="1" value={settings.defaultChatSettings.maxTokens || ''} onChange={(e) => handleChatSettingChange('maxTokens', e.target.value ? parseInt(e.target.value) : undefined)} placeholder="e.g., 2048"
                                  className="form-input block w-full max-w-xs rounded-md border-0 py-1.5 bg-neutral-700 text-neutral-100 shadow-sm ring-1 ring-inset ring-neutral-600 focus:ring-2 focus:ring-inset focus:ring-sky-500 sm:text-sm sm:leading-6 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" // Hide number spinners
                              />
                          </SettingsField>
                           <SettingsField label={`Top P (Optional - ${settings.defaultChatSettings.topP?.toFixed(2) ?? 'Default'})`} htmlFor="default-top-p" description="Nucleus sampling parameter (0.0 - 1.0). Lower values consider fewer, higher probability tokens.">
                              <input id="default-top-p" type="range" min="0" max="1" step="0.05" value={settings.defaultChatSettings.topP ?? 1.0} // Default slider to 1 if undefined
                                  onChange={(e) => handleChatSettingChange('topP', parseFloat(e.target.value))}
                                  className="form-range w-full h-2 bg-neutral-600 rounded-lg cursor-pointer accent-sky-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-800 focus:ring-sky-500"
                              />
                          </SettingsField>
                           {/* Add Frequency/Presence Penalty sliders here later */}
                            <p className="text-xs text-neutral-500 italic">(Frequency/Presence Penalty settings coming soon)</p>
                      </motion.div>
                  )}
               </AnimatePresence>
          </SettingsSection>

          {/* Chat Behavior */}
          <SettingsSection title="Chat Interface" description="Customize interaction preferences.">
               <ToggleSwitch
                  id="send-with-enter" checked={settings.sendWithEnter} onChange={handleSendWithEnterChange}
                  label="Send message on Enter" description="Press Enter to send, Shift+Enter for newline."
               />
          </SettingsSection>
      </div>
  );
};

const ApiProvidersTabContent: React.FC<{ providers: ApiProviderConfig[]; onChange: (providers: ApiProviderConfig[]) => void }> = ({ providers, onChange }) => {

  // State for managing edits within the list and the add form
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null); // ID of provider being edited inline
  const [providerFormData, setProviderFormData] = useState<Partial<ApiProviderConfig>>({}); // Temp state for inline edit/add form

  // State for Add New Provider section visibility
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({}); // Track visibility per key input

  // Predefined common providers for selection presets
  const commonProviders = [
    { id: 'openai', name: 'OpenAI', defaultBaseUrl: undefined },
    { id: 'anthropic', name: 'Anthropic', defaultBaseUrl: undefined },
    { id: 'groq', name: 'Groq', defaultBaseUrl: undefined },
    { id: 'google', name: 'Google (Gemini)', defaultBaseUrl: undefined },
    { id: 'cohere', name: 'Cohere', defaultBaseUrl: undefined },
    { id: 'ollama', name: 'Ollama (Local)', defaultBaseUrl: 'http://localhost:11434/v1' }, // Suggest default URL
    { id: 'lmstudio', name: 'LM Studio (Local)', defaultBaseUrl: 'http://localhost:1234/v1' }, // Suggest default URL
    { id: 'custom', name: 'Custom', defaultBaseUrl: undefined },
  ];

  const handleDeleteProvider = (idToDelete: string) => {
    // Find the provider to get its name for the confirmation message
    const providerToDelete = providers.find(p => p.id === idToDelete);
    const providerName = providerToDelete?.name || 'this API configuration';

    // Confirmation dialog
    if (window.confirm(`Are you sure you want to remove the API configuration "${providerName}"? This action cannot be undone.`)) {
      // Filter out the provider with the matching ID
      const updatedProviders = providers.filter(provider => provider.id !== idToDelete);
      // Call the onChange prop passed from the parent SettingsModal
      // This updates the temporary state (tempAppSettings) in the parent modal
      onChange(updatedProviders);
      // Provide user feedback
      toast.success(`"${providerName}" configuration removed.`);
      // If the deleted provider was being edited, cancel edit mode
      if (editingProviderId === idToDelete) {
        cancelEditing(); // Assuming cancelEditing function exists to reset edit state
      }
    }
  };

  // --- Inline Editing Logic ---
  const startEditing = (provider: ApiProviderConfig) => {
    setEditingProviderId(provider.id);
    setProviderFormData({ ...provider }); // Load current data into form state
    setShowAddForm(false); // Hide add form if open
    setShowPassword({}); // Reset password visibility
  };

  const cancelEditing = () => {
    setEditingProviderId(null);
    setProviderFormData({});
    setShowPassword({});
  };

  const handleFormChange = (field: keyof ApiProviderConfig, value: string) => {
    setProviderFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveEdit = () => {
    if (!editingProviderId || !providerFormData.name || !providerFormData.apiKey) {
      toast.error("Name and API Key cannot be empty.");
      return;
    }
    const updatedProviders = providers.map(p =>
      p.id === editingProviderId
        ? { ...p, ...providerFormData, baseUrl: providerFormData.baseUrl?.trim() || undefined, status: 'unknown' as ApiProviderStatus, lastTested: undefined }
        : p
    );
    onChange(updatedProviders);
    toast.success(`${providerFormData.name || 'Provider'} updated`);
    cancelEditing(); // Exit edit mode
  };

  // --- Add New Logic ---
  const resetAddForm = () => {
    setProviderFormData({ providerId: 'openai', name: '', apiKey: '', baseUrl: '', status: 'unknown' });
    setShowPassword({});
  };

  const handleAddNewClick = () => {
    cancelEditing(); // Ensure not editing another
    resetAddForm();
    setShowAddForm(true);
  };

  const handleCancelAdd = () => {
    setShowAddForm(false);
    resetAddForm();
  };

  const handleSaveNew = () => {
    if (!providerFormData.name?.trim() || !providerFormData.apiKey?.trim() || !providerFormData.providerId) {
      toast.error("Provider Type, Name, and API Key are required.");
      return;
    }
    const newConfig: ApiProviderConfig = {
      id: uuidv4(),
      providerId: providerFormData.providerId,
      name: providerFormData.name.trim(),
      apiKey: providerFormData.apiKey.trim(),
      baseUrl: providerFormData.baseUrl?.trim() || undefined,
      status: 'unknown', // Start as unknown
    };
    onChange([...providers, newConfig]);
    toast.success(`${newConfig.name} added`);
    handleCancelAdd(); // Hide form and reset
  };

  const handleProviderPresetChange = (presetId: string) => {
    const preset = commonProviders.find(p => p.id === presetId);
    handleFormChange('providerId', presetId);
    if (!providerFormData.name) { // Only prefill name if empty
      handleFormChange('name', preset?.name || '');
    }
    if (preset?.defaultBaseUrl && !providerFormData.baseUrl) { // Only prefill URL if empty and default exists
      handleFormChange('baseUrl', preset.defaultBaseUrl);
    } else if (!preset?.defaultBaseUrl && providerFormData.baseUrl === commonProviders.find(p => p.id === providerFormData.providerId)?.defaultBaseUrl) {
      // Clear URL if switching away from a preset that had a default one
      handleFormChange('baseUrl', '');
    }
  };

  // --- Test Connection Logic ---
  const testConnection = async (config: ApiProviderConfig) => {
    const updateStatus = (id: string, status: ApiProviderStatus, testedDate?: Date) => {
      onChange(providers.map(p => p.id === id ? { ...p, status, lastTested: testedDate ?? p.lastTested } : p));
    };

    updateStatus(config.id, 'testing'); // Set testing status immediately
    toast.loading(`Testing ${config.name}...`, { id: `test-${config.id}` });

    try {
      // ** TODO: Implement Actual API Test Call **
      // This needs a minimal request to the provider's endpoint using the key/URL.
      // Example: Fetching models list, checking account status, etc.
      // Adjust the endpoint and expected response based on the provider.
      // Using a simple fetch for simulation:
      // const testUrl = config.baseUrl ? `${config.baseUrl}/models` : `https://api.${config.providerId}.com/v1/models`; // Example endpoint guess
      // const response = await fetch(testUrl, { headers: { 'Authorization': `Bearer ${config.apiKey}` } });
      // if (!response.ok) throw new Error(`HTTP ${response.status}`);
      // await response.json(); // Try parsing response

      // Simulate result for now
      await new Promise(resolve => setTimeout(resolve, 1500));
      if (config.apiKey.toLowerCase().includes('valid')) { // Dummy check
        updateStatus(config.id, 'valid', new Date());
        toast.success(`${config.name} connection OK!`, { id: `test-${config.id}` });
      } else {
        throw new Error("Invalid Key/URL (Simulated)");
      }
    } catch (error: any) {
      updateStatus(config.id, 'invalid', new Date());
      toast.error(`${config.name} failed: ${error.message}`, { id: `test-${config.id}`, duration: 5000 });
      console.error(`Test failed for ${config.name}:`, error);
    }
  };

  // Toggle Password Visibility
  const toggleShowPassword = (id: string) => {
    setShowPassword(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // --- Render Helper for Status Icon ---
  const StatusIcon = ({ status }: { status: ApiProviderStatus }) => {
    switch (status) {
      case 'valid': return <CheckCircle size={16} className="text-green-500" />;
      case 'invalid': return <AlertCircle size={16} className="text-red-500" />;
      case 'testing': return <RotateCw size={16} className="text-yellow-500 animate-spin" />;
      default: return <HelpCircle size={16} className="text-neutral-500" />;
    }
  };

  return (
    <SettingsSection title="API Providers" description="Configure access to AI models. Keys stored locally." noBorder>
      
        {/* List Existing Providers */}
        {/* Use AnimatePresence for smooth adding/removing animations */}
        <AnimatePresence initial={false}>
            <motion.div
                layout // Animate layout changes (like list growing/shrinking)
                className="space-y-4 max-h-[45vh] overflow-y-auto custom-scrollbar" // Adjusted max-h
            >
                {providers.length === 0 && !showAddForm && ( <p className="text-sm text-neutral-400 italic px-4">No API providers configured yet.</p> )}
                {providers.map((config) => (
                    // Animate each item
                    <motion.div
                        key={config.id}
                        layout // Animate position changes
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="p-4 border border-neutral-700 rounded-lg bg-neutral-800/50 space-y-3" // Removed relative group needed for top-right delete
                    >
                        {editingProviderId === config.id ? (
                            // --- Inline Edit Form ---
                            <>
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="text-sm font-medium text-neutral-200">Edit Configuration</h4>
                                </div>
                                {/* Fields with standard styling */}
                                <SettingsField label="Display Name *" htmlFor={`edit-name-${config.id}`}> <input type="text" id={`edit-name-${config.id}`} value={providerFormData.name || ''} onChange={(e) => handleFormChange('name', e.target.value)} className="form-input block w-full rounded-md border-0 py-1.5 bg-neutral-700 text-neutral-100 shadow-sm ring-1 ring-inset ring-neutral-600 focus:ring-2 focus:ring-inset focus:ring-sky-500 sm:text-sm sm:leading-6"/> </SettingsField>
                                <SettingsField label="API Key *" htmlFor={`edit-apikey-${config.id}`}> <div className="relative"><input type={showPassword[config.id] ? 'text' : 'password'} id={`edit-apikey-${config.id}`} value={providerFormData.apiKey || ''} onChange={(e) => handleFormChange('apiKey', e.target.value)} className="form-input block w-full pr-10 ..."/><button type="button" onClick={()=>toggleShowPassword(config.id)} className="absolute inset-y-0 right-0 px-3 ...">{showPassword[config.id] ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div> </SettingsField>
                                <SettingsField label="Base URL (Optional)" htmlFor={`edit-baseurl-${config.id}`}> <input type="text" id={`edit-baseurl-${config.id}`} value={providerFormData.baseUrl || ''} onChange={(e) => handleFormChange('baseUrl', e.target.value)} placeholder="Default or e.g., http://localhost:11434/v1" className="form-input block w-full ..."/> </SettingsField>
                                <div className="flex justify-end space-x-2 pt-2">
                                    <button onClick={cancelEditing} className="px-3 py-1 text-xs rounded bg-neutral-600 hover:bg-neutral-500 text-neutral-200 transition-colors">Cancel</button>
                                    <button onClick={handleSaveEdit} className="px-3 py-1 text-xs rounded bg-sky-600 hover:bg-sky-700 text-white transition-colors">Save Changes</button>
                                </div>
                            </>
                        ) : (
                            // --- Display View ---
                            <div className="flex justify-between items-start">
                                <div className="space-y-1 flex-grow mr-4"> {/* Added margin right */}
                                    <h4 className="text-sm font-medium text-neutral-200 flex items-center space-x-2"> <StatusIcon status={config.status} /> <span>{config.name}</span> <span className="text-xs bg-neutral-700 px-1.5 py-0.5 rounded">{commonProviders.find(p=>p.id===config.providerId)?.name || config.providerId}</span> </h4>
                                    {config.baseUrl && <p className="text-xs text-neutral-500 font-mono break-all">URL: {config.baseUrl}</p>}
                                    <p className="text-xs text-neutral-500 font-mono">Key: ••••••••{config.apiKey?.slice(-4)}</p>
                                    {config.lastTested && <p className="text-xs text-neutral-600">Tested: {new Date(config.lastTested).toLocaleTimeString()}</p>}
                                </div>
                                {/* Actions aligned vertically */}
                                <div className="flex space-x-1 flex-shrink-0 self-start sm:self-center"> {/* Align self */}
                                    <button onClick={() => testConnection(config)} className="p-1 text-neutral-400 hover:text-sky-400 hover:bg-neutral-700 rounded" title="Test Connection"> <RotateCw size={16} /> </button>
                                    <button onClick={() => startEditing(config)} className="p-1 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-700 rounded" title="Edit"> <SlidersHorizontal size={16} /> </button>
                                    <button onClick={() => handleDeleteProvider(config.id)} className="p-1 text-neutral-400 hover:text-red-400 hover:bg-neutral-700 rounded" title="Remove"> <Trash2 size={16} /> </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                ))}
            </motion.div>
        </AnimatePresence>

        {/* Add New Provider Form Section */}
        <div className="mt-6 pt-6 border-t border-neutral-700/60">
            <AnimatePresence>
                {showAddForm && (
                    <motion.div
                        initial={{ height: 0, opacity: 0, marginTop: 0, marginBottom: 0 }}
                        animate={{ height: 'auto', opacity: 1, marginTop: '1rem', marginBottom: '1rem' }} // Add margin when shown
                        exit={{ height: 0, opacity: 0, marginTop: 0, marginBottom: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden" 
                    >
                        <div className="p-4 border border-dashed border-neutral-600 rounded-lg bg-neutral-800 space-y-4">
                            <h4 className="text-sm font-medium text-neutral-200">Add New API Provider</h4>
                            <SettingsField label="Provider Type *" htmlFor="new-provider-id">
                                <select id="new-provider-id" value={providerFormData.providerId || 'openai'} onChange={(e) => handleProviderPresetChange(e.target.value)} className="form-select block w-full rounded-md border-0 py-1.5 bg-neutral-700 ...">
                                    {commonProviders.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </SettingsField>
                            <SettingsField label="Display Name *" htmlFor="new-name"> <input type="text" id="new-name" value={providerFormData.name || ''} onChange={(e) => handleFormChange('name', e.target.value)} placeholder="e.g., Personal Groq Key" className="form-input block w-full ..."/> </SettingsField>
                            <SettingsField label="API Key *" htmlFor="new-apikey"> <div className="relative"><input type={showPassword['new'] ? 'text' : 'password'} id="new-apikey" value={providerFormData.apiKey || ''} onChange={(e) => handleFormChange('apiKey', e.target.value)} className="form-input block w-full pr-10 ..."/> <button type="button" onClick={()=>toggleShowPassword('new')} className="absolute inset-y-0 right-0 px-3 ...">{showPassword['new'] ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div> </SettingsField>
                            <SettingsField label="Base URL (Optional)" htmlFor="new-baseurl" description={commonProviders.find(p=>p.id===providerFormData.providerId)?.defaultBaseUrl ? 'Suggested URL pre-filled.' : 'Needed for local models or proxies.'}> <input type="text" id="new-baseurl" value={providerFormData.baseUrl || ''} onChange={(e) => handleFormChange('baseUrl', e.target.value)} placeholder={commonProviders.find(p=>p.id===providerFormData.providerId)?.defaultBaseUrl || 'Optional: e.g., https://myproxy.com/v1'} className="form-input block w-full ..."/> </SettingsField>
                            <div className="flex justify-end space-x-2 pt-2">
                                <button onClick={handleCancelAdd} className="px-3 py-1 text-xs rounded bg-neutral-600 hover:bg-neutral-500 ...">Cancel</button>
                                <button onClick={handleSaveNew} className="px-3 py-1 text-xs rounded bg-sky-600 hover:bg-sky-700 ...">Add Provider</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Button for Add Form */}
            {!showAddForm && !editingProviderId && (
                 <button onClick={handleAddNewClick} className="flex items-center space-x-1 px-3 py-1.5 text-sm rounded bg-neutral-700 hover:bg-neutral-600 text-neutral-200 transition-colors">
                      <Plus size={16} /><span>Add API Provider</span>
                 </button>
             )}
        </div>
         {/* Security Note */}
    </SettingsSection>
);
};

// DataControlsTab & AboutTab (Content unchanged, use SettingsSection)
const DataControlsTabContent: React.FC = () => {
  const handleExport = () => toast('Exporting... (coming soon)');
  const handleDeleteAll = () => { if (window.confirm("DELETE ALL CHATS?")) { if (window.confirm("REALLY DELETE?")) { toast.error('Deleting... (NOT IMPLEMENTED)'); } } };
  return (
    <div className="space-y-8">
      <SettingsSection title="Export Data" description="Download your chat history." noBorder>
        <button onClick={handleExport} className="px-3 py-1.5 text-sm rounded bg-sky-700 ...">Export All Chats</button>
      </SettingsSection>
      <SettingsSection title="Delete Data" description="Permanently remove data stored in this browser.">
        <button onClick={handleDeleteAll} className="px-3 py-1.5 text-sm rounded bg-red-800 ...">Delete All Chats</button>
      </SettingsSection>
      <div className="p-3 bg-neutral-900/50 border border-neutral-700 ..."> <Info size={14} /> <span>Data is stored locally...</span> </div>
    </div>
  );
};
const AboutTabContent: React.FC = () => (
  <SettingsSection title="About" description="Application information." noBorder>
    <p className="text-sm text-neutral-300">Version: <span className="font-mono text-xs bg-neutral-700 px-1 py-0.5 rounded">0.2.0-alpha</span></p>
    <p className="text-sm text-neutral-300 mt-2">Local AI Chat Interface.</p>
  </SettingsSection>
);

// --- Main Modal Component (Using Sidebar Layout) ---
export default function SettingsModal({ isOpen, onClose, appSettings, onAppSettingsChange }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState('defaults');
  // ** UPDATED Tabs (Removed Appearance) **
  const tabs = [
    { id: 'defaults', label: 'Defaults & Behavior', icon: SlidersHorizontal }, // Combined label
    { id: 'apiProviders', label: 'API Providers', icon: KeyRound }, // Changed from apiKeys
    { id: 'data', label: 'Data', icon: Database },
    { id: 'about', label: 'About', icon: HelpCircle },
  ];
  const [tempAppSettings, setTempAppSettings] = useState<AppSettings>(appSettings);

  useEffect(() => { if (isOpen) setTempAppSettings(appSettings); }, [isOpen, appSettings]);

  // Updated generic handler for flexibility
  const handleTempChange = useCallback((keyPath: string, value: any) => {
    setTempAppSettings(prev => {
      const keys = keyPath.split('.'); const newState = structuredClone(prev); let currentLevel: any = newState;
      for (let i = 0; i < keys.length - 1; i++) { currentLevel = currentLevel[keys[i]]; if (currentLevel === undefined) return prev; }
      currentLevel[keys[keys.length - 1]] = value; return newState;
    });
  }, []);

  // Specific handlers using the generic one
  const handleApiProvidersChange = (providers: ApiProviderConfig[]) => handleTempChange('apiProviders', providers);
  const handleSaveChanges = () => { onAppSettingsChange(tempAppSettings); onClose(); toast.success("Settings saved"); };

  const TabContent = () => {
    switch (activeTab) {
      // Pass settings and the generic handler
      case 'defaults': return <DefaultsAndBehaviorTabContent settings={tempAppSettings} onChange={handleTempChange} />;
      case 'apiProviders': return <ApiProvidersTabContent providers={tempAppSettings.apiProviders} onChange={handleApiProvidersChange} />; // Pass specific handler
      case 'data': return <DataControlsTabContent />;
      case 'about': return <AboutTabContent />;
      default: return null;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div /* Backdrop */
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose} >
          <motion.div /* Panel */
            initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 5 }} transition={{ duration: 0.15, ease: 'easeOut' }}
            className="relative w-full max-w-4xl h-[85vh] max-h-[750px] bg-neutral-800 rounded-lg shadow-xl overflow-hidden flex flex-col sm:flex-row border border-neutral-700"
            onClick={(e) => e.stopPropagation()} >
            {/* Settings Sidebar */}
            <div className="w-full sm:w-56 bg-neutral-900 border-b sm:border-b-0 sm:border-r border-neutral-700 p-4 flex-shrink-0">
              <h2 className="text-lg font-semibold text-neutral-100 mb-4 sm:mb-6 px-2 hidden sm:block">Settings</h2>
              <nav className="flex flex-row sm:flex-col sm:space-y-1 overflow-x-auto sm:overflow-x-visible -mx-4 px-4 sm:mx-0 sm:px-0 pb-2 sm:pb-0">
                {tabs.map((tab) => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={clsx(`flex-shrink-0 sm:w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left text-sm transition-colors duration-150 mr-2 sm:mr-0`, activeTab === tab.id ? 'bg-neutral-750 text-neutral-100 font-medium' : 'text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100')}>
                    <tab.icon size={18} className="flex-shrink-0 opacity-80" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
            {/* Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-neutral-700 flex-shrink-0"> {/* Header */}
                <h3 className="text-base font-medium text-neutral-200">{tabs.find(t => t.id === activeTab)?.label || 'Settings'}</h3>
                <button onClick={onClose} className="p-1.5 text-neutral-500 hover:bg-neutral-700 hover:text-neutral-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-neutral-800" aria-label="Close" title="Close"> <CloseIcon size={20} /> </button>
              </div>
              <div className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar"> {/* Scrollable Content */}
                <TabContent />
              </div>
              <div className="flex justify-end p-4 border-t border-neutral-700 flex-shrink-0 bg-neutral-800"> {/* Footer */}
                <button onClick={handleSaveChanges} className="px-4 py-1.5 text-sm rounded bg-sky-600 hover:bg-sky-700 text-white transition-colors"> Save & Close </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}