import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import { Toaster } from 'react-hot-toast';

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="bottom-center"
      reverseOrder={false}
      toastOptions={{
        className: '',
        duration: 3000,
        style: {
          background: '#262626', // neutral-800
          color: '#f5f5f5',      // neutral-100
          fontSize: '14px',
          border: '1px solid #404040' // neutral-700
        },
        success: { duration: 2000 },
        error: { duration: 4000 }
      }}
    />
  </React.StrictMode>,
);
