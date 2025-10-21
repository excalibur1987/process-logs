## Process Logs: Database Schema and API Reference

### Overview

- **Stack**: SvelteKit API routes (`src/routes/api/**`), Drizzle ORM (PostgreSQL)
- **Database connection**: configured via `VITE_DB_*` env vars in `src/lib/db/index.ts`

## Database Schema

### `function_headers`

- **id**: serial, primary key, not null
- **func_name**: varchar(200), not null
- **func_slug**: text, not null

Relations:

- `function_progress.func_header_id` → `function_headers.id`

### `function_progress`

- **func_id**: serial, primary key, not null
- **parent_id**: integer, nullable (self-referencing → `function_progress.func_id`)
- **slug**: varchar(200), nullable
- **start_date**: timestamp with time zone (string mode), not null
- **end_date**: timestamp with time zone (string mode), nullable
- **finished**: boolean, not null
- **success**: boolean, not null
- **source**: varchar(20), not null, default ''
- **args**: json, nullable
- **func_header_id**: integer, not null (FK → `function_headers.id`)

Relations:

- `parent_id` → `function_progress.func_id` (self-relation)
- `func_header_id` → `function_headers.id`
- One-to-many with `function_logs`

### `function_logs`

- **id**: serial, primary key, not null
- **row_date**: timestamp with time zone (string mode), not null
- **func_id**: integer, not null (FK → `function_progress.func_id`)
- **type**: varchar(10), not null
- **message**: text, not null
- **trace_back**: text, nullable

Relations:

- Many-to-one with `function_progress` via `func_id`

### `function_progress_tracking`

- **id**: serial, primary key, not null
- **func_id**: integer, not null (FK → `function_progress.func_id`)
- **prog_id**: varchar(100), not null
- **title**: varchar(200), not null
- **description**: text, not null
- **current_value**: numeric, not null
- **max_value**: numeric, nullable
- **duration**: numeric, nullable
- **last_updated**: timestamp with time zone (string mode), not null
- **completed**: boolean, not null, default false

Relations:

- Many-to-one with `function_progress` via `func_id`

## API Endpoints

Notes:

- All endpoints are under `/api/functions/...`.
- Path parameters are denoted in brackets.
- Unless specified otherwise, timestamps are ISO 8601 strings.

### GET `/api/functions`

List function runs with pagination and summary.

Query params:

- **funcName**: string (ilike filter against `function_headers.func_name`)
- **slug**: string (ilike filter against `function_progress.slug`)
- **startDate**: date/time string (inclusive)
- **endDate**: date/time string (inclusive)
- **isParent**: truthy value to filter only parent runs (`parent_id` is null)
- **page**: number, default 1
- **limit**: number, default 10

Response:

```json
{
  "summary": {
    "total": number,
    "running": number,
    "succeeded": number,
    "failed": number
  },
  "results": [
    {
      "funcId": number,
      "parentId": number | null,
      "slug": string | null,
      "startDate": string,
      "endDate": string | null,
      "finished": boolean,
      "success": boolean,
      "source": string,
      "args": any,
      "funcHeaderId": number,
      "funcName": string,
      "funcSlug": string
    }
  ],
  "pagination": { "page": number, "limit": number, "totalPages": number, "totalCount": number }
}
```

### POST `/api/functions`

Create a new function run and optionally attach initial logs.

Request body:

```json
{
	"funcName": "string", // matches function_headers.func_slug
	"parentId": 123, // optional linkage to parent run
	"slug": "string", // run slug
	"args": {}, // arbitrary JSON
	"source": "string",
	"logs": [{ "type": "string", "message": "string", "traceBack": "string|null" }]
}
```

Response:

```json
{ "funcId": number }
```

Errors: 400 `{ error: string }`

### GET `/api/functions/names`

Paginated list of function headers.

Query params:

- **search**: string (ilike against `func_name`)
- **page**: number, default 1
- **limit**: number, default 10

Response:

```json
{
  "functions": [ { "id": number, "funcName": "string", "funcSlug": "string" } ],
  "pagination": { "page": number, "limit": number, "totalPages": number, "totalCount": number }
}
```

### POST `/api/functions/[funcName]/init-function`

Initialize (insert) a function header if missing and create a new run.

