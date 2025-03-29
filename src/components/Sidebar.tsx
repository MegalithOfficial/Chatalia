// src/components/Sidebar.tsx
import React, { useMemo } from "react";
import { ChatSession } from "../types/chat";
import { Plus, MessageSquare, Trash2, Edit3, Check, X, Settings, Search } from "lucide-react";
import EditableTitle from "./EditableTitle";
import { format, isToday, isYesterday, isThisWeek } from 'date-fns';

// Grouping helper (unchanged)
const groupSessionsByDate = (sessions: ChatSession[]) => {
  const groups: { [key: string]: ChatSession[] } = { Today: [], Yesterday: [], 'Previous 7 Days': [], Older: [] };
  const sortedSessions = [...sessions].sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
  sortedSessions.forEach(session => {
    try {
      const date = new Date(session.lastModified); if (isNaN(date.getTime())) throw new Error("Invalid date");
      if (isToday(date)) groups.Today.push(session);
      else if (isYesterday(date)) groups.Yesterday.push(session);
      else if (isThisWeek(date, { weekStartsOn: 1 })) groups['Previous 7 Days'].push(session);
      else groups.Older.push(session);
    } catch (e) { console.warn(`Date error session ${session.id}:`, e); groups.Older.push(session); }
  });
  return Object.entries(groups).filter(([, value]) => value.length > 0);
};

interface SidebarProps {
  sessions: ChatSession[]; // Receives *filtered* sessions from App.tsx now
  activeSessionId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, newTitle: string) => void;
  onOpenSettings: () => void;
  // Search Props added
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
}

// Sidebar Item Component (Dark theme styles)
const SidebarItem: React.FC<{
  session: ChatSession; isActive: boolean; onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void; onRenameChat: (id: string, newTitle: string) => void;
}> = ({ session, isActive, onSelectChat, onDeleteChat, onRenameChat }) => {
  return (
    <div
      className={`group relative flex items-center justify-between px-3 py-2.5 rounded-md cursor-pointer text-sm transition-colors duration-100 ease-in-out ${isActive ? 'bg-neutral-750 text-neutral-100 font-medium' : 'text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100'}`}
      onClick={() => onSelectChat(session.id)} role="button" aria-current={isActive ? "page" : undefined}
    >
      <div className="flex items-center overflow-hidden mr-1 flex-1 min-w-0 space-x-2.5">
        <MessageSquare className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-neutral-100' : 'text-neutral-500'}`} />
        <EditableTitle
          initialTitle={session.title} onSave={(newTitle) => onRenameChat(session.id, newTitle)}
          inputClassName="w-full bg-transparent focus:ring-1 focus:ring-sky-500 rounded px-1 py-0.5 text-sm border-none text-neutral-100"
          displayTextClassName={`text-sm truncate block ${isActive ? 'text-neutral-100' : 'text-neutral-300 group-hover:text-neutral-100'}`}
          saveButtonClassName="ml-1 p-1 text-green-500 hover:bg-neutral-700/50 rounded"
          cancelButtonClassName="ml-0.5 p-1 text-neutral-400 hover:bg-neutral-700/50 rounded"
          editButtonClassName="ml-1 p-0.5 text-neutral-500 hover:text-neutral-200 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-150 rounded hover:bg-neutral-700/50"
          editIcon={<Edit3 size={14} />} saveIcon={<Check size={14} />} cancelIcon={<X size={14} />}
        />
      </div>
      <div className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center opacity-0 ${isActive ? 'opacity-100' : 'group-hover:opacity-100'} transition-opacity duration-150`}>
        <button onClick={(e) => { e.stopPropagation(); onDeleteChat(session.id); }} className="p-1 text-neutral-400 hover:text-red-400 hover:bg-neutral-700/80 rounded focus:outline-none focus:ring-1 focus:ring-red-500" aria-label={`Delete chat: ${session.title}`} title="Delete chat">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};


const Sidebar: React.FC<SidebarProps> = ({
  sessions, // Expecting filtered sessions here
  activeSessionId, onNewChat, onSelectChat, onDeleteChat,
  onRenameChat, onOpenSettings, searchTerm, onSearchTermChange
}) => {

  // Group the already filtered sessions passed via props
  const groupedSessions = useMemo(() => groupSessionsByDate(sessions), [sessions]);

  return (
    <aside className="w-64 flex flex-col bg-neutral-950 text-neutral-200 border-r border-neutral-800 flex-shrink-0">
      {/* Header */}
      <div className="p-2 space-y-2">
        <button onClick={() => onNewChat()} type="button"
        className="w-full flex items-center px-3 py-2.5 text-sm rounded-md border border-neutral-700 text-neutral-200 hover:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-500 transition-colors duration-150">
          <Plus className="h-4 w-4 mr-2.5" /> New Chat
        </button>
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"> <Search className="h-4 w-4 text-neutral-500" /> </div>
          <input type="text" placeholder="Search chats..." value={searchTerm} onChange={(e) => onSearchTermChange(e.target.value)}
            className="form-input block w-full pl-9 pr-3 py-1.5 rounded-md border-0 bg-neutral-800 text-neutral-100 placeholder-neutral-500 focus:ring-1 focus:ring-inset focus:ring-sky-500 sm:text-sm"
          />
        </div>
      </div>

      {/* Chat List */}
      <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-1 custom-scrollbar">
        {sessions.length === 0 && searchTerm && (<p className="text-center text-xs text-neutral-500 mt-4 px-2">No chats match '{searchTerm}'.</p>)}
        {groupedSessions.length === 0 && !searchTerm && (<p className="text-center text-xs text-neutral-500 mt-4 px-2">No chats yet.</p>)}

        {groupedSessions.map(([groupName, groupSessions]) => (
          <div key={groupName} className="mb-2">
            <h3 className="px-3 pt-3 pb-1 text-xs font-semibold text-neutral-500 uppercase tracking-wide select-none"> {groupName} </h3>
            <div className="space-y-1">
              {groupSessions.map((session) => (
                <SidebarItem key={session.id} session={session} isActive={activeSessionId === session.id}
                  onSelectChat={onSelectChat} onDeleteChat={onDeleteChat} onRenameChat={onRenameChat}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-2 border-t border-neutral-800 space-y-1">
        <button onClick={onOpenSettings} className="w-full flex items-center px-3 py-2 text-sm text-neutral-300 rounded-md hover:bg-neutral-800 hover:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-500 transition-colors duration-150" title="Open Settings">
          <Settings className="h-4 w-4 mr-2.5" /> Settings
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;