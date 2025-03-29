// tailwind.config.js
const colors = require('tailwindcss/colors');

export default {
   content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
   ],
   darkMode: 'class', // or 'media' if you prefer
   theme: {
      extend: {
         fontFamily: {
            sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', '"Noto Sans"', 'sans-serif', '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"', '"Noto Color Emoji"'],
         }
      },
   },
   plugins: [
      require('@tailwindcss/typography'),
      require('@tailwindcss/forms'), // Recommended for better form styling
   ],
};