/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./{App,index}.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    // Add other paths if you have components/hooks/etc. in other directories like 'pages', 'layouts', etc.
    // "./src/**/*.{js,ts,jsx,tsx}", // If using a 'src' directory
  ],
  theme: {
    extend: {
      // You can extend the default Tailwind theme here if needed
      // For example, if your <style> block in index.html had custom colors, fonts, etc.
      // that you want to integrate into Tailwind's system.
      colors: {
        // Example: Replicating some of the body/panel colors from index.html if needed as Tailwind classes
        'axiom-canvas': '#24272E',
        'axiom-typo-default': 'rgba(255, 255, 255, 0.87)',
        'axiom-panel-base': '#2D3039',
        'axiom-primary-action-start': '#a855f7',
        'axiom-primary-action-end': '#7e22ce',
        'axiom-turquoise-action-start': '#2dd4bf',
        'axiom-turquoise-action-end': '#06b6d4',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Ensuring Inter is the default sans-serif
      },
      boxShadow: {
        // Example: Replicating neumorphic-panel shadow if needed
        'axiom-panel': '0px 8px 24px rgba(68, 138, 255, 0.1)',
        'axiom-button-convex-light': '0 -1px 2px rgba(57, 60, 73, 0.5)', // Lighter highlight from top #393c49
        'axiom-button-convex-dark': '0 2px 3px rgba(33, 36, 41, 0.6)',  // Darker shadow at bottom #212429
        'axiom-button-concave-dark': 'inset 0 2px 3px rgba(33, 36, 41, 0.7)', // Darker inner shadow top
        'axiom-button-concave-light': 'inset 0 -1px 2px rgba(57, 60, 73, 0.5)', // Lighter inner highlight bottom
      },
      gradientColorStops: { // For primary-action-button if using Tailwind gradients
        'primary-action-from': '#a855f7',
        'primary-action-to': '#7e22ce',
        'turquoise-action-from': '#2dd4bf',
        'turquoise-action-to': '#06b6d4',
      }
    },
  },
  plugins: [
    // Add any Tailwind plugins here
  ],
}
