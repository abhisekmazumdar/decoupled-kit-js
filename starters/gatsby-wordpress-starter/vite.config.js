import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig(() => {
	return {
		test: {
			globals: true,
			environment: 'jsdom',
			coverage: {
				reportsDirectory: `./coverage`,
			},
		},
		plugins: [react()],
		define: {
			'process.env.backendUrl': JSON.stringify(
				'https://my-wordpress-site.pantheon.io/wp/graphql',
			),
		},
	}
})
