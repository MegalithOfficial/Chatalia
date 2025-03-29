// src/App.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence } from "framer-motion";
import { v4 as uuidv4 } from "uuid";
import TextareaAutosize from "react-textarea-autosize";
import {
    Loader2,
    ArrowUp,
    Settings as GlobalSettingsIcon,
    Square,
    Paperclip,
    ChevronDown,
    SlidersHorizontal,
} from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";

// Component Imports (Ensure these paths are correct for your project)
import Sidebar from "./components/Sidebar";
import ChatMessage from "./components/ChatMessage";
import EmptyState from "./components/EmptyState";
import SettingsModal from "./components/SettingsModal";
import ChatSettingsModal from "./components/ChatSettingsModal";
import WelcomePage from "./components/WelcomePage";
import SetupPage from "./components/SetupPage";
import ConfirmModal from "./components/ConfirmModal";

// Type and Config Imports (Ensure these paths are correct)
import {
    ChatSession,
    ChatMessage as Message,
    AppSettings,
    ChatSettings,
    ApiProviderConfig,
} from "./types/chat";
import {
    DEFAULT_APP_SETTINGS,
    APP_SETTINGS_KEY,
    findModelById,
    getProviderIdFromModel,
    DEFAULT_CHAT_SETTINGS,
    ONBOARDING_COMPLETE_KEY,
} from "./config";

// Storage Keys
const SESSIONS_KEY = "ai_chat_sessions_v4_dark";
const ACTIVE_SESSION_KEY = `${SESSIONS_KEY}_active`;

// --- Helper Functions ---

// Simulation (Replace with actual API call)
const simulateAIResponse = async (
    prompt: string,
    settings: ChatSettings,
    apiKey: string | undefined,
    baseUrl: string | undefined,
    signal?: AbortSignal
): Promise<string> => {
    console.log("Simulating AI call:", {
        settings,
        apiKeyProvided: !!apiKey,
        baseUrl,
    });
    if (!apiKey) {
        const modelInfo = findModelById(settings.model);
        const providerName = modelInfo?.provider || "provider";
        throw new Error(`API Key/Config for ${providerName} not set.`);
    }
    const delay = 800 + Math.random() * 700;
    await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(resolve, delay);
        signal?.addEventListener("abort", () => {
            clearTimeout(timeoutId);
            reject(new DOMException("Aborted", "AbortError"));
        });
    });
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const variation =
        Math.random() > 0.7
            ? `(Using ${settings.model} at temp ${settings.temperature}) `
            : "";
    const sysPromptInfo = settings.systemPrompt
        ? `\nSysPrompt: "${settings.systemPrompt.substring(0, 50)}..."`
        : "";
    const baseUrlInfo = baseUrl ? `\nBaseURL: ${baseUrl}` : "";
    return `${variation}Simulated response: "${prompt}".${sysPromptInfo}${baseUrlInfo}\n\n\`\`\`python\n# Example\nprint("Simulated")\n\`\`\``;
};
// Safe date parsing
const parseDate = (dateStr: string | Date | undefined): Date => {
    if (!dateStr) return new Date();
    try {
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? new Date() : date;
    } catch {
        return new Date();
    }
};

// Onboarding State Type
type OnboardingStep = "loading" | "welcome" | "setup" | "done";

