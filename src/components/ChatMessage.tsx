// src/components/ChatMessage.tsx
import React, { useState, useEffect, useRef } from "react";
import { ChatMessage as Message } from "../types/chat";
import { User, Cpu, AlertTriangle, RefreshCcw, Edit3, Copy, ThumbsUp, ThumbsDown, Trash2, Check } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'; // Ensure GFM plugin for tables, strikethrough etc.
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'; // Use only dark theme
import { format } from 'date-fns';
import TextareaAutosize from 'react-textarea-autosize';
import toast from "react-hot-toast";
import clsx from 'clsx';

// --- Message Actions Component (Internal Helper) ---
interface MessageActionsProps {
  messageId: string;
  messageContent: string;
  onDelete: (id: string) => void;
  onEdit?: () => void; // Optional: Callback to trigger edit mode in parent
  isUser: boolean;
  context?: 'message' | 'code';
}

const MsgActions: React.FC<MessageActionsProps> = ({
  messageId, messageContent, onDelete, onEdit, isUser, context = 'message'
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageContent);
      setCopied(true);
      toast.success("Copied!");
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      toast.error("Copy failed");
      console.error("Failed to copy:", err);
    }
  };

  // Dark theme button styles
  const buttonClass = "p-1 rounded text-neutral-400 hover:text-neutral-100 hover:bg-neutral-700/50 focus:outline-none focus:ring-1 focus:ring-neutral-500 transition-colors duration-150";
  const iconSize = context === 'code' ? 14 : 15;

  return (
    <div className="flex items-center space-x-0.5">
      {/* Edit button */}
      {context === 'message' && isUser && onEdit && (
        <button onClick={onEdit} className={buttonClass} title="Edit message">
          <Edit3 size={iconSize} />
        </button>
      )}
      {/* Copy button */}
      <button onClick={handleCopy} className={clsx(buttonClass, copied && 'text-green-500')} title={copied ? "Copied" : "Copy"}>
        {copied ? <Check size={iconSize} /> : <Copy size={iconSize} />}
      </button>
      {/* Feedback buttons */}
      {context === 'message' && !isUser && (
        <>
          <button className={buttonClass} title="Good response"><ThumbsUp size={iconSize} /></button>
          <button className={buttonClass} title="Bad response"><ThumbsDown size={iconSize} /></button>
        </>
      )}
      {/* Delete button */}
      {context === 'message' && (
        <button onClick={() => onDelete(messageId)} className={`${buttonClass} hover:text-red-400 focus:ring-red-500`} title="Delete message">
          <Trash2 size={iconSize} />
        </button>
      )}
    </div>
  );
};


