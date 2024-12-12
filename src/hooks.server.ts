import type { Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);

  // Check if the request is for the embed route
  if (
    event.url.pathname.includes("/functions/") &&
    event.url.pathname.includes("/logs/embed")
  ) {
    // Add CORS headers for embed routes
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");
    response.headers.set("X-Frame-Options", "ALLOWALL");
  }

  return response;
};
