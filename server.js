const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { fetchInventoryData } = require('./googleSheetsService');

const PORT = 3001;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.csv': 'text/csv'
};

// Cache the inventory data with a timestamp
let cachedInventoryData = {
    data: null,
    timestamp: 0
};

// Function to handle file requests
const handleFileRequest = (req, res) => {
    // Get file path
    let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
    
    // If the path doesn't have an extension, assume it's a route and serve the index.html
    if (!path.extname(filePath)) {
        filePath = path.join(__dirname, 'index.html');
    }
    
    // Get file extension and content type
    const extname = path.extname(filePath);
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';
    
    // Read file
    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // Page not found
                res.writeHead(404);
                res.end('404 File Not Found');
            } else {
                // Server error
                res.writeHead(500);
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            // Success
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
};

// Function to handle API requests
const handleApiRequest = async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    
    // Inventory data endpoint
    if (parsedUrl.pathname === '/api/inventory') {
        try {
            // Check if we have cached data less than 5 minutes old
            const now = Date.now();
            const cacheAge = now - cachedInventoryData.timestamp;
            
            if (!cachedInventoryData.data || cacheAge > 5 * 60 * 1000) {
                // Fetch fresh data from Google Sheets
                console.log('Fetching fresh inventory data from Google Sheets');
                cachedInventoryData.data = await fetchInventoryData();
                cachedInventoryData.timestamp = now;
            } else {
                console.log('Using cached inventory data');
            }
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(cachedInventoryData.data));
        } catch (error) {
            console.error('Error handling inventory API request:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to fetch inventory data' }));
        }
    } else {
        // API endpoint not found
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'API endpoint not found' }));
    }
};

// Create server
const server = http.createServer((req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle API requests
    if (req.url.startsWith('/api/')) {
        handleApiRequest(req, res);
    } else {
        handleFileRequest(req, res);
    }
});

// Start server
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
}); 