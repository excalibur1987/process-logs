import { db } from '$lib/db';
import { functionLogs, functionProgress } from '$lib/db/schema';
import { getFunctionInstanceById, getFunctionInstanceBySlug } from '$lib/db/utils';
import { and, asc, eq, gte, inArray, like, lte } from 'drizzle-orm';

export async function GET({ params, url }) {
	let func;

	if (parseInt(params.funcId).toString().length !== params.funcId.length) {
		func = await getFunctionInstanceBySlug(params.funcId);
	} else {
		func = await getFunctionInstanceById(parseInt(params.funcId));
	}

	if (!func) {
		return new Response('Function not found', { status: 404 });
	}

	const format = url.searchParams.get('format') || 'json';
	const search = url.searchParams.get('search');
	const startTime = url.searchParams.get('startTime');
	const endTime = url.searchParams.get('endTime');
	const types = url.searchParams.get('types');

	try {
		// Get all child functions recursively
		const getAllChildFuncIds = async (parentId: number): Promise<number[]> => {
			const children = await db
				.select({
					funcId: functionProgress.funcId
				})
				.from(functionProgress)
				.where(eq(functionProgress.parentId, parentId));

			const childIds = children.map((c) => c.funcId);
			const grandChildIds = await Promise.all(childIds.map(getAllChildFuncIds));
			return [parentId, ...childIds, ...grandChildIds.flat()];
		};

		const allFuncIds = await getAllChildFuncIds(func.funcId);

		// Build filters
		const filters = [inArray(functionLogs.funcId, allFuncIds)];

		if (search) {
			filters.push(like(functionLogs.message, `%${search}%`));
		}

		if (startTime) {
			filters.push(gte(functionLogs.rowDate, startTime));
		}

		if (endTime) {
			filters.push(lte(functionLogs.rowDate, endTime));
		}

		if (types) {
			const typeList = types.split(',');
			filters.push(inArray(functionLogs.type, typeList));
		}

		// Get logs
		const logs = await db
			.select({
				id: functionLogs.id,
				rowDate: functionLogs.rowDate,
				funcId: functionLogs.funcId,
				type: functionLogs.type,
				message: functionLogs.message,
				traceBack: functionLogs.traceBack
			})
			.from(functionLogs)
			.where(and(...filters))
			.orderBy(asc(functionLogs.rowDate));

		// Format data based on requested format
		let content: string;
		let contentType: string;
		let filename: string;

		switch (format) {
			case 'csv':
				content = generateCSV(logs, func);
				contentType = 'text/csv';
				filename = `logs-${func.funcName}-${new Date().toISOString().split('T')[0]}.csv`;
				break;
			case 'txt':
				content = generateTXT(logs, func);
				contentType = 'text/plain';
				filename = `logs-${func.funcName}-${new Date().toISOString().split('T')[0]}.txt`;
				break;
			case 'json':
			default:
				content = JSON.stringify(
					{
						function: {
							funcId: func.funcId,
							funcName: func.funcName,
							headerSlug: func.headerSlug,
							startDate: func.startDate,
							endDate: func.endDate,
							finished: func.finished,
							success: func.success
						},
						logs,
						exportedAt: new Date().toISOString(),
						filters: {
							search,
							startTime,
							endTime,
							types
						}
					},
					null,
					2
				);
				contentType = 'application/json';
				filename = `logs-${func.funcName}-${new Date().toISOString().split('T')[0]}.json`;
				break;
		}

		return new Response(content, {
			headers: {
				'Content-Type': contentType,
				'Content-Disposition': `attachment; filename="${filename}"`
			}
		});
	} catch (error) {
		console.error('Error exporting logs:', error);
		return new Response('Internal server error', { status: 500 });
	}
}

function generateCSV(logs: any[], func: any): string {
	const headers = ['Timestamp', 'Type', 'Message', 'Traceback'];
	const rows = logs.map((log) => [
		log.rowDate,
		log.type,
		`"${log.message.replace(/"/g, '""')}"`,
		log.traceBack ? `"${log.traceBack.replace(/"/g, '""')}"` : ''
	]);

	const csvContent = [
		`# Function: ${func.funcName}`,
		`# Function ID: ${func.funcId}`,
		`# Exported: ${new Date().toISOString()}`,
		'',
		headers.join(','),
		...rows.map((row) => row.join(','))
	].join('\n');

	return csvContent;
}

function generateTXT(logs: any[], func: any): string {
	const txtContent = [
		`Function Logs Export`,
		`==================`,
		`Function: ${func.funcName}`,
		`Function ID: ${func.funcId}`,
		`Exported: ${new Date().toISOString()}`,
		`Total Logs: ${logs.length}`,
		'',
		'Logs:',
		'-----',
		'',
		...logs.map((log) =>
			[
				`[${log.rowDate}] ${log.type}`,
				log.message,
				log.traceBack ? `Traceback:\n${log.traceBack}` : '',
				'---'
			]
				.filter(Boolean)
				.join('\n')
		)
	].join('\n');

	return txtContent;
}