// --- Main App Component ---
function App() {
    // --- State ---
    const [input, setInput] = useState<string>("");
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false); // AI response loading
    const [isSettingsModalOpen, setIsSettingsModalOpen] =
        useState<boolean>(false);
    const [isChatSettingsModalOpen, setIsChatSettingsModalOpen] =
        useState<boolean>(false);
    const [initialLoadComplete, setInitialLoadComplete] =
        useState<boolean>(false); // Tracks if initial data load finished
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [sidebarSearchTerm, setSidebarSearchTerm] = useState<string>("");
    const [appSettings, setAppSettings] =
        useState<AppSettings>(DEFAULT_APP_SETTINGS);
    const [onboardingStep, setOnboardingStep] =
        useState<OnboardingStep>("loading");
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
    const [confirmModalProps, setConfirmModalProps] = useState<{
        message: string;
        onConfirm: () => void;
        title?: string;
        confirmText?: string;
        cancelText?: string;
        confirmVariant?: "danger" | "primary";
    } | null>(null);

    // --- Refs ---
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // --- Derived State ---
    const activeSession = sessions.find((s) => s.id === activeSessionId);
    const effectiveChatSettings =
        activeSession?.settings ?? appSettings.defaultChatSettings;
    const isUsingDefaultSettings = !activeSession?.settings;
    const effectiveModelInfo = findModelById(effectiveChatSettings.model);
    const filteredSessions = sessions.filter((s) =>
        s.title.toLowerCase().includes(sidebarSearchTerm.toLowerCase())
    );

    // --- Effects ---

    // Load Global Settings, Sessions, AND Check Onboarding Status
    useEffect(() => {
        const loadInitialData = async () => {
            console.log("Starting initial load...");
            let onboardingWasComplete = false;
            let loadedSuccessfully = true; // Assume success unless error occurs

            try {
                // Check onboarding status first
                onboardingWasComplete =
                    localStorage.getItem(ONBOARDING_COMPLETE_KEY) === "true";
                console.log("Onboarding previously completed:", onboardingWasComplete);

                // --- Load App Settings (Always attempt) ---
                try {
                    console.log("Invoking load_app_settings...");
                    const loadedAppSettings = await invoke<AppSettings>(
                        "load_app_settings"
                    );
                    console.log("Loaded settings from backend.");
                    setAppSettings((prev) => ({
                        // Deep merge with defaults
                        ...DEFAULT_APP_SETTINGS,
                        ...loadedAppSettings,
                        defaultChatSettings: {
                            ...DEFAULT_APP_SETTINGS.defaultChatSettings,
                            ...(loadedAppSettings.defaultChatSettings || {}),
                        },
                        apiProviders: Array.isArray(loadedAppSettings.apiProviders)
                            ? loadedAppSettings.apiProviders
                            : [],
                        sendWithEnter:
                            typeof loadedAppSettings.sendWithEnter === "boolean"
                                ? loadedAppSettings.sendWithEnter
                                : DEFAULT_APP_SETTINGS.sendWithEnter,
                    }));
                } catch (error) {
                    console.error("Failed to load app settings from backend:", error);
                    toast.error(`Error loading settings: ${error}`);
                    setAppSettings(DEFAULT_APP_SETTINGS); // Fallback to defaults
                    loadedSuccessfully = false;
                }

                // --- Load Sessions (Only if onboarding was already complete) ---
                if (onboardingWasComplete) {
                    console.log("Loading sessions...");
                    try {
                        const storedSessions = localStorage.getItem(SESSIONS_KEY);
                        if (storedSessions) {
                            const loadedSessions: ChatSession[] = JSON.parse(
                                storedSessions
                            ).map(
                                (s: any): ChatSession => ({
                                    id: s.id || uuidv4(),
                                    title: s.title || "Untitled Chat",
                                    messages: (s.messages || []).map(
                                        (m: any): Message => ({
                                            id: m.id || uuidv4(),
                                            role: m.role === "user" ? "user" : "assistant",
                                            content: m.content || "",
                                            timestamp: parseDate(m.timestamp),
                                            isError: m.isError || false,
                                        })
                                    ),
                                    createdAt: parseDate(s.createdAt),
                                    lastModified: parseDate(s.lastModified),
                                    settings: s.settings
                                        ? {
                                            model: s.settings.model || DEFAULT_CHAT_SETTINGS.model,
                                            temperature:
                                                typeof s.settings.temperature === "number"
                                                    ? s.settings.temperature
                                                    : DEFAULT_CHAT_SETTINGS.temperature,
                                            systemPrompt:
                                                s.settings.systemPrompt ??
                                                DEFAULT_CHAT_SETTINGS.systemPrompt,
                                            maxTokens: s.settings.maxTokens,
                                            topP: s.settings.topP,
                                        }
                                        : undefined,
                                })
                            );
                            setSessions(loadedSessions);
                            const lastActiveId = localStorage.getItem(ACTIVE_SESSION_KEY);
                            if (
                                lastActiveId &&
                                loadedSessions.some((s) => s.id === lastActiveId)
                            )
                                setActiveSessionId(lastActiveId);
                            else if (loadedSessions.length > 0) {
                                const sorted = [...loadedSessions].sort(
                                    (a, b) => b.lastModified.getTime() - a.lastModified.getTime()
                                );
                                setActiveSessionId(sorted[0].id);
                            }
                            console.log("Sessions loaded from localStorage.");
                        } else {
                            console.log("No sessions found in localStorage.");
                        }
                    } catch (error) {
                        console.error(
                            "Failed to parse sessions from local storage:",
                            error
                        );
                        localStorage.removeItem(SESSIONS_KEY);
                        localStorage.removeItem(ACTIVE_SESSION_KEY);
                    }
                } else {
                    console.log("Skipping session load as onboarding is not complete.");
                }
            } catch (e) {
                console.error("Unexpected error during initial load sequence:", e);
                loadedSuccessfully = false;
                toast.error("An error occurred during application startup.");
            } finally {
                // Set onboarding step *before* marking load complete
                if (onboardingWasComplete) {
                    setOnboardingStep("done");
                } else {
                    setOnboardingStep("welcome"); // Go to welcome if not complete
                }
                // Mark initial load as complete AFTER all attempts
                setInitialLoadComplete(true);
                console.log("Initial load sequence finished.");
            }
        };
        loadInitialData();
    }, []); // Run only on mount

    // Save Global Settings (Only save AFTER initial load)
    useEffect(() => {
        if (!initialLoadComplete) return; // Don't save during initial load
        const saveSettings = async () => {
            console.log("Saving App Settings state via backend...");
            try {
                await invoke("save_app_settings", { settings: appSettings });
                console.log("App settings saved.");
            } catch (error) {
                console.error("Failed to save app settings:", error);
                toast.error(`Error saving settings: ${error}`);
            }
        };
        // Consider debouncing this if settings change rapidly, but for modal save it's ok
        saveSettings();
    }, [appSettings, initialLoadComplete]);

    // Save Sessions (Only save AFTER initial load)
    useEffect(() => {
        if (initialLoadComplete) {
            // Check flag
            try {
                if (sessions.length > 0)
                    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
                else localStorage.removeItem(SESSIONS_KEY);
                if (activeSessionId)
                    localStorage.setItem(ACTIVE_SESSION_KEY, activeSessionId);
                else localStorage.removeItem(ACTIVE_SESSION_KEY);
            } catch (e) {
                console.error("Save Session LS Error", e);
            }
        }
    }, [sessions, activeSessionId, initialLoadComplete]); // Depend on flag

    // Scroll to Bottom
    useEffect(() => {
        if (chatContainerRef.current) {
            setTimeout(() => {
                if (chatContainerRef.current)
                    chatContainerRef.current.scrollTo({
                        top: chatContainerRef.current.scrollHeight,
                        behavior: "smooth",
                    });
            }, 100);
        }
    }, [sessions, activeSessionId, isLoading]);
    // Focus Textarea
    useEffect(() => {
        if (
            activeSessionId &&
            !isLoading &&
            !editingMessageId &&
            textareaRef.current
        ) {
            setTimeout(() => textareaRef.current?.focus(), 50);
        }
    }, [activeSessionId, isLoading, editingMessageId]);

    // --- Callbacks & Handlers ---

    const openConfirmation = (
        message: string,
        onConfirm: () => void,
        options?: {
            title?: string;
            confirmText?: string;
            confirmVariant?: "danger" | "primary";
        }
    ) => {
        setConfirmModalProps({
            message,
            onConfirm,
            title: options?.title,
            confirmText: options?.confirmText,
            confirmVariant: options?.confirmVariant ?? "primary",
        });
        setIsConfirmModalOpen(true);
    };

    const handleWelcomeNext = () => setOnboardingStep("setup");
    const handleSetupComplete = () => {
        localStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
        setOnboardingStep("done");
        toast.success("Setup Complete!");
    };

    const confirmAction = (message: string, actionFn: () => void) => {
        if (window.confirm(message)) actionFn();
    };
    const addMessageToActiveSession = useCallback(
        (message: Message, sessionId: string) => {
            if (!sessionId) return;
            setSessions((prev) =>
                prev.map((s) =>
                    s.id === sessionId
                        ? {
                            ...s,
                            messages: [...s.messages, message],
                            lastModified: new Date(),
                        }
                        : s
                )
            );
        },
        []
    );
    const updateSessionTitleIfNeeded = useCallback(
        (sessionId: string, firstMessageContent: string) => {
            setSessions((prev) =>
                prev.map((s) => {
                    if (s.id === sessionId && (s.title === "New Chat" || !s.title)) {
                        const words = firstMessageContent
                            .split(/\s+/)
                            .slice(0, 5)
                            .join(" ");
                        let newTitle =
                            words.length > 35 ? words.substring(0, 32) + "..." : words;
                        if (!newTitle) newTitle = "Chat";
                        return { ...s, title: newTitle, lastModified: new Date() };
                    }
                    return s;
                })
            );
        },
        []
    );

    const performAICall = useCallback(async (prompt: string, sessionForCall: ChatSession) => {
        console.log("Performing AI Call for session:", sessionForCall.id);
        // ** Use the passed session object directly **
        const settingsToUse = sessionForCall.settings ?? appSettings.defaultChatSettings;
        const providerId = getProviderIdFromModel(settingsToUse.model);
        const apiProviderConfig = appSettings.apiProviders.find(p => p.providerId === providerId);
        const apiKey = apiProviderConfig?.apiKey;
        const baseUrl = apiProviderConfig?.baseUrl;

        if (!apiKey) { toast.error(`API Config for '${providerId || 'unknown'}' not found or key missing.`); return; }

        setIsLoading(true); abortControllerRef.current = new AbortController(); const signal = abortControllerRef.current.signal;
        try {
            // Prepare message history from the passed session object
            // You might want to format this according to the specific API requirements
            // const historyForAPI = sessionForCall.messages.map(m => ({ role: m.role, content: m.content }));

            // Pass settings & key/url
            const aiResponseContent = await simulateAIResponse(prompt, settingsToUse, apiKey, baseUrl, signal);
            if (signal.aborted) return;
            const assistantMessage: Message = { id: uuidv4(), role: "assistant", content: aiResponseContent, timestamp: new Date() };
            // Add message using the ID from the passed session
            addMessageToActiveSession(assistantMessage, sessionForCall.id);
        } catch (error: any) {
            if (error.name === 'AbortError') { /* Stop Msg */ addMessageToActiveSession({ id: uuidv4(), role: 'assistant', content: 'Generation stopped.', timestamp: new Date(), isError: true }, sessionForCall.id); }
            else { /* Error Msg + Toast */ console.error("AI Error:", error); addMessageToActiveSession({ id: uuidv4(), role: "assistant", content: `Error: ${error.message}`, timestamp: new Date(), isError: true }, sessionForCall.id); toast.error(`AI Error: ${error.message}`, { duration: 5000 }); }
        } finally { if (!signal?.aborted) setIsLoading(false); abortControllerRef.current = null; }
        // Note: No 'sessions' dependency needed here anymore if using sessionForCall
    }, [addMessageToActiveSession, appSettings]);

    const handleRegenerate = useCallback(async () => {
        if (!activeSessionId || isLoading) return;
        const session = sessions.find(s => s.id === activeSessionId); // Find current session from state
        if (!session) { toast.error("Cannot regenerate: Active session not found."); return; }
        const lastUserMessage = [...session.messages].reverse().find(m => m.role === 'user');
        if (!lastUserMessage) { toast.error("Cannot regenerate: No previous user message found."); return; }

        const indicator: Message = { id: uuidv4(), role: 'assistant', content: 'Regenerating response...', timestamp: new Date(), isError: true };
        addMessageToActiveSession(indicator, activeSessionId); // Add indicator using ID

        // Pass the *current* session object to performAICall
        await performAICall(lastUserMessage.content, session);

    }, [activeSessionId, isLoading, sessions, addMessageToActiveSession, performAICall]);

    const handleStopGenerating = useCallback(() => {
        if (isLoading && abortControllerRef.current)
            abortControllerRef.current.abort();
    }, [isLoading]);

    const handleNewChat = useCallback(() => {
        if(activeSession?.messages.length === 0) return;
         
        console.log("handleNewChat triggered");
        if (isLoading && abortControllerRef.current) {
            abortControllerRef.current.abort();
            console.log("Aborted previous generation.");
        }
        const newSession: ChatSession = {
            id: uuidv4(),
            title: "New Chat",
            messages: [],
            createdAt: new Date(),
            lastModified: new Date(),
        };
        setSessions((prev) => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
        setEditingMessageId(null);
        setInput(""); // Always clear input for a truly new chat
        console.log("Created and selected new empty chat:", newSession.id);
        setTimeout(() => textareaRef.current?.focus(), 50);
    }, [isLoading]); 

    const handleSubmit = useCallback(async (e?: React.FormEvent | string) => {
        if (typeof e !== 'string') e?.preventDefault();
        const textToSend = typeof e === 'string' ? e : input;
        const trimmedInput = String(textToSend || "").trim(); // Defensive string conversion
        if (!trimmedInput || isLoading) return;

        let sessionToUse: ChatSession | null = null;
        let currentSessionId: string | null = activeSessionId;
        let isFirstMessageInSession = false;

        // Find or Create Session
        if (!currentSessionId || sessions.find(s => s.id === currentSessionId)?.messages.length === 0) {
            if (!currentSessionId) {
                const newSession: ChatSession = { id: uuidv4(), title: "New Chat", messages: [], createdAt: new Date(), lastModified: new Date() };
                setSessions(prev => [newSession, ...prev]);
                setActiveSessionId(newSession.id);
                currentSessionId = newSession.id;
                sessionToUse = newSession; // Use the newly created object directly
                console.log("Created new session:", currentSessionId);
            } else {
                // Find the existing empty session
                sessionToUse = sessions.find(s => s.id === currentSessionId) || null;
                console.log("Using existing empty session:", currentSessionId);
            }
            isFirstMessageInSession = true;
        } else {
            // Find the existing non-empty session
            sessionToUse = sessions.find(s => s.id === currentSessionId) || null;
            console.log("Using existing session:", currentSessionId);
        }

        // Guard against session not being found/created correctly
        if (!sessionToUse || !currentSessionId) { toast.error("Failed to find/create chat session."); return; }

        const userMessage: Message = { id: uuidv4(), role: "user", content: trimmedInput, timestamp: new Date() };
        addMessageToActiveSession(userMessage, currentSessionId); // Add message state update
        if (isFirstMessageInSession) updateSessionTitleIfNeeded(currentSessionId, trimmedInput); // Title update state update
        setInput(""); // Input clear state update

        // ** Pass the correct session object to performAICall **
        await performAICall(trimmedInput, sessionToUse);

    }, [input, activeSessionId, isLoading, sessions, addMessageToActiveSession, performAICall, updateSessionTitleIfNeeded, setSessions, appSettings.sendWithEnter]);

    const handleSendPrompt = useCallback((prompt: string) => {
        if (!prompt || isLoading) return;
        handleSubmit(prompt);
        setTimeout(() => textareaRef.current?.focus(), 50);
    }, [isLoading, handleSubmit]);

    const handleSelectChat = useCallback(
        (id: string) => {
            if (isLoading && abortControllerRef.current) {
                abortControllerRef.current.abort();
                setIsLoading(false);
            }
            setActiveSessionId(id);
            setInput("");
            setEditingMessageId(null);
        },
        [isLoading]
    );
    const handleDeleteChat = useCallback(
        (id: string) => {
            const chatTitle = sessions.find((s) => s.id === id)?.title || "this chat";
            openConfirmation(
                `Are you sure you want to permanently delete "${chatTitle}"? This action cannot be undone.`,
                () => {
                    setSessions((prev) => {
                        const updated = prev.filter((s) => s.id !== id);
                        if (activeSessionId === id) {
                            setActiveSessionId(null);
                            if (isLoading && abortControllerRef.current) {
                                abortControllerRef.current.abort();
                                setIsLoading(false);
                            }
                        }
                        return updated;
                    });
                    toast.success(`Chat "${chatTitle}" deleted.`);
                },
                {
                    title: "Delete Chat?",
                    confirmText: "Delete",
                    confirmVariant: "danger",
                } // Options
            );
        },
        [activeSessionId, isLoading]
    );
    const handleRenameChat = useCallback(
        (id: string, newTitle: string) => {
            const oldTitle = sessions.find((s) => s.id === id)?.title;
            setSessions((prev) =>
                prev.map((s) =>
                    s.id === id
                        ? {
                            ...s,
                            title: newTitle.trim() || "Untitled Chat",
                            lastModified: new Date(),
                        }
                        : s
                )
            );
            if (oldTitle !== newTitle.trim()) {
                toast.success("Chat renamed");
            }
        },
        [sessions]
    );
    const handleDeleteMessage = useCallback(
        (messageId: string) => {
            if (!activeSessionId) return;
            setSessions((prev) =>
                prev.map((s) =>
                    s.id === activeSessionId
                        ? {
                            ...s,
                            messages: s.messages.filter((m) => m.id !== messageId),
                            lastModified: new Date(),
                        }
                        : s
                )
            );
        },
        [activeSessionId]
    );
    const handleEditMessage = useCallback((messageId: string) => {
        setEditingMessageId(messageId);
    }, []);
    const handleCancelEdit = useCallback(() => {
        setEditingMessageId(null);
    }, []);
    const handleSaveEdit = useCallback((messageId: string, newContent: string) => {
        if (!activeSessionId) return; const trimmedContent = newContent.trim();
        if (!trimmedContent) { /* ... delete logic ... */ return; }
        let requiresRegeneration = false; let userPromptForRegen = ""; let sessionAfterUpdate: ChatSession | null = null; // To store the updated session state
        setSessions(prev => {
            const newSessions = prev.map(s => {
                if (s.id === activeSessionId) {
                    const msgIdx = s.messages.findIndex(m => m.id === messageId); if (msgIdx === -1) return s; const originalMsg = s.messages[msgIdx];
                    if (originalMsg.content !== trimmedContent && originalMsg.role === 'user') { if (msgIdx < s.messages.length - 1) requiresRegeneration = true; userPromptForRegen = trimmedContent; }
                    let updatedMessages = s.messages.map(m => m.id === messageId ? { ...m, content: trimmedContent, timestamp: new Date() } : m);
                    if (requiresRegeneration) updatedMessages.length = msgIdx + 1;
                    const updatedSession = { ...s, messages: updatedMessages, lastModified: new Date() };
                    sessionAfterUpdate = updatedSession; // Store the updated session
                    return updatedSession;
                } return s;
            });
            return newSessions;
        });
        setEditingMessageId(null); toast.success("Message updated");
        // ** Pass the session object from *after* the state update **
        if (requiresRegeneration && sessionAfterUpdate) {
            console.log("Regenerating after edit...");
            performAICall(userPromptForRegen, sessionAfterUpdate);
        }
    }, [activeSessionId, handleDeleteMessage, performAICall]);

    const handleSaveChatSettings = useCallback(
        (chatId: string, newSettings: ChatSettings) => {
            setSessions((prev) =>
                prev.map((s) =>
                    s.id === chatId
                        ? { ...s, settings: newSettings, lastModified: new Date() }
                        : s
                )
            );
            toast.success("Chat settings saved");
        },
        []
    );
    const handleResetChatSettings = useCallback((chatId: string) => {
        setSessions((prev) =>
            prev.map((s) => {
                if (s.id === chatId) {
                    const { settings, ...rest } = s;
                    return { ...rest, lastModified: new Date() };
                }
                return s;
            })
        );
        toast.success("Chat settings reset to defaults");
    }, []);
    const handleAppSettingsChange = (newSettings: AppSettings) => {
        setAppSettings(newSettings);
    };

    // --- Render Logic ---

    // 1. Show loader until initial data load attempt is complete
    if (!initialLoadComplete) {
        return (
            <div className="flex h-screen items-center justify-center bg-neutral-950">
                <Loader2 className="h-10 w-10 animate-spin text-sky-500" />
            </div>
        );
    }

    // 2. Show onboarding steps if not done
    // Using AnimatePresence to transition between onboarding steps if needed
    if (onboardingStep !== "done") {
        return (
            <AnimatePresence mode="wait">
                {onboardingStep === "welcome" && (
                    <WelcomePage key="welcome" onNext={handleWelcomeNext} />
                )}
                {onboardingStep === "setup" && (
                    <SetupPage
                        key="setup"
                        appSettings={appSettings}
                        onSaveSettings={handleAppSettingsChange}
                        onComplete={handleSetupComplete}
                    />
                )}
            </AnimatePresence>
        );
    }

    // 3. Render Main App UI (Only when initial load AND onboarding are done)
    return (
        <div className="flex h-screen bg-neutral-950 text-neutral-100">
            <Sidebar
                sessions={filteredSessions}
                activeSessionId={activeSessionId}
                onNewChat={handleNewChat}
                onSelectChat={handleSelectChat}
                onDeleteChat={handleDeleteChat}
                onRenameChat={handleRenameChat}
                onOpenSettings={() => setIsSettingsModalOpen(true)}
                searchTerm={sidebarSearchTerm}
                onSearchTermChange={setSidebarSearchTerm}
            />
            <main className="flex flex-1 flex-col overflow-hidden relative bg-neutral-900">
                {/* Chat Header */}
                {activeSession && (
                    <div className="flex-shrink-0 border-b border-neutral-800 px-4 py-2 flex items-center justify-between min-h-[49px] bg-neutral-900 group">
                        <h2
                            className="text-sm font-medium truncate pr-4"
                            title={activeSession.title}
                        >
                            {" "}
                            {activeSession.title}{" "}
                        </h2>
                        <button
                            onClick={() => setIsChatSettingsModalOpen(true)}
                            className="flex items-center space-x-1.5 text-xs text-neutral-400 hover:text-neutral-100 hover:bg-neutral-700/50 px-2 py-1 rounded-md transition-colors focus:outline-none focus:ring-1 focus:ring-neutral-600"
                            title={`Configure Chat (Model: ${effectiveModelInfo?.name || "Default"
                                })`}
                        >
                            {!isUsingDefaultSettings && (
                                <SlidersHorizontal size={14} className="text-sky-400" />
                            )}
                            <span>{effectiveModelInfo?.name || "Default Model"}</span>{" "}
                            <span className="text-neutral-600">
                                ({effectiveChatSettings.temperature.toFixed(1)})
                            </span>{" "}
                            <ChevronDown size={14} />
                        </button>
                    </div>
                )}
                {/* Messages Area */}
                <div
                    ref={chatContainerRef}
                    className="flex-1 overflow-y-auto p-4 pb-28 md:pb-32 md:px-6 custom-scrollbar"
                >
                    <div className="max-w-3xl mx-auto w-full">
                        {/* Messages OR Empty State */}
                        <AnimatePresence mode="wait">
                            {!activeSession ||
                                (activeSession.messages.length === 0 && !isLoading) ? (
                                <motion.div
                                    key="empty-state-main"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="h-full flex"
                                >
                                    {" "}
                                    <EmptyState onSendExamplePrompt={handleSendPrompt} />{" "}
                                </motion.div>
                            ) : (
                                <motion.div
                                    key={`session-${activeSessionId}`}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {activeSession?.messages.map((msg, index) => (
                                        <motion.div
                                            key={msg.id}
                                            layout
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.25, ease: "easeOut" }}
                                        >
                                            {" "}
                                            <ChatMessage
                                                message={msg}
                                                onDelete={handleDeleteMessage}
                                                onRegenerate={handleRegenerate}
                                                showRegenerate={
                                                    msg.role === "assistant" &&
                                                    !msg.isError &&
                                                    index === activeSession.messages.length - 1 &&
                                                    !isLoading
                                                }
                                                isEditing={editingMessageId === msg.id}
                                                onEdit={handleEditMessage}
                                                onSaveEdit={handleSaveEdit}
                                                onCancelEdit={handleCancelEdit}
                                            />{" "}
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
                {/* Input Area Wrapper */}
                <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-neutral-900 via-neutral-900/90 to-transparent pointer-events-none">
                    <div className="max-w-3xl mx-auto px-4 pb-4 md:pb-6 pt-2 pointer-events-auto">
                        {/* Stop Generating Button */}
                        {isLoading && (
                            <div className="flex justify-center mb-2">
                                {" "}
                                <button
                                    onClick={handleStopGenerating}
                                    className="flex items-center px-3 py-1.5 bg-neutral-700 border border-neutral-600 rounded-lg text-sm text-neutral-300 hover:bg-neutral-600 transition-colors shadow-sm"
                                    title="Stop generating response"
                                >
                                    {" "}
                                    <Square size={14} className="mr-1.5 fill-current" /> Stop
                                    Generating{" "}
                                </button>{" "}
                            </div>
                        )}
                        {/* Input Form */}
                        {!editingMessageId && (
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleSubmit();
                                }}
                                className={clsx(
                                    `group flex items-end space-x-2 p-1 pl-3 bg-neutral-800 border border-neutral-700 rounded-xl shadow-sm relative transition-shadow duration-200`,
                                    `focus-within:border-neutral-600 focus-within:shadow-md focus-within:bg-neutral-700/50`
                                )}
                            >
                                <button
                                    type="button"
                                    className="p-2 text-neutral-500 hover:text-neutral-300 transition-colors mb-1 self-end focus:outline-none focus:ring-1 focus:ring-sky-500 rounded-md"
                                    title="Attach file (coming soon)"
                                    onClick={() => toast("File attachment coming soon!")}
                                >
                                    {" "}
                                    <Paperclip size={18} />{" "}
                                </button>
                                <TextareaAutosize
                                    ref={textareaRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Message Chatalia..."
                                    disabled={isLoading}
                                    onKeyDown={(e) => {
                                        if (
                                            e.key === "Enter" &&
                                            !e.shiftKey &&
                                            appSettings.sendWithEnter &&
                                            !isLoading &&
                                            input.trim()
                                        ) {
                                            e.preventDefault();
                                            handleSubmit();
                                        }
                                    }}
                                    className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 resize-none text-neutral-100 placeholder-neutral-400 text-sm max-h-48 custom-scrollbar py-2.5 pr-10"
                                    minRows={1}
                                    maxRows={6}
                                />
                                <button
                                    type="submit"
                                    disabled={isLoading || !input.trim()}
                                    aria-label="Send message"
                                    title="Send message"
                                    className={`absolute right-3 bottom-3 p-1.5 rounded-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-sky-500 focus:ring-offset-neutral-800 ${input.trim() && !isLoading
                                        ? "bg-white text-black hover:bg-neutral-200 scale-100"
                                        : "bg-neutral-600 text-neutral-400 cursor-not-allowed scale-95"
                                        }`}
                                >
                                    {" "}
                                    <ArrowUp className="h-5 w-5" />{" "}
                                </button>
                            </form>
                        )}
                        {/* Disclaimer */}
                        <p className="text-center text-xs text-neutral-500 mt-2 px-2 select-none">
                            {" "}
                            AI results may be inaccurate.{" "}
                        </p>
                    </div>
                </div>
            </main>

            {/* Modals */}
            <SettingsModal
                isOpen={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
                appSettings={appSettings}
                onAppSettingsChange={handleAppSettingsChange}
            />
            <ChatSettingsModal
                isOpen={isChatSettingsModalOpen}
                onClose={() => setIsChatSettingsModalOpen(false)}
                chatId={activeSessionId}
                currentSettings={effectiveChatSettings}
                isUsingDefaultSettings={isUsingDefaultSettings}
                onSave={handleSaveChatSettings}
                onResetToDefaults={handleResetChatSettings}
            />
            <ConfirmModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)} // Simple close action
                onConfirm={confirmModalProps?.onConfirm ?? (() => { })} // Execute stored action
                title={confirmModalProps?.title as string}
                message={confirmModalProps?.message ?? ""}
                confirmText={confirmModalProps?.confirmText}
                cancelText={confirmModalProps?.cancelText}
                confirmVariant={confirmModalProps?.confirmVariant}
            />
        </div>
    );
}

export default App;
