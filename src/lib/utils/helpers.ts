import type { PgSelectBase } from 'drizzle-orm/pg-core';

export function getPlainSQL(
	sql: PgSelectBase<never, never, never, never, never, never, never, never>
) {
	// Replace each $n placeholder with the corresponding param value
	const { sql: sqlString, params } = sql.toSQL();
	let result = sqlString;
	params.forEach((param, index) => {
		// Handle string params by adding quotes
		const paramValue = (typeof param === 'string' ? `'${param}'` : param) as unknown as string;
		result = result.replace(`$${index + 1}`, paramValue);
	});

	return result;
}
