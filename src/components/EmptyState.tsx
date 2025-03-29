// src/components/EmptyState.tsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // Import motion and AnimatePresence
import { Sparkles, ArrowRight } from 'lucide-react'; // Using Sparkles again for a generative feel
import { twMerge } from 'tailwind-merge';

interface EmptyStateProps {
    onSendExamplePrompt: (prompt: string) => void;
}

const ExamplePromptButton: React.FC<{ text: string; onClick: (text: string) => void; variants: any; }> = ({ text, onClick, variants }) => (
    <motion.button
        variants={variants} // Apply animation variants
        onClick={() => onClick(text)}
        whileHover={{ scale: 1.03, transition: { type: 'spring', stiffness: 300 } }}
        className={twMerge(
            "w-full p-3.5 bg-neutral-800/50 border border-neutral-700/60 rounded-lg text-left text-sm text-neutral-300 hover:border-neutral-600/80 hover:bg-neutral-700/40 transition-colors focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500",
            "motion-reduce:transition-none motion-reduce:transform-none"
        )}
        title={`Send message: "${text}"`}
    >
        {text}
    </motion.button>
);

const EmptyState: React.FC<EmptyStateProps> = ({ onSendExamplePrompt }) => {
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.1 } },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 13 } }
    };

    const iconVariants = {
        hidden: { opacity: 0, scale: 0.5 },
        visible: { opacity: 1, scale: 1, transition: { type: "spring", damping: 15, stiffness: 100, delay: 0.2 } }
    };

    const examplePrompts = [
        "Explain quantum computing in simple terms",
        "Got any creative ideas for a 10 year old’s birthday?",
        "Write a Python script to list files in a directory",
        "Compare React and Vue frameworks",
    ];

  return (
    // Use same overall structure and background
    <motion.div
        key="empty-state" // Add key if using AnimatePresence in parent
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        // Use gradient, center content
        className="flex flex-col items-center justify-center h-full text-center p-4 sm:p-8  text-neutral-100 overflow-hidden"
    >
        {/* Central Content Block */}
        <div className="w-full max-w-xl flex flex-col items-center"> {/* Slightly wider max-width */}

            {/* Icon/Graphic */}
            <motion.div variants={iconVariants} className="mb-6">
                 <Sparkles size={56} className="text-sky-400 drop-shadow-[0_0_10px_rgba(56,189,248,0.4)]" />
            </motion.div>

            {/* Heading */}
            <motion.h1 variants={itemVariants} className="text-3xl sm:text-4xl font-bold mb-3 bg-gradient-to-r from-purple-400 via-pink-400 to-sky-400 text-transparent bg-clip-text">
                How can I help today?
            </motion.h1>

            {/* Tagline */}
            <motion.p variants={itemVariants} className="text-base text-neutral-300 mb-10 max-w-md">
                Start a new chat or select one of the examples below to get going.
            </motion.p>

            {/* Example Prompts Grid */}
            <motion.div
                variants={itemVariants} // Animate the grid container itself
                className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10"
            >
                {examplePrompts.map((prompt, index) => (
                    <ExamplePromptButton
                        key={index}
                        text={prompt}
                        onClick={onSendExamplePrompt }
                        variants={itemVariants} 
                    />
                ))}
            </motion.div>
        </div>
    </motion.div>
  );
};

export default EmptyState;