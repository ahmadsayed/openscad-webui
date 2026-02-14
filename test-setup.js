import app from './server/app.js';
import apiRoutes from './server/routes/api.js';
import pageRoutes from './server/routes/pages.js';
import seoRoutes from './server/routes/seo.js';
import { promises as fs } from 'fs';
import path from 'path';

const REQUEST_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), 'requests');

// Mount routes
app.use('/', pageRoutes);
app.use('/', apiRoutes);
app.use('/', seoRoutes);

let server;

beforeAll(async () => {
    // Start server for UI tests on a different port to avoid conflicts
    server = app.listen(3001, () => {
        console.log('Test server running on port 3001');
    });

    // Give server time to start
    await new Promise(resolve => setTimeout(resolve, 1000));
});

afterAll(async () => {
    // Close server after tests
    if (server) {
        await new Promise(resolve => server.close(resolve));
        console.log('Test server closed (this is expected)');
    }

    // Clean up request files created during tests
    const REQUEST_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), 'requests');

    try {
        const files = await fs.readdir(REQUEST_DIR);

        // Delete all request files that start with UUID pattern
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.json$/i;
        const deletePromises = files
            .filter(file => uuidPattern.test(file))
            .map(file => fs.unlink(path.join(REQUEST_DIR, file)).catch(() => {}));

        await Promise.all(deletePromises);
        console.log(`Cleaned up ${deletePromises.length} request files`);
    } catch (error) {
        // Ignore errors during cleanup
    }
});

export default {};