// src/components/SetupPage.tsx
import React, { useState, useEffect, ChangeEvent, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyRound, Info, Plus, Trash2, CheckCircle, AlertCircle, RotateCw, Eye, EyeOff, SlidersHorizontal, ArrowRight, HelpCircle, ChevronDown, Globe, Key } from 'lucide-react';
import { AppSettings, ApiProviderConfig, ApiProviderStatus } from '../types/chat';
// Assuming MODEL_PROVIDERS is correctly defined in config.ts and exported
import { MODEL_PROVIDERS } from '../config';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import clsx from 'clsx';

// --- Reusable UI Components ---

// Simple Input component for the edit form

interface EditInputProps {
   id: string;
   label: string;
   value: string;
   onChange: (e: ChangeEvent<HTMLInputElement>) => void;
   placeholder?: string;
   isPassword?: boolean;
   showPassword?: boolean;
   onTogglePassword?: () => void;
   required?: boolean;
   error?: string;
 }
 
 interface EditSelectProps {
   id: string;
   label: string;
   value: string;
   onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
   children: React.ReactNode;
 }
 

 const EditInput: React.FC<EditInputProps> = ({
   id,
   label,
   value,
   onChange,
   placeholder,
   isPassword,
   showPassword,
   onTogglePassword,
   required,
   error
 }) => (
   <div className="space-y-1">
     <div className="flex items-baseline justify-between">
       <label
         htmlFor={id}
         className="block text-sm font-medium text-neutral-200"
       >
         {label}
         {required && <span className="ml-1 text-rose-500">*</span>}
       </label>
       {error && <span className="text-xs text-rose-500">{error}</span>}
     </div>
     <div className="relative">
       <input
         type={isPassword && !showPassword ? 'password' : 'text'}
         id={id}
         value={value}
         onChange={onChange}
         placeholder={placeholder}
         required={required}
         className={clsx(
           "block w-full rounded-lg border bg-neutral-900/50 px-3.5 py-2.5 text-sm shadow-sm ring-offset-neutral-900 transition-all duration-200",
           "placeholder:text-neutral-500",
           error
             ? "border-rose-500/50 text-rose-500 focus:border-rose-500 focus:ring-rose-500/20"
             : "border-neutral-700/50 text-neutral-100 hover:border-neutral-600 focus:border-sky-500/70 focus:ring-2 focus:ring-sky-500/20",
           isPassword && "pr-10"
         )}
       />
       {isPassword && onTogglePassword && (
         <button
           type="button"
           onClick={onTogglePassword}
           className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
         >
           {showPassword ? (
             <EyeOff className="h-4 w-4" />
           ) : (
             <Eye className="h-4 w-4" />
           )}
         </button>
       )}
     </div>
   </div>
 );
 
 // EditSelect Component
 const EditSelect: React.FC<EditSelectProps> = ({
   id,
   label,
   value,
   onChange,
   children,
   required
 }) => (
   <div className="space-y-1">
     <label
       htmlFor={id}
       className="block text-sm font-medium text-neutral-200"
     >
       {label}
       {required && <span className="ml-1 text-rose-500">*</span>}
     </label>
     <div className="relative">
       <select
         id={id}
         name={id}
         value={value}
         onChange={onChange}
         required={required}
         className={clsx(
           "block w-full appearance-none rounded-lg border border-neutral-700/50 bg-neutral-900/50 px-3.5 py-2.5 text-sm text-neutral-100 shadow-sm",
           "transition-all duration-200",
           "hover:border-neutral-600 focus:border-sky-500/70 focus:outline-none focus:ring-2 focus:ring-sky-500/20",
           "ring-offset-neutral-900"
         )}
       >
         {children}
       </select>
       <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
     </div>
   </div>
 );
 // StatusIcon Component
 const StatusIcon = ({ status, lastTested }: { status: ApiProviderStatus; lastTested?: string }) => {
   const getStatusInfo = () => {
     const testedTime = lastTested ? new Date(lastTested).toLocaleTimeString() : 'N/A';
     switch (status) {
       case 'valid':
         return {
           icon: CheckCircle,
           color: 'text-emerald-500',
           title: `Connection OK (Tested: ${testedTime})`
         };
       case 'invalid':
         return {
           icon: AlertCircle,
           color: 'text-rose-500',
           title: `Connection Failed (Tested: ${testedTime})`
         };
       case 'testing':
         return {
           icon: RotateCw,
           color: 'text-amber-500 animate-spin',
           title: 'Testing...'
         };
       default:
         return {
           icon: HelpCircle,
           color: 'text-neutral-500',
           title: 'Status unknown'
         };
     }
   };
   
  const { icon: Icon, color, title } = getStatusInfo();
  return <Icon size={16} className={clsx('flex-shrink-0', color)}/>;
};


