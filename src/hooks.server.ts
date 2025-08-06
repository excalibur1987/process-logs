import type { Handle } from '@sveltejs/kit';
import { format } from 'date-fns';

export const handle: Handle = async ({ event, resolve }) => {
	const startTime = new Date();
	const response = await resolve(event);

	// Log request information
	const getStatusColor = (status: number): string => {
		if (status >= 200 && status < 300) return '\x1b[32m'; // Green
		if (status >= 300 && status < 400) return '\x1b[33m'; // Yellow
		if (status >= 400) return '\x1b[31m'; // Red
		return '\x1b[0m'; // Reset
	};

	const timestamp = format(
		new Date(startTime.getTime() + 3 * 60 * 60 * 1000),
		'yyyy-MM-dd HH:mm:ss'
	);

	console.log(
		`📝 ${getStatusColor(response.status)}${timestamp} ${event.request.method} ${event.url.pathname}${event.url.search} ➜ ${response.status}\x1b[0m`
	);

	if (response.status >= 400) {
		const requestBody = await event.request.json();
		console.log(`🔍 \x1b[33m${JSON.stringify(requestBody, null, 2)}\x1b[0m`);
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
