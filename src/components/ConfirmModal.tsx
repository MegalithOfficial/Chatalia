import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
   isOpen: boolean;
   onClose: () => void;
   onConfirm: () => void;
   title: string;
   message: string;
   confirmText?: string;
   cancelText?: string;
   confirmVariant?: "primary" | "danger";
};

const ConfirmModal: React.FC<ConfirmModalProps> = ({
   isOpen,
   onClose,
   onConfirm,
   title,
   message,
   confirmText = "Confirm",
   cancelText = "Cancel",
   confirmVariant = "primary",
}) => {

   const handleConfirmClick = () => {
      onConfirm();
      onClose();
   };

   const handleCancelClick = () => {
      onClose();
   }

   const confirmButtonStyles = {
      primary: "bg-sky-600 hover:bg-sky-700 focus:ring-sky-500 text-white",
      danger: "bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white",
   };

   return (
      <AnimatePresence>
         {isOpen && (
            <motion.div
               key="confirm-backdrop"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               transition={{ duration: 0.2 }}
               className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
               onClick={onClose}
            >
               <motion.div
                  key="confirm-modal"
                  initial={{ scale: 0.8, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.8, opacity: 0, y: 5 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="relative w-full max-w-md bg-neutral-800 rounded-lg shadow-xl overflow-hidden border border-neutral-700"
                  onClick={(e) => e.stopPropagation()}
               >
                  <div className="p-6 text-center">
                     <div className={clsx("mx-auto flex h-12 w-12 items-center justify-center rounded-full", confirmVariant === "danger" ? 'bg-red-900/50' : 'bg-sky-900/50')}>
                        <AlertTriangle className={clsx("h-6 w-6", confirmVariant === 'danger' ? 'text-red-400' : 'text-sky-400')} aria-hidden="true" />
                     </div>
                     <div className="mt-3 text-center sm:mt-5">
                        <h3 className="text-base font-semibold leading-6 text-neutral-100" id="modal-title">
                           {title}
                        </h3>
                        <div className="mt-2">
                           <p className="text-sm text-neutral-400">
                              {message}
                           </p>
                        </div>
                     </div>
                  </div>

                  <div className="flex flex-col sm:flex-row-reverse gap-2 px-4 py-3 sm:px-6 bg-neutral-800/80 border-t border-neutral-700/60">
                     <button
                        type="button"
                        className={clsx(
                           "inline-flex w-full justify-center rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors sm:w-auto focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-800",
                           confirmButtonStyles[confirmVariant]
                        )}
                        onClick={handleConfirmClick}
                     >
                        {confirmText}
                     </button>
                     <button
                        type="button"
                        className="inline-flex w-full justify-center rounded-md bg-neutral-700 px-4 py-2 text-sm font-medium text-neutral-200 shadow-sm hover:bg-neutral-600 transition-colors sm:mt-0 sm:w-auto focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 focus:ring-offset-neutral-800"
                        onClick={onClose}
                     >
                        {cancelText}
                     </button>
                  </div>
               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>
   )
};

export default ConfirmModal;