// --- ApiProviderCard Component ---
interface ApiProviderCardProps {
   config: ApiProviderConfig;
   isEditing: boolean;
   formData: Partial<ApiProviderConfig>;
   showPasswordId: string | null;
   onEdit: (id: string) => void;
   onDelete: (id: string) => void;
   onTest: (config: ApiProviderConfig) => void;
   onFormChange: (field: keyof ApiProviderConfig, value: string) => void;
   onSave: () => void;
   onCancel: () => void;
   onToggleShowPassword: (id: string) => void;
   commonProviders: Array<{ id: string; name: string; defaultBaseUrl?: string }>;
}

const ApiProviderCard: React.FC<ApiProviderCardProps> = ({
   config,
   isEditing,
   formData,
   showPasswordId,
   onEdit,
   onDelete,
   onTest,
   onFormChange,
   onSave,
   onCancel,
   onToggleShowPassword,
   commonProviders
 }) => {
   const cardVariants = {
     initial: { opacity: 0, y: 10, scale: 0.95 },
     animate: { opacity: 1, y: 0, scale: 1 },
     exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
   };
 
   const contentVariants = {
     initial: { opacity: 0 },
     animate: { opacity: 1 },
     exit: { opacity: 0 }
   };
 
   return (
     <motion.div
       layout="position"
       variants={cardVariants}
       initial="initial"
       animate="animate"
       exit="exit"
       transition={{ type: 'spring', stiffness: 200, damping: 20 }}
       className={clsx(
         'overflow-hidden rounded-xl border transition-all duration-300',
         isEditing
           ? 'border-sky-500/30 bg-neutral-800/80 shadow-lg shadow-sky-500/5'
           : 'border-neutral-700/50 bg-neutral-800/50 hover:border-neutral-600/70 hover:bg-neutral-800/70'
       )}
     >
       <AnimatePresence mode="wait" initial={false}>
         {isEditing ? (
           <motion.div
             key={`edit-${config.id}`}
             variants={contentVariants}
             initial="initial"
             animate="animate"
             exit="exit"
             className="p-5 space-y-4"
           >
             <h3 className="text-lg font-medium text-neutral-100">
               {config.id === 'new' ? 'Add New Provider' : 'Edit Provider'}
             </h3>
             
             {config.id === 'new' && (
               <EditSelect
                 id="edit-provider-id"
                 label="Provider Type"
                 value={formData.providerId || 'openai'}
                 onChange={(e) => onFormChange('providerId', e.target.value)}
               >
                 {commonProviders.map((p) => (
                   <option key={p.id} value={p.id}>
                     {p.name}
                   </option>
                 ))}
               </EditSelect>
             )}
 
             <EditInput
               label="Display Name"
               id={`edit-name-${config.id}`}
               value={formData.name || ''}
               onChange={(e) => onFormChange('name', e.target.value)}
               placeholder="e.g., Personal Groq Key"
             />
 
             <EditInput
               label="API Key"
               id={`edit-apikey-${config.id}`}
               value={formData.apiKey || ''}
               onChange={(e) => onFormChange('apiKey', e.target.value)}
               isPassword
               onTogglePassword={() => onToggleShowPassword(config.id)}
               showPassword={showPasswordId === config.id}
             />
 
             <EditInput
               label="Base URL (Optional)"
               id={`edit-baseurl-${config.id}`}
               value={formData.baseUrl || ''}
               onChange={(e) => onFormChange('baseUrl', e.target.value)}
               placeholder={
                 commonProviders.find((p) => p.id === formData.providerId)
                   ?.defaultBaseUrl || 'Leave blank for default'
               }
             />
 
             <div className="flex justify-end gap-3 pt-2">
               <button
                 onClick={onCancel}
                 className="rounded-lg bg-neutral-700 px-4 py-2 text-sm font-medium text-neutral-200 transition-colors hover:bg-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-500/30 focus:ring-offset-1 focus:ring-offset-neutral-800"
               >
                 Cancel
               </button>
               <button
                 onClick={onSave}
                 className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:ring-offset-1 focus:ring-offset-neutral-800"
               >
                 {config.id === 'new' ? 'Add Provider' : 'Save Changes'}
               </button>
             </div>
           </motion.div>
         ) : (
           <motion.div
             key={`display-${config.id}`}
             variants={contentVariants}
             initial="initial"
             animate="animate"
             exit="exit"
             className="p-4"
           >
             <div className="flex items-start justify-between gap-4">
               <div className="flex-grow space-y-2 overflow-hidden">
                 <div className="flex items-center gap-2">
                   <StatusIcon status={config.status} />
                   <h4 className="font-medium text-neutral-100 truncate" title={config.name}>
                     {config.name}
                   </h4>
                   <span className="rounded bg-neutral-700/70 px-2 py-0.5 text-xs font-medium text-neutral-300">
                     {commonProviders.find((p) => p.id === config.providerId)?.name ||
                       config.providerId}
                   </span>
                 </div>
 
                 {config.baseUrl && (
                   <div className="flex items-center gap-2 pl-6 text-xs text-neutral-400">
                     <Globe size={12} className="text-neutral-500" />
                     <span className="font-mono truncate" title={config.baseUrl}>
                       {config.baseUrl}
                     </span>
                   </div>
                 )}
 
                 <div className="flex items-center gap-2 pl-6 text-xs text-neutral-500">
                   <Key size={12} />
                   <span className="font-mono">••••••••{config.apiKey?.slice(-4)}</span>
                 </div>
               </div>
 
               <div className="flex gap-1">
                 <button
                   onClick={() => onTest(config)}
                   className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-sky-500/10 hover:text-sky-400"
                   title="Test Connection"
                 >
                   <RotateCw size={16} />
                 </button>
                 <button
                   onClick={() => onEdit(config.id)}
                   className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-100"
                   title="Edit Provider"
                 >
                   <SlidersHorizontal size={16} />
                 </button>
                 <button
                   onClick={() => onDelete(config.id)}
                   className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                   title="Remove Provider"
                 >
                   <Trash2 size={16} />
                 </button>
               </div>
             </div>
           </motion.div>
         )}
       </AnimatePresence>
     </motion.div>
   );
 };


