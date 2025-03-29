// src/components/WelcomePage.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import logo from "../assets/logo.png"; 

interface WelcomePageProps {
  onNext: () => void; // Function to proceed to the setup page
}

const WelcomePage: React.FC<WelcomePageProps> = ({ onNext }) => {
  // Container animation: fades in, staggers children
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delay: 0.2, // Slight delay before starting
        staggerChildren: 0.25, // Delay between each child animating in
      },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.3, ease: "easeIn" } // Fade out on exit
    },
  };

  // Item animation: fades in and slides up slightly
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.1, 0.7, 0.3, 1] } // Custom ease
    },
  };

  // Logo specific animation: subtle pulse + initial scale-in
   const logoVariants = {
    hidden: { opacity: 0, scale: 0.5 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        damping: 15,
        stiffness: 100,
        delay: 0.4, // Delay logo slightly more
      },
    },
  };


  return (
    <motion.div
      key="welcome" // Key for AnimatePresence
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      // Use a richer background, maybe radial gradient?
      className="flex flex-col items-center justify-center h-full text-center p-8 bg-neutral-950 text-neutral-100 overflow-hidden relative"
    >
         <motion.div className="absolute inset-0 z-0 opacity-10">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-sky-800 rounded-full filter blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-purple-800 rounded-full filter blur-3xl animation-delay-2000 animate-pulse"></div>
        </motion.div> 

        {/* Content Container */}
        <div className="relative z-10 flex flex-col items-center">
            {/* Logo */}
            <motion.div
                variants={logoVariants}
                // Subtle continuous pulse animation
                animate={{
                   scale: [1, 1.04, 1],
                   transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                }}
            >
                <img
                    src={logo}
                    alt="Chatalia Logo"
                    className="w-32 h-32 sm:w-40 sm:h-40 mb-8 drop-shadow-[0_5px_15px_rgba(0,0,0,0.4)]"
                />
            </motion.div>

            {/* Heading */}
            <motion.h1
                variants={itemVariants}
                className="text-4xl sm:text-5xl font-bold mb-3 bg-gradient-to-r from-purple-400 via-pink-400 to-sky-400 text-transparent bg-clip-text"
            >
                Welcome to Chatalia
            </motion.h1>

            {/* Tagline */}
            <motion.p variants={itemVariants} className="text-base sm:text-lg text-neutral-300 mb-12 max-w-md">
                Your intelligent chat assistant. Ready to explore? Let's get your preferences set up quickly.
            </motion.p>

            {/* Button */}
            <motion.button
                variants={itemVariants}
                onClick={onNext}
                whileHover={{ scale: 1.03, y: -2, boxShadow: '0px 10px 20px rgba(56, 189, 248, 0.2)' }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center space-x-2 px-7 py-3 bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-lg text-base font-semibold hover:from-sky-600 hover:to-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-neutral-950 transition-all duration-150 shadow-lg"
            >
                <span>Get Started</span>
                <ArrowRight size={20} />
            </motion.button>
        </div>
    </motion.div>
  );
};

export default WelcomePage;