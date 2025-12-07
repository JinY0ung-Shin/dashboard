/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	extend: {
		fontFamily: {
			sans: ['Outfit', 'sans-serif']
		},
		colors: {
			slate: {
				850: '#151f32',
				950: '#020617'
			}
		},
		animation: {
			'fade-in': 'fadeIn 0.5s ease-out',
			'slide-up': 'slideUp 0.5s ease-out',
			'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite'
		},
		keyframes: {
			fadeIn: {
				'0%': { opacity: '0' },
				'100%': { opacity: '1' }
			},
			slideUp: {
				'0%': { transform: 'translateY(20px)', opacity: '0' },
				'100%': { transform: 'translateY(0)', opacity: '1' }
			}
		}
	},
	plugins: []
};