// --- Main Setup Page Component ---
interface SetupPageProps {
   appSettings: AppSettings;
   onSaveSettings: (newSettings: AppSettings) => void;
   onComplete: () => void;
}

const SetupPage: React.FC<SetupPageProps> = ({ appSettings, onSaveSettings, onComplete }) => {
   // --- State & Handlers ---
   const [tempApiProviders, setTempApiProviders] = useState<ApiProviderConfig[]>(appSettings.apiProviders);
   const [editingId, setEditingId] = useState<string | null>(null);
   const [formData, setFormData] = useState<Partial<ApiProviderConfig>>({});
   const [showPasswordId, setShowPasswordId] = useState<string | null>(null);
   useEffect(() => { setTempApiProviders(appSettings.apiProviders); }, [appSettings.apiProviders]);
   const startEditing = (id: string) => { setEditingId(id); if (id === 'new') setFormData({ providerId: 'openai', name: '', apiKey: '', baseUrl: '', status: 'unknown' }); else setFormData(tempApiProviders.find(p => p.id === id) || {}); setShowPasswordId(null); };
   const cancelEditing = () => { setEditingId(null); setFormData({}); setShowPasswordId(null); };
   const handleFormChange = (field: keyof ApiProviderConfig, value: string) => { setFormData(prev => ({ ...prev, [field]: value })); };
   const toggleShowPassword = (id: string) => { setShowPasswordId(prev => (prev === id ? null : id)); };
   const testConnection = useCallback(async (configToTest: ApiProviderConfig) => { const updateLocalStatus = (id: string, status: ApiProviderStatus, testedDate?: Date) => { setTempApiProviders(prev => prev.map(p => p.id === id ? { ...p, status, lastTested: testedDate ?? new Date() } : p)); }; updateLocalStatus(configToTest.id, 'testing'); const toastId = `test-setup-${configToTest.id}`; toast.loading(`Testing ${configToTest.name}...`, { id: toastId }); try { await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000)); if (configToTest.apiKey.toLowerCase().includes('valid')) { updateLocalStatus(configToTest.id, 'valid', new Date()); toast.success(`${configToTest.name} OK!`, { id: toastId }); } else { throw new Error("Invalid Key (Sim)"); } } catch (error: any) { updateLocalStatus(configToTest.id, 'invalid', new Date()); toast.error(`${configToTest.name} failed: ${error.message}`, { id: toastId, duration: 5000 }); console.error(`Test failed:`, error); } }, [setTempApiProviders]);
   const handleSave = () => { if (!formData.name?.trim() || !formData.apiKey?.trim() || !formData.providerId) { toast.error("Required fields missing."); return; } let updatedProviders: ApiProviderConfig[]; const saveData: ApiProviderConfig = { id: editingId === 'new' ? uuidv4() : editingId!, providerId: formData.providerId!, name: formData.name.trim(), apiKey: formData.apiKey.trim(), baseUrl: formData.baseUrl?.trim() || undefined, status: 'unknown', lastTested: undefined }; if (editingId === 'new') { updatedProviders = [...tempApiProviders, saveData]; toast.success(`${saveData.name} added`); } else { updatedProviders = tempApiProviders.map(p => p.id === editingId ? saveData : p); toast.success(`${saveData.name} updated`); } setTempApiProviders(updatedProviders); cancelEditing(); };
   const handleDelete = (id: string) => { const name = tempApiProviders.find(p => p.id === id)?.name || 'config'; if (window.confirm(`Remove "${name}"?`)) { setTempApiProviders(prev => prev.filter(p => p.id !== id)); toast.success(`"${name}" removed`); if (editingId === id) cancelEditing(); } };
   const handleFinishSetup = () => { onSaveSettings({ ...appSettings, apiProviders: tempApiProviders }); onComplete(); };
   const handleSkip = () => { if (tempApiProviders.length > 0 || window.confirm("Skip adding API keys?")) { onComplete(); } };
   // Ensure commonProviders is defined here or imported
   const commonProviders = [{ id: 'openai', name: 'OpenAI' }, { id: 'anthropic', name: 'Anthropic' }, { id: 'groq', name: 'Groq' }, { id: 'google', name: 'Google (Gemini)' }, { id: 'cohere', name: 'Cohere' }, { id: 'ollama', name: 'Ollama (Local)', defaultBaseUrl: 'http://localhost:11434/v1' }, { id: 'lmstudio', name: 'LM Studio (Local)', defaultBaseUrl: 'http://localhost:1234/v1' }, { id: 'custom', name: 'Custom (Other)' },];

   // --- Animation Variants ---
   const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { delay: 0.1, staggerChildren: 0.15 } }, exit: { opacity: 0, transition: { duration: 0.3 } } };
   const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100, damping: 15 } } };
   const listContainerVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
   const footerVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { delay: 0.5 } } };

   return (
      <motion.div
         key="setup" variants={containerVariants} initial="hidden" animate="visible" exit="exit"
         className="relative flex flex-col items-center justify-center h-full text-center p-4 sm:p-8 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black text-neutral-100 overflow-hidden"
      >
         <motion.div className="absolute inset-0 z-0 opacity-10">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-sky-800 rounded-full filter blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-purple-800 rounded-full filter blur-3xl animation-delay-2000 animate-pulse"></div>
         </motion.div>

         <div className="relative z-10 w-full max-w-2xl flex flex-col">
         {/* Header */}
            <motion.div variants={itemVariants} className="mb-10 text-center">
               <KeyRound
                  size={48}
                  className="text-sky-400 mb-5 inline-block drop-shadow-[0_0_12px_rgba(56,189,248,0.5)]"
               />
               <h1 className="text-3xl sm:text-5xl font-extrabold mb-3 bg-gradient-to-r from-indigo-400 via-purple-400 to-sky-400 text-transparent bg-clip-text">
                  Connect Your API Keys
               </h1>
               <p className="text-lg text-neutral-300 max-w-lg mx-auto">
                  Unlock the full power of AI Chat by adding your API keys. Get started in seconds!
               </p>
            </motion.div>


            {/* API Providers List/Form Area */}
            <motion.div variants={listContainerVariants} className="space-y-3 max-h-[50vh] overflow-y-auto custom-scrollbar mb-8 border border-neutral-800/50 bg-black/10 p-3 rounded-lg shadow-inner -mr-3 pr-3">
               {/* Use AnimatePresence for add/remove of cards */}
               <AnimatePresence initial={false}>
                  {tempApiProviders.map((config) => (
                     <ApiProviderCard
                        key={config.id} // Use stable ID
                        config={config}
                        isEditing={editingId === config.id}
                        formData={editingId === config.id ? formData : {}}
                        showPasswordId={showPasswordId}
                        onEdit={startEditing} onDelete={handleDelete} onTest={testConnection}
                        onFormChange={handleFormChange} onSave={handleSave} onCancel={cancelEditing}
                        onToggleShowPassword={toggleShowPassword}
                        commonProviders={commonProviders}
                     />
                  ))}
                  {/* Add New Form Card appears via state change */}
                  {editingId === 'new' && (
                     <ApiProviderCard
                        key="new-provider-form" // Static key for the add form
                        config={{ id: 'new', providerId: 'openai', name: '', apiKey: '', status: 'unknown' }}
                        isEditing={true} formData={formData} showPasswordId={showPasswordId}
                        onEdit={() => { }} onDelete={() => { }} onTest={() => { }}
                        onFormChange={handleFormChange} onSave={handleSave} onCancel={cancelEditing}
                        onToggleShowPassword={toggleShowPassword} commonProviders={commonProviders}
                     />
                  )}
               </AnimatePresence>
               {tempApiProviders.length === 0 && editingId !== 'new' && (<p className="text-sm text-neutral-500 italic py-4">No API providers added yet.</p>)}
            </motion.div>

            {/* Add New Button */}
            {!editingId && (
               <motion.div layout variants={itemVariants} className="mb-8">
                  <button onClick={() => startEditing('new')} className="inline-flex items-center space-x-2 px-4 py-2 text-sm rounded-lg border border-neutral-700 bg-neutral-800/60 text-neutral-300 hover:text-white hover:border-neutral-600 hover:bg-neutral-700/60 transition-colors focus:outline-none focus:ring-1 focus:ring-sky-600">
                     <Plus size={16} /><span>Add API Provider</span>
                  </button>
               </motion.div>
            )}

            {/* Footer Actions */}
            <motion.div variants={footerVariants} className="flex justify-between items-center w-full">
               <button onClick={handleSkip} className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors px-4 py-2 rounded hover:bg-neutral-700/50 focus:outline-none focus:ring-1 focus:ring-neutral-600">
                  Skip for Now
               </button>
               <button onClick={handleFinishSetup} disabled={editingId !== null} className="flex items-center space-x-2 px-7 py-3 bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-lg text-base font-semibold hover:from-sky-600 hover:to-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-neutral-950 transition-all duration-150 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                  <span>Finish Setup</span>
                  <ArrowRight size={20} />
               </button>
            </motion.div>
         </div>
      </motion.div>
   );
};

export default SetupPage;