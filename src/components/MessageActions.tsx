import React, { useState } from "react";
import { Copy, Trash2, Check, ThumbsDown, ThumbsUp } from "lucide-react";

interface MessageActionsProps {
  messageId: string;
  messageContent: string;
  onDelete: (id: string) => void;
  context?: 'message' | 'code'; // Context for styling/conditional rendering
}

const MessageActions: React.FC<MessageActionsProps> = ({
  messageId,
  messageContent,
  onDelete,
  context = 'message'
}) => {
  const [copied, setCopied] = useState(false);
  // Add state for feedback later if needed
  // const [feedback, setFeedback] = useState<'good' | 'bad' | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const buttonClass = `p-1 rounded text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-700/50
                       focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-500 transition-colors duration-150`;

  const iconSize = context === 'code' ? 14 : 15;

  return (
    <div className="flex items-center space-x-0.5">
      <button
        onClick={handleCopy}
        className={`${buttonClass} ${copied ? 'text-green-600 dark:text-green-500' : ''}`}
        aria-label={copied ? "Copied" : "Copy"}
        title={copied ? "Copied" : "Copy"}
      >
        {copied ? <Check size={iconSize} /> : <Copy size={iconSize} />}
      </button>

      {/* Only show feedback/delete for regular messages */}
      {context === 'message' && (
        <>
          {/* Dummy feedback buttons */}
          <button className={buttonClass} aria-label="Good response" title="Good response"><ThumbsUp size={iconSize} /></button>
          <button className={buttonClass} aria-label="Bad response" title="Bad response"><ThumbsDown size={iconSize} /></button>

          {/* Delete button */}
          <button
            onClick={() => onDelete(messageId)} // Confirmation is handled in App.tsx if needed
            className={`${buttonClass} hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 focus:ring-red-500`}
            aria-label="Delete message"
            title="Delete message"
          >
            <Trash2 size={iconSize} />
          </button>
        </>
      )}
    </div>
  );
};

export default MessageActions;