import React, { useState, useRef, useEffect } from 'react';
import { Edit3, Check, X } from "lucide-react";

interface EditableTitleProps {
  initialTitle: string;
  onSave: (newTitle: string) => void;
  inputClassName?: string;
  saveButtonClassName?: string;
  cancelButtonClassName?: string;
  displayContainerClassName?: string;
  displayTextClassName?: string;
  editButtonClassName?: string;
  editingContainerClassName?: string;
  editIcon?: React.ReactNode;
  saveIcon?: React.ReactNode;
  cancelIcon?: React.ReactNode;
  isEditingByDefault?: boolean;
}

const EditableTitle: React.FC<EditableTitleProps> = ({
  initialTitle,
  onSave,
  inputClassName = "flex-grow bg-transparent border-none rounded px-1 py-0.5 text-sm text-neutral-100 focus:outline-none focus:ring-1 focus:ring-sky-500",
  saveButtonClassName = "ml-1 p-1 text-green-500 hover:bg-neutral-700/50 rounded",
  cancelButtonClassName = "ml-0.5 p-1 text-neutral-400 hover:bg-neutral-700/50 rounded",
  displayContainerClassName = "flex items-center group min-w-0",
  displayTextClassName = "text-sm truncate cursor-pointer text-neutral-300 group-hover:text-neutral-100 block",
  editButtonClassName = "ml-1 p-0.5 text-neutral-500 hover:text-neutral-200 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-150 rounded hover:bg-neutral-700/50",
  editingContainerClassName = "flex items-center w-full",
  editIcon = <Edit3 size={14} />,
  saveIcon = <Check size={16} />,
  cancelIcon = <X size={16} />,
  isEditingByDefault = false,
}) => {
  const [isEditing, setIsEditing] = useState(isEditingByDefault);
  const [title, setTitle] = useState(initialTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) setTitle(initialTitle);
  }, [initialTitle, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmedTitle = title.trim();
    if (trimmedTitle && trimmedTitle !== initialTitle) onSave(trimmedTitle);
    else if (!trimmedTitle) setTitle(initialTitle);
    setIsEditing(false);
  };

  const handleCancel = () => { setTitle(initialTitle); setIsEditing(false); };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') handleSave(); else if (e.key === 'Escape') handleCancel(); };
  const handleSaveMouseDown = (e: React.MouseEvent) => { e.preventDefault(); handleSave(); };
  const handleCancelMouseDown = (e: React.MouseEvent) => { e.preventDefault(); handleCancel(); };

  if (isEditing) {
    return (
      <div className={editingContainerClassName}>
        <input ref={inputRef} type="text" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={handleCancel} onKeyDown={handleKeyDown} className={inputClassName} aria-label="Edit title" />
        <button onMouseDown={handleSaveMouseDown} className={saveButtonClassName} aria-label="Save title">{saveIcon}</button>
        <button onMouseDown={handleCancelMouseDown} className={cancelButtonClassName} aria-label="Cancel editing title">{cancelIcon}</button>
      </div>
    );
  }

  return (
    <div className={displayContainerClassName}>
      <span className={displayTextClassName} title={initialTitle} onClick={() => setIsEditing(true)}>{initialTitle}</span>
      <button onClick={() => setIsEditing(true)} className={editButtonClassName} aria-label="Edit title">{editIcon}</button>
    </div>
  );
};

export default EditableTitle;