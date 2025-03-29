// src/components/ThemeSwitcher.tsx
// Basic styling refactor. Actual theme logic needs context/state management.
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Sun, Moon } from 'lucide-react'; // Use Lucide Icons

export default function ThemeSwitcher() {
  // This state is LOCAL and won't actually change the theme application-wide yet.
  const [isDark, setIsDark] = useState(true);

  // This onClick needs to trigger a global theme change (e.g., adding/removing 'dark' class on <html>)
  const toggleTheme = () => {
      setIsDark(!isDark);
      // TODO: Implement actual theme switching logic here
      // document.documentElement.classList.toggle('dark');
  };

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={toggleTheme}
      // Consistent dark theme button styling
      className="p-2 rounded-lg bg-neutral-700/50 text-neutral-400 hover:bg-neutral-600/70 hover:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:ring-offset-2 focus:ring-offset-neutral-800 transition-colors"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? (
        <Sun size={18} className="text-yellow-400" />
      ) : (
        <Moon size={18} className="text-sky-400" />
      )}
    </motion.button>
  );
}