// --- Combined Chat Message Component (Handles Display and Edit) ---
interface ChatMessageProps {
  message: Message;
  onDelete: (id: string) => void;
  onRegenerate: () => void;
  showRegenerate?: boolean;
  isEditing: boolean; // Prop from App.tsx to control state
  onEdit: (messageId: string) => void; // Prop to START editing
  onSaveEdit: (messageId: string, newContent: string) => void; // Prop to SAVE edit
  onCancelEdit: () => void; // Prop to CANCEL edit
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message, onDelete, onRegenerate, showRegenerate = false,
  isEditing, onEdit, onSaveEdit, onCancelEdit
}) => {
  const isUser = message.role === "user";
  const isError = message.isError ?? false;
  const Icon = isUser ? User : isError ? AlertTriangle : Cpu;
  const codeTheme = oneDark; // Use dark theme for code highlighting

  // State for editing content *inside* this component
  const [editedContent, setEditedContent] = useState(message.content);
  const [isCodeExpanded, setIsCodeExpanded] = useState(false);
  const textareaEditRef = useRef<HTMLTextAreaElement>(null);

  // Update local edit state and focus when isEditing prop becomes true
  useEffect(() => {
    if (isEditing) {
      setEditedContent(message.content); // Reset to current message content on edit start
      const focusTimer = setTimeout(() => {
        textareaEditRef.current?.focus();
        textareaEditRef.current?.select();
      }, 50);
      return () => clearTimeout(focusTimer);
    }
  }, [isEditing, message.content]); // Rerun if editing starts or original content changes

  // Internal save handler calls the prop
  const handleSave = () => {
    onSaveEdit(message.id, editedContent);
  };

  // Internal keyboard handler for editing textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { // Save on Enter (if not Shift+Enter)
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') { // Cancel on Escape
      onCancelEdit(); // Call cancel prop
    }
  };

  // --- Styling & Constants ---
  const iconContainerClass = `flex-shrink-0 w-7 h-7 mt-1 rounded-md flex items-center justify-center shadow-sm ${isUser ? 'bg-teal-700' : isError ? 'bg-red-800' : 'bg-neutral-700'}`;
  const iconColorClass = isError ? 'text-red-200' : 'text-neutral-100';
  const formattedTimestamp = format(new Date(message.timestamp), 'p'); // 'p' gives localized time like '3:15 PM'
  const isIndicator = isError && (message.content === 'Regenerating response...' || message.content === 'Generation stopped.');
  const CODE_EXPAND_THRESHOLD_LINES = 15; // Lines before "Show More" appears

  return (
    // Main message container div
    <div className={clsx(
      `group relative flex items-start space-x-3 sm:space-x-4 px-1 py-3 md:px-0 transition-colors duration-150 rounded-md`,
      // Add background/border highlight when editing
      isEditing ? 'bg-neutral-800/40 border border-sky-700/50' : 'hover:bg-neutral-800/50',
      // Add error background only when *not* editing and *not* an indicator message
      isError && !isIndicator && !isEditing && 'bg-red-950/30'
    )}>
      {/* Icon */}
      <div className={iconContainerClass}>
        <Icon size={16} className={iconColorClass} strokeWidth={isUser ? 2 : 1.5} />
      </div>

      {/* Message Content Area: Switches between Display and Edit */}
      <div className="flex-1 overflow-hidden min-w-0">
        {isEditing ? (
          // --- EDITING UI ---
          <div className="space-y-2">
            <TextareaAutosize
              ref={textareaEditRef}
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-neutral-700 border border-neutral-600 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none text-neutral-100 placeholder-neutral-400 text-sm p-2 custom-scrollbar"
              minRows={1} // Start small, grows automatically
              maxRows={15} // Limit growth to prevent excessive height
            />
            {/* Save/Cancel Buttons */}
            <div className="flex justify-end space-x-2">
              <button
                onClick={onCancelEdit} // Call cancel prop
                className="px-3 py-1 text-xs rounded bg-neutral-600 hover:bg-neutral-500 text-neutral-200 transition-colors focus:outline-none focus:ring-1 focus:ring-neutral-500"
              >
                Cancel
              </button>
              <button
                onClick={handleSave} // Call internal save handler
                className="px-3 py-1 text-xs rounded bg-sky-600 hover:bg-sky-700 text-white transition-colors focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                Save Edit
              </button>
            </div>
          </div>
        ) : (
          // --- DISPLAY UI ---
          <>
            {isIndicator ? (
              // Simple text for indicator messages
              <p className="text-sm text-neutral-400 italic pt-1">{message.content}</p>
            ) : (
              // Markdown rendering for normal messages
              <div className="prose prose-sm prose-invert max-w-none break-words leading-relaxed pt-0.5">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]} // Enable GitHub Flavored Markdown (tables, etc.)
                  components={{
                    // --- Code Block Rendering ---
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      const codeString = String(children).replace(/\n$/, '');
                      const lineCount = codeString.split('\n').length;
                      const isLongCode = lineCount > CODE_EXPAND_THRESHOLD_LINES;

                      // Handle Block Code (with language)
                      if (!inline && match) {
                        return (
                          <div className="relative my-3 text-xs border border-neutral-700/80 rounded-md overflow-hidden bg-neutral-850">
                            {/* Header */}
                            <div className="flex items-center justify-between px-3 py-1 bg-neutral-900 border-b border-neutral-700">
                              <span className="text-neutral-400 text-[11px] font-medium lowercase">{match[1]}</span>
                              <MsgActions messageId={`code-${message.id}-${match[1]}`} messageContent={codeString} onDelete={() => { }} isUser={false} context="code" />
                            </div>
                            {/* Code Area */}
                            <div className={clsx(!isCodeExpanded && isLongCode && `max-h-[250px] overflow-hidden relative`)}>
                              <SyntaxHighlighter style={codeTheme} language={match[1]} PreTag="div" className="!bg-transparent !p-3 !sm:p-4 custom-scrollbar !my-0" {...props}>
                                {codeString}
                              </SyntaxHighlighter>
                              {/* Expand Button */}
                              {!isCodeExpanded && isLongCode && (
                                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-neutral-850 to-transparent flex justify-center items-end pb-1 pointer-events-none">
                                  <button onClick={() => setIsCodeExpanded(true)} className="text-xs text-neutral-300 bg-neutral-700/80 hover:bg-neutral-600/80 px-2 py-0.5 rounded pointer-events-auto">
                                    Show More ({lineCount} lines)
                                  </button>
                                </div>
                              )}
                            </div>
                            {/* Collapse Button */}
                            {isCodeExpanded && isLongCode && (<button onClick={() => setIsCodeExpanded(false)} className="text-xs text-neutral-400 hover:text-neutral-200 w-full text-center py-1 bg-neutral-800 border-t border-neutral-700"> Show Less </button>)}
                          </div>
                        );
                      }

                      // --- Handle Inline Code ---
                      // Apply specific visible styles directly here
                      return (
                        <code
                          className={clsx(className, "before:content-[''] after:content-[''] px-1 py-0.5 rounded text-xs font-mono bg-neutral-700/60 text-amber-400")}
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                    // --- Other Element Styling (Optional Overrides) ---
                    p: ({ node, ...props }) => <p className="my-2 first:mt-0 last:mb-0" {...props} />,
                    ul: ({ node, ...props }) => <ul className="my-2 list-disc list-inside" {...props} />,
                    ol: ({ node, ...props }) => <ol className="my-2 list-decimal list-inside" {...props} />,
                    li: ({ node, ...props }) => <li className="my-1" {...props} />,
                    blockquote: ({ node, ...props }) => <blockquote className="my-2 pl-3 italic border-l-2 border-neutral-700 text-neutral-400" {...props} />,
                    a: ({ node, ...props }) => <a target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline" {...props} />,
                  }}
                >{message.content}</ReactMarkdown>
              </div>
            )}
            {/* Timestamp */}
            <div className="mt-1 text-[11px] text-neutral-600 select-none">
              {formattedTimestamp}
              {/* TODO: Add "(edited)" indicator if message has an 'editedAt' field */}
            </div>
          </>
        )}
      </div>

      {/* Actions Area (Hover - Only show when NOT editing) */}
      {!isEditing && (
        <div className="flex flex-col items-end flex-shrink-0 self-start pt-1 ml-1 sm:ml-2 space-y-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
          {/* Regenerate button */}
          {showRegenerate && (
            <button onClick={onRegenerate} title="Regenerate response" className="p-1 rounded text-neutral-400 hover:text-neutral-100 hover:bg-neutral-700/50 focus:outline-none focus:ring-1 focus:ring-neutral-500 transition-colors duration-150">
              <RefreshCcw size={15} />
            </button>
          )}
          {/* Standard actions (Copy, Edit, Delete, Feedback) */}
          {!isIndicator && (
            <MsgActions
              messageId={message.id}
              messageContent={message.content}
              onDelete={onDelete}
              isUser={isUser}
              // Pass the callback to trigger editing in App.tsx
              onEdit={isUser ? () => onEdit(message.id) : undefined}
              context="message"
            />
          )}
        </div>
      )}
    </div>
  );
};

export default ChatMessage;