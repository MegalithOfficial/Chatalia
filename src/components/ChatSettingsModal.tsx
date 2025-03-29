// src/components/ChatSettingsModal.tsx
import React, { useState, useEffect, ChangeEvent, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X as CloseIcon, SlidersHorizontal, Info, RotateCcw, Bot, Zap, ChevronDown } from 'lucide-react'; // Added Icons
import { ChatSettings } from '../types/chat';
import { MODEL_PROVIDERS, DEFAULT_CHAT_SETTINGS, getProviderIdFromModel } from '../config'; // Import necessary configs
import clsx from 'clsx';
import toast from 'react-hot-toast';

interface ChatSettingsModalProps {
   isOpen: boolean;
   onClose: () => void;
   chatId: string | null;
   currentSettings: ChatSettings; // Effective settings (global default OR session specific)
   isUsingDefaultSettings: boolean; // True if currentSettings are the global defaults
   onSave: (chatId: string, newSettings: ChatSettings) => void; // Save override
   onResetToDefaults: (chatId: string) => void; // Remove override
}

// --- Reusable UI Components --- (Assume these are defined/imported, same as in SettingsModal)
interface SettingsSectionCardProps { icon: React.ElementType; title: string; children: React.ReactNode; }
const SettingsSectionCard: React.FC<SettingsSectionCardProps> = ({ icon: Icon, title, children }) => (
   <div className="bg-neutral-800/50 border border-neutral-700/80 rounded-lg overflow-hidden">
      <div className="flex items-center space-x-2 p-3 bg-neutral-700/40 border-b border-neutral-700/80">
         <Icon size={16} className="text-neutral-400" />
         <h3 className="text-sm font-medium text-neutral-200">{title}</h3>
      </div>
      <div className="p-4 space-y-4">{children}</div>
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

// --- Main Modal Component ---
export default function ChatSettingsModal({
   isOpen, onClose, chatId, currentSettings, isUsingDefaultSettings, onSave, onResetToDefaults
}: ChatSettingsModalProps) {

   // Temp state holds the settings being edited in the modal
   const [tempSettings, setTempSettings] = useState<ChatSettings>(currentSettings);
   const [showAdvanced, setShowAdvanced] = useState(false); // State for advanced section visibility

   // Local state for provider selection to filter models
   const [selectedProviderId, setSelectedProviderId] = useState<string>(() =>
      getProviderIdFromModel(currentSettings.model) || Object.keys(MODEL_PROVIDERS)[0]
   );

   // Reset temp state when modal opens or the underlying currentSettings change
   useEffect(() => {
      if (isOpen) {
         setTempSettings(currentSettings);
         // Also reset selected provider based on the current model being loaded
         setSelectedProviderId(getProviderIdFromModel(currentSettings.model) || Object.keys(MODEL_PROVIDERS)[0]);
         // Reset advanced section visibility if desired
         // setShowAdvanced(false);
      }
   }, [currentSettings, isOpen]);

   // Memoize available models based on the locally selected provider
   const availableModels = useMemo(() => {
      return MODEL_PROVIDERS[selectedProviderId as keyof typeof MODEL_PROVIDERS]?.models || [];
   }, [selectedProviderId]);

   // Update temporary settings state
   const handleSettingChange = useCallback((key: keyof ChatSettings, value: any) => {
      setTempSettings(prev => ({ ...prev, [key]: value }));
   }, []);

   // Handler when provider dropdown changes
   const handleProviderSelect = (e: ChangeEvent<HTMLSelectElement>) => {
      const newProviderId = e.target.value;
      setSelectedProviderId(newProviderId);
      const firstModel = MODEL_PROVIDERS[newProviderId as keyof typeof MODEL_PROVIDERS]?.models[0];
      if (firstModel) {
         // Update the model in temporary settings
         handleSettingChange('model', firstModel.id);
      } else {
         handleSettingChange('model', ''); // Clear model if provider has none
      }
   };

   // Save the temporary settings to the specific chat
   const handleSaveChanges = () => {
      if (chatId) {
         // Only save if the temp settings are actually different from global defaults
         // If they match defaults, we should ideally call onResetToDefaults
         if (JSON.stringify(tempSettings) !== JSON.stringify(DEFAULT_CHAT_SETTINGS)) {
            onSave(chatId, tempSettings);
            // Toast handled in App.tsx after state update
         } else {
            // If user edited settings back to match defaults, treat it as a reset
            if (!isUsingDefaultSettings) { // Only reset if currently using custom settings
               handleReset(); // Use the reset handler
            } else {
               toast("Settings match global defaults. No changes saved.");
            }
         }
      }
      onClose();
   };

   // Reset session settings to use global defaults
   const handleReset = () => {
      if (chatId) {
         onResetToDefaults(chatId);
         setTempSettings(DEFAULT_CHAT_SETTINGS); // Update temp state visually
         setSelectedProviderId(getProviderIdFromModel(DEFAULT_CHAT_SETTINGS.model) || Object.keys(MODEL_PROVIDERS)[0]); // Reset provider selection
         // Don't close, allow user to see defaults are now active
         toast.success("Chat reset to use global defaults.");
      }
   };

   // Check if temp settings differ from the initial current settings (passed via props)
   const hasChanges = JSON.stringify(tempSettings) !== JSON.stringify(currentSettings);
   // Check if temp settings differ from the *actual* global defaults
   const isDifferentFromGlobalDefaults = JSON.stringify(tempSettings) !== JSON.stringify(DEFAULT_CHAT_SETTINGS);

   return (
      <AnimatePresence>
         {isOpen && chatId && (
            <motion.div /* Backdrop */
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
               className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose} >
               <motion.div /* Panel */
                  initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 5 }} transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="relative w-full max-w-xl bg-neutral-800 rounded-xl shadow-xl overflow-hidden border border-neutral-700 flex flex-col max-h-[85vh]" // rounded-xl
                  onClick={(e) => e.stopPropagation()} >

                  {/* Header */}
                  <div className="flex items-center justify-between p-4 border-b border-neutral-700 flex-shrink-0 bg-neutral-800/50">
                     <h2 className="text-base font-semibold text-neutral-100 flex items-center space-x-2"> {/* Changed size */}
                        <SlidersHorizontal size={18} /> <span>Chat Settings</span>
                     </h2>
                     <button onClick={onClose} className="p-1.5 text-neutral-500 hover:bg-neutral-700 hover:text-neutral-100 rounded-full" aria-label="Close"> <CloseIcon size={20} /> </button>
                  </div>

                  {/* Scrollable Content */}
                  <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar flex-grow bg-neutral-900/30">
                     {/* Override Indicator */}
                     {!isUsingDefaultSettings && (
                        <div className="p-3 mb-3 text-xs text-sky-300 flex items-start space-x-2 rounded-md bg-sky-900/30 border border-sky-700/50">
                           <Info size={14} className="flex-shrink-0 mt-0.5" />
                           <span>Using custom settings for this chat. These override global defaults.</span>
                        </div>
                     )}
                     {isUsingDefaultSettings && hasChanges && ( // Show if using defaults BUT making temporary changes
                        <div className="p-3 mb-3 text-xs text-neutral-400 flex items-start space-x-2 rounded-md bg-neutral-800 border border-neutral-700">
                           <Info size={14} className="flex-shrink-0 mt-0.5" />
                           <span>Editing will create custom settings for this chat, overriding global defaults.</span>
                        </div>
                     )}

                     {/* Model Selection Card */}
                     <SettingsSectionCard icon={Bot} title="Model Selection">
                        <SettingsField label="Provider" htmlFor="chat-provider">
                           <select id="chat-provider" value={selectedProviderId} onChange={handleProviderSelect} className="form-select block w-full rounded-md border-0 py-1.5 bg-neutral-700 text-neutral-100 ...">
                              {Object.entries(MODEL_PROVIDERS).map(([key, provider]) => (<option key={key} value={key}>{provider.name}</option>))}
                           </select>
                        </SettingsField>
                        <SettingsField label="Model" htmlFor="chat-model">
                           <select id="chat-model" value={tempSettings.model} onChange={(e) => handleSettingChange('model', e.target.value)} className="form-select block w-full rounded-md ..." disabled={availableModels.length === 0} >
                              {availableModels.length === 0 && <option>No models for provider</option>}
                              {availableModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                           </select>
                        </SettingsField>
                     </SettingsSectionCard>

                     {/* Parameters Card */}
                     <SettingsSectionCard icon={Zap} title="Parameters">
                        {/* Temperature */}
                        <SettingsField label={`Temperature (${tempSettings.temperature.toFixed(1)})`} htmlFor="chat-temperature">
                           <input id="chat-temperature" type="range" min="0" max="2" step="0.1" value={tempSettings.temperature} onChange={(e) => handleSettingChange('temperature', parseFloat(e.target.value))} className="form-range w-full h-2 ..." />
                           <p className="mt-1.5 text-xs text-neutral-500">Lower = focused, Higher = creative.</p>
                        </SettingsField>
                        {/* System Prompt */}
                        <SettingsField label="System Prompt" htmlFor="chat-system-prompt">
                           <textarea id="chat-system-prompt" rows={5} value={tempSettings.systemPrompt || ''} onChange={(e) => handleSettingChange('systemPrompt', e.target.value)}
                              placeholder="Overrides default system prompt..." className="form-textarea block w-full ..." />
                        </SettingsField>
                     </SettingsSectionCard>

                     {/* Advanced Parameters Card (Collapsible) */}
                     <SettingsSectionCard icon={SlidersHorizontal} title="Advanced Parameters">
                        <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center justify-between w-full text-sm font-medium text-neutral-300 hover:text-neutral-100 mb-2">
                           <span>{showAdvanced ? 'Hide' : 'Show'} Advanced</span>
                           <ChevronDown size={16} className={clsx("transition-transform", showAdvanced && "rotate-180")} />
                        </button>
                        <AnimatePresence>
                           {showAdvanced && (
                              <motion.div initial="collapsed" animate="open" exit="collapsed" variants={{ open: { opacity: 1, height: 'auto' }, collapsed: { opacity: 0, height: 0 } }} transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }} className="overflow-hidden space-y-6 pt-4 border-t border-neutral-700/60" >
                                 <SettingsField label={`Max Tokens`} htmlFor="chat-max-tokens" description="Max tokens per response. Default depends on model.">
                                    <input id="chat-max-tokens" type="number" min="1" step="1" value={tempSettings.maxTokens || ''} onChange={(e) => handleSettingChange('maxTokens', e.target.value ? parseInt(e.target.value) : undefined)} placeholder="Model Default" className="form-input block w-full max-w-xs ..." />
                                 </SettingsField>
                                 <SettingsField label={`Top P (${tempSettings.topP?.toFixed(2) ?? 'Default'})`} htmlFor="chat-top-p" description="Nucleus sampling (0.0-1.0).">
                                    <input id="chat-top-p" type="range" min="0" max="1" step="0.05" value={tempSettings.topP ?? 1.0} onChange={(e) => handleSettingChange('topP', parseFloat(e.target.value))} className="form-range w-full h-2 ..." />
                                 </SettingsField>
                                 <p className="text-xs text-neutral-500 italic">(More params coming soon...)</p>
                              </motion.div>
                           )}
                        </AnimatePresence>
                     </SettingsSectionCard>

                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between p-4 border-t border-neutral-700 flex-shrink-0 bg-neutral-800/50">
                     <button onClick={handleReset} disabled={!isDifferentFromGlobalDefaults && isUsingDefaultSettings} // Disable if already using defaults AND no changes made
                        className="flex items-center space-x-1.5 px-3 py-1.5 text-xs rounded bg-neutral-700 hover:bg-neutral-600 text-neutral-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-neutral-500">
                        <RotateCcw size={14} /> <span>Reset to Defaults</span>
                     </button>
                     <div className="flex space-x-2">
                        <button onClick={onClose} className="px-4 py-1.5 text-sm rounded bg-neutral-600 hover:bg-neutral-500 text-neutral-200 transition-colors focus:outline-none focus:ring-1 focus:ring-neutral-500">Cancel</button>
                        <button onClick={handleSaveChanges} disabled={!hasChanges} // Disable save if no temp changes made
                           className="px-4 py-1.5 text-sm rounded bg-sky-600 hover:bg-sky-700 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-sky-500">
                           Save Changes
                        </button>
                     </div>
                  </div>
               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>
   );
}