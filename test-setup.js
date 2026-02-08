import { app } from './index.js';

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
        console.log('Test server closed');
    }
});

export default {};