import { z } from 'zod';

/**
 * Enhanced error handler for Zod validation that includes function name and error path
 * @param error The Zod error object
 * @param functionName The name of the function where the error occurred
 * @returns A formatted error message with function name and path details
 */
export function handleZodError(error: z.ZodError, functionName: string): string {
	const errorDetails = error.errors
		.map((err) => {
			const path = err.path.join('.');
			return `[${path}]: ${err.message}`;
		})
		.join('\n');

	return `Validation error in ${functionName}:\n${errorDetails}`;
}

/**
 * Type-safe wrapper for Zod schema parsing with enhanced error handling
 * @param schema The Zod schema to validate against
 * @param data The data to validate
 * @param functionName The name of the function where validation is occurring
 * @returns The parsed data or throws an error with enhanced details
 */
export function validateWithContext<T>(
	schema: z.ZodSchema<T>,
	data: unknown,
	functionName: string
): T {
	try {
		// Handle JSON string parsing
		const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
		return schema.parse(parsedData);
	} catch (error) {
		if (error instanceof z.ZodError) {
			throw new Error(handleZodError(error, functionName));
		}
		if (error instanceof SyntaxError) {
			throw new Error(`JSON parsing error in ${functionName}: ${error.message}`);
		}
		throw error;
	}
}
