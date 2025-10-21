import dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';

dotenv.config();

if (!process.env.VITE_DB_NAME) throw new Error('DATABASE Connection is not set');

export default defineConfig({
	dialect: 'postgresql',
	schema: './src/lib/db/schema.ts',

	dbCredentials: {
		database: process.env.VITE_DB_NAME || '',
		host: process.env.VITE_DB_HOST || '',
		password: process.env.VITE_DB_PASSWORD || '',
		port: parseInt(process.env.VITE_DB_PORT || '5432'),
		user: process.env.VITE_DB_USER || '',
		ssl: false
	}
});
