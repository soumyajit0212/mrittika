import { defineEventHandler, getHeader, createError, sendError } from 'h3';
import { execa } from 'execa';

export default defineEventHandler(async (event) => {
  try {
    const token = getHeader(event, 'x-migrate-token');
    if (!token || token !== process.env.MIGRATE_TOKEN) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
    }

    const { stdout } = await execa('npx', ['prisma', 'migrate', 'deploy'], {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL! },
    });

    return { ok: true, output: stdout };
  } catch (err: any) {
    // Ensure JSON error instead of HTML/text
    const statusCode = err?.statusCode || 500;
    const statusMessage = err?.statusMessage || 'Migration failed';
    // Option A: return JSON with status
    event.node.res.statusCode = statusCode;
    return { ok: false, error: statusMessage, detail: String(err?.stderr || err?.message || err) };
    // Option B: if you prefer h3 errors:
    // return sendError(event, createError({ statusCode, statusMessage }));
  }
});
