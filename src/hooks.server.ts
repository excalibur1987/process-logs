import type { Handle } from '@sveltejs/kit';
import { format } from 'date-fns';

export const handle: Handle = async ({ event, resolve }) => {
	const startTime = new Date();
	const requestClone = event.request.clone();
	const response = await resolve(event);

	// Log request information
	const getStatusColor = (status: number): string => {
		if (status >= 200 && status < 300) return '\x1b[32m'; // Green
		if (status >= 300 && status < 400) return '\x1b[33m'; // Yellow
		if (status >= 400) return '\x1b[31m'; // Red
		return '\x1b[0m'; // Reset
	};

	if (event.url.pathname.includes('/api/functions/')) {
		const timestamp = format(
			new Date(startTime.getTime() + 3 * 60 * 60 * 1000),
			'yyyy-MM-dd HH:mm:ss'
		);

		console.log(
			`📝 ${getStatusColor(response.status)}${timestamp} ${event.request.method} ` +
				`${event.url.pathname}${event.url.search} ➜ ${response.status}\x1b[0m`
		);

		if (response.status >= 400) {
			try {
				const requestBody = await requestClone.json();
				console.log(`🔍 Request Body:\n\x1b[33m${JSON.stringify(requestBody, null, 2)}\x1b[0m`);

				// Get response body for error details
				const responseClone = response.clone();
				const responseBody = await responseClone.json();
				if (responseBody.error) {
					console.log(`❌ Error Details:\n\x1b[31m${responseBody.error}\x1b[0m`);

					// Get the source file path from the URL
					const sourcePath = event.url.pathname
						.replace('/api/', 'src/routes/api/')
						.replace(/\/$/, '/+server.ts');

					console.log(`📁 Source File: \x1b[36m${sourcePath}\x1b[0m`);
				}
			} catch (e) {
				const error = e as Error;
				console.log(`❌ Error parsing request/response: ${error.message}`);
			}
		}
	}

	// Check if the request is for the embed route
	if (event.url.pathname.includes('/functions/') && event.url.pathname.includes('/logs/embed')) {
		// Add CORS headers for embed routes
		response.headers.set('Access-Control-Allow-Origin', '*');
		response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
		response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
		response.headers.set('X-Frame-Options', 'ALLOWALL');
	}

	return response;
};
