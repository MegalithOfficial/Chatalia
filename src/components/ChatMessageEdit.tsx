// src/components/ChatMessageEdit.tsx
import React, { useState, useEffect, useRef } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { ChatMessage as Message } from "../types/chat";
import { User } from 'lucide-react'; // Assuming only user messages are editable

interface ChatMessageEditProps {
   message: Message; // The original message content and ID
   onSave: (messageId: string, newContent: string) => void; // Callback to save changes
   onCancel: () => void; // Callback to cancel editing
}

const ChatMessageEdit: React.FC<ChatMessageEditProps> = ({ message, onSave, onCancel }) => {
   const [editedContent, setEditedContent] = useState(message.content);
   const textareaEditRef = useRef<HTMLTextAreaElement>(null);

   // Focus and select text when the component mounts
   useEffect(() => {
      // Delay focus slightly to ensure element is fully ready
      const focusTimer = setTimeout(() => {
         textareaEditRef.current?.focus();
         textareaEditRef.current?.select();
      }, 50);
      return () => clearTimeout(focusTimer); // Cleanup timer on unmount
   }, []); // Run only once when editing starts

   const handleSave = () => {
      // Parent (App.tsx) handles trimming and checking if content is empty
      onSave(message.id, editedContent);
   };

   // Handle keyboard shortcuts within the textarea
   const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) { // Save on Enter (if not Shift+Enter)
         e.preventDefault();
         handleSave();
      } else if (e.key === 'Escape') { // Cancel on Escape
         onCancel();
      }
   };

   // Dark theme icon styles (assuming user message edit)
   const iconContainerClass = "flex-shrink-0 w-7 h-7 mt-1 rounded-md flex items-center justify-center shadow-sm bg-teal-700";
   const iconColorClass = "text-neutral-100";

   return (
      // Container with border to indicate editing state
      <div className="flex items-start space-x-3 sm:space-x-4 px-1 py-3 md:px-0 bg-neutral-800/40 rounded-md border border-sky-700/50">
         {/* Icon */}
         <div className={iconContainerClass}>
            <User size={16} className={iconColorClass} strokeWidth={2} />
         </div>

         {/* Editing Form */}
         <div className="flex-1 overflow-hidden min-w-0 space-y-2">
            <TextareaAutosize
               ref={textareaEditRef}
               value={editedContent}
               onChange={(e) => setEditedContent(e.target.value)}
               onKeyDown={handleKeyDown}
               className="w-full bg-neutral-700 border border-neutral-600 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none text-neutral-100 placeholder-neutral-400 text-sm p-2 custom-scrollbar"
               minRows={1} // Start small
               maxRows={15} // Limit growth
            />
            {/* Action Buttons */}
            <div className="flex justify-end space-x-2">
               <button
                  onClick={onCancel}
                  className="px-3 py-1 text-xs rounded bg-neutral-600 hover:bg-neutral-500 text-neutral-200 transition-colors focus:outline-none focus:ring-1 focus:ring-neutral-500"
               >
                  Cancel
               </button>
               <button
                  onClick={handleSave}
                  className="px-3 py-1 text-xs rounded bg-sky-600 hover:bg-sky-700 text-white transition-colors focus:outline-none focus:ring-1 focus:ring-sky-500"
               >
                  Save Edit
               </button>
            </div>
         </div>
      </div>
   );
};

export default ChatMessageEdit;