Path params:

- **funcName**: string (slug in URL; header name is derived via sentence-case; slug stored via `slugify`)

Request body:

```json
{
  "funcSlug": "string",
  "parentId": "123" | "" | null,  // numeric ID or a slug string; optional
  "args": {},                        // arbitrary JSON
  "source": "string"
}
```

Response:

```json
{ "funcId": number }
```

Errors: 400 `{ error: string }`

### GET `/api/functions/[funcName]/[funcId]`

Get a run by numeric ID or slug and return its logs (optionally since a timestamp).

Path params:

- **funcName**: string (not used for lookup; contextual)
- **funcId**: string (numeric ID or slug)

Query params:

- **lastLogDate**: ISO datetime string; if provided, only logs after this date are returned

Response:

```json
{
  "function": { /* FunctionInstance */ },
  "logs": [
    { "id": number, "funcId": number, "type": "string", "message": "string", "traceBack": "string|null", "rowDate": "string" }
  ]
}
```

Errors: 404 text, 500 `{ error: string }`

### PATCH `/api/functions/[funcName]/[funcId]`

Update run status.

Request body:

```json
{ "finished": true, "success": true, "endDate": "2024-01-01T00:00:00Z" }
```

Response: the updated `function_progress` row.

Errors: 400 `{ error: string }`

### POST `/api/functions/[funcName]/[funcId]`

Append a log entry to a run (ID or slug).

Request body:

```json
{
	"type": "string", // e.g. "info" | "error" | "progress"
	"message": "string | object", // objects are stringified; for type === "progress" body is normalized to JSON string
	"traceBack": "string|null",
	"rowDate": "2024-01-01T00:00:00Z" // optional; defaults to now
}
```

Response: inserted log row.

Errors: 400 `{ error: string }`

### POST `/api/functions/[funcName]/[funcId]/set-finished`

Mark a run as finished. If the run has children, success is set to true only if all children are finished and successful.

Request body:

```json
{ "success": true }
```

Response:

```json
{
  "success": boolean,                  // final status after children check
  "message": "string",
  "childrenStatus": {
    "total": number,
    "successful": number,
    "failed": number,
    "running": number
  } | null
}
```

Errors: 400 `{ error: string }`, 404 text

### GET `/api/functions/[funcName]/[funcId]/logs`

Get logs for a single run (ID or slug).

Query params:

- **lastLogDate**: ISO datetime string; if provided, only logs after this date are returned

Response:

```json
{
  "function": { /* FunctionInstance */ },
  "logs": [
    {
      "id": number,
      "funcId": number,
      "type": "string",
      "message": "string",
      "traceBack": "string|null",
      "rowDate": "string",
      "function": { "funcId": number, "funcName": "string", "funcSlug": "string", "parentId": number | null }
    }
  ]
}
```

Errors: 500 `{ error: string }`, 404 `{ error: string }`

### GET `/api/functions/[funcId]/logs`

Get logs for a run and all of its descendants (recursive).

Response: array of enhanced logs where each log includes `function` info for the originating run.

```json
[
  {
    "id": number,
    "rowDate": "string",
    "funcId": number,
    "type": "string",
    "message": "string",
    "traceBack": "string|null",
    "function": { "funcId": number, "funcName": "string", "funcSlug": "string", "parentId": number | null }
  }
]
```

Errors: 500 text

### GET `/api/functions/[funcId]/logs/progress`

Get progress tracking records for a run (ID or slug).

Query params:

- **progressId**: string; optional filter by `prog_id`

Response:

```json
{
  "success": true,
  "progress": [
    {
      "id": number,
      "funcId": number,
      "progId": "string",
      "title": "string",
      "description": "string",
      "currentValue": number,
      "maxValue": number | null,
      "duration": number | null,
      "lastUpdated": "string",
      "completed": boolean,
      "percentage": number
    }
  ]
}
```

Errors: 500 text

## Implementation Notes

- Request validation is centralized via `validateWithContext` and Zod schemas in each handler.
- Many endpoints accept either a numeric `funcId` or a slug; the handlers detect type and route accordingly.
- For performance-sensitive listings, pagination is implemented via `limit` and `offset`.
- Log entries of type `progress` normalize `message` to a JSON string.
