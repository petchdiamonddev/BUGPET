/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        fb: {
          blue: '#3b5998',
          darkBlue: '#2d4373',
          lightBlue: '#6d84b4',
          bg: '#eceff5',
          card: '#ffffff',
          border: '#d8dfea',
          hover: '#eceff5',
          text: '#1c1e21',
          subtext: '#65676b',
          link: '#385898',
          yellow: '#fff9d7',
          yellowBorder: '#e2c822',
          green: '#42b72a',
        },
      },
      fontFamily: {
        classic: ['"Lucida Grande"', 'Tahoma', 'Verdana', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
