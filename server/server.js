import app from './app.js';
import apiRoutes from './routes/api.js';
import pageRoutes from './routes/pages.js';
import seoRoutes from './routes/seo.js';

const PORT = process.env.PORT || 3000;

// Mount routes
app.use('/', pageRoutes);
app.use('/', apiRoutes);
app.use('/', seoRoutes);

// Start server
let server;

if (process.env.NODE_ENV !== 'test') {
    server = app.listen(PORT, () => {
        console.log(`Server listening on port: ${PORT}`);
    });
}

export { server };