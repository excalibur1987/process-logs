import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const startTime = new Date();
	const response = await resolve(event);

	// Log request information
	console.log({
		timestamp: startTime.toISOString(),
		url: event.url.pathname + event.url.search,
		status: response.status
	});

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
