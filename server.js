import { existsSync, rmSync } from 'fs';
import { handler } from './build/handler.js';

import path from 'path';

import express from 'express';

import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(handler);

const serverBinding = process.env?.['SERVER_BINDING'];

if (isNaN(parseInt(serverBinding))) {
	if (serverBinding !== path.basename(serverBinding)) {
		throw new Error('Server binding is missing or invalid!');
	}
	if (existsSync(serverBinding.toString())) {
		rmSync(serverBinding.toString());
	}
}

app.listen(serverBinding, () => {
	console.log(`listening on ${serverBinding}`);
});
