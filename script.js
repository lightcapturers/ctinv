// Global variables
let inventoryData = [];
let filteredData = [];
let uniqueProductTypes = new Set();
let currentPage = 1;
const itemsPerPage = 8; // Reduced items per page for a more compact view
const elMonteLocationId = 'gid://shopify/Location/68455891180';
const whittierLocationId = 'gid://shopify/Location/71820017900';

// Document ready function
document.addEventListener('DOMContentLoaded', () => {
    // Load data from CSV
    loadCSVData();

    // Add event listeners
    document.getElementById('refreshData').addEventListener('click', refreshData);
    document.getElementById('applyFilters').addEventListener('click', applyFilters);
    document.getElementById('clearFilters').addEventListener('click', clearFilters);
    document.getElementById('prevPage').addEventListener('click', () => navigatePage(-1));
    document.getElementById('nextPage').addEventListener('click', () => navigatePage(1));
});

// Load CSV data
async function loadCSVData() {
    try {
        const response = await fetch('sample_inventory.csv');
        const csvText = await response.text();
        
        // Parse CSV
        const data = parseCSV(csvText);
        processData(data);
        
        // Initialize the dashboard
        updateDashboard();
        
        console.log('Data loaded successfully');
    } catch (error) {
        console.error('Error loading CSV data:', error);
    }
}

// Parse CSV text into array of objects
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(',');
        const entry = {};
        
        for (let j = 0; j < headers.length; j++) {
            entry[headers[j]] = values[j];
        }
        
        data.push(entry);
    }
    
    return data;
}

// Process and organize the data
function processData(data) {
    // Group data by product and variant
    const productMap = new Map();
    
    data.forEach(item => {
        // Add product type to unique set
        if (item['Product Type']) {
            uniqueProductTypes.add(item['Product Type']);
        }
        
        // Create a unique key for each product+variant
        const key = `${item['Product Title']}|${item['Variant Title']}|${item['SKU']}`;
        
        if (!productMap.has(key)) {
            productMap.set(key, {
                productTitle: item['Product Title'],
                productType: item['Product Type'],
                variantTitle: item['Variant Title'],
                sku: item['SKU'],
                imageUrl: item['Image URL'],
                locations: []
            });
        }
        
        // Add location information
        productMap.get(key).locations.push({
            locationId: item['Location ID'],
            locationName: item['Location Name'],
            available: parseInt(item['Available']) || 0,
            onHand: parseInt(item['On Hand']) || 0,
            threshold: parseInt(item['Threshold']) || 0,
            incoming: item['Incoming'] ? parseInt(item['Incoming']) : 0,
            incomingDate: item['Incoming Date']
        });
    });
    
    // Convert map to array
    inventoryData = Array.from(productMap.values());
    filteredData = [...inventoryData];
    
    // Populate product type filter
    populateProductTypeFilter();
}

// Populate product type filter dropdown
function populateProductTypeFilter() {
    const productTypeFilter = document.getElementById('productTypeFilter');
    
    // Clear existing options except the first one
    while (productTypeFilter.options.length > 1) {
        productTypeFilter.remove(1);
    }
    
    // Add new options
    uniqueProductTypes.forEach(type => {
        if (type) {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            productTypeFilter.appendChild(option);
        }
    });
}

// Update dashboard with current data
function updateDashboard() {
    updateMetrics();
    renderProductCards();
    updatePagination();
}

// Update metrics section
function updateMetrics() {
    // Count unique products (by SKU)
    const uniqueSkus = new Set(inventoryData.map(item => item.sku));
    document.getElementById('totalProducts').textContent = uniqueSkus.size;
    
    // Calculate El Monte total stock
    let elMonteTotal = 0;
    inventoryData.forEach(product => {
        const elMonteLocation = product.locations.find(loc => loc.locationId === elMonteLocationId);
        if (elMonteLocation) {
            elMonteTotal += Math.max(0, elMonteLocation.onHand);
        }
    });
    document.getElementById('elMonteStock').textContent = elMonteTotal;
    
    // Calculate Whittier total stock
    let whittierTotal = 0;
    inventoryData.forEach(product => {
        const whittierLocation = product.locations.find(loc => loc.locationId === whittierLocationId);
        if (whittierLocation) {
            whittierTotal += Math.max(0, whittierLocation.onHand);
        }
    });
    document.getElementById('whittierStock').textContent = whittierTotal;
    
    // Calculate low stock items
    let lowStockCount = 0;
    inventoryData.forEach(product => {
        product.locations.forEach(location => {
            if (location.onHand < location.threshold && location.threshold > 0) {
                lowStockCount++;
            }
        });
    });
    document.getElementById('lowStockCount').textContent = lowStockCount;
}

// Render product cards based on filtered data
function renderProductCards() {
    const productGrid = document.getElementById('productGrid');
    productGrid.innerHTML = '';
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentPageData = filteredData.slice(startIndex, endIndex);
    
    if (currentPageData.length === 0) {
        const noResultsMsg = document.createElement('div');
        noResultsMsg.className = 'no-results';
        noResultsMsg.textContent = 'No products match your filter criteria.';
        productGrid.appendChild(noResultsMsg);
        return;
    }
    
    currentPageData.forEach(product => {
        const card = createProductCard(product);
        productGrid.appendChild(card);
    });

    // Important: Wait for DOM to update before creating cylinder charts
    requestAnimationFrame(() => {
        document.querySelectorAll('.cylinder-chart').forEach(canvas => {
            if (canvas.dataset.initialized !== 'true') {
                const elMonteData = JSON.parse(canvas.dataset.elMonte || '{}');
                const whittierData = JSON.parse(canvas.dataset.whittier || '{}');
                
                if (canvas.dataset.location === 'el-monte') {
                    createCylinderChart(
                        canvas, 
                        elMonteData.onHand, 
                        elMonteData.threshold,
                        elMonteData.incoming,
                        elMonteData.incomingDate
                    );
                } else if (canvas.dataset.location === 'whittier') {
                    createCylinderChart(
                        canvas, 
                        whittierData.onHand, 
                        whittierData.threshold,
                        whittierData.incoming,
                        whittierData.incomingDate
                    );
                }
                canvas.dataset.initialized = 'true';
            }
        });
    });
}

// Create a single product card
function createProductCard(product) {
    const template = document.getElementById('productCardTemplate');
    const cardClone = template.content.cloneNode(true);
    
    // Get location data
    const elMonteLocation = product.locations.find(loc => loc.locationId === elMonteLocationId) || {
        onHand: 0,
        threshold: 0,
        incoming: 0,
        incomingDate: ''
    };
    
    const whittierLocation = product.locations.find(loc => loc.locationId === whittierLocationId) || {
        onHand: 0,
        threshold: 0,
        incoming: 0,
        incomingDate: ''
    };

    // Determine card border color based on stock status
    const card = cardClone.querySelector('.product-card');
    let borderColor = 'border-normal';
    
    // If either location is low on stock
    if ((elMonteLocation.onHand < elMonteLocation.threshold * 0.2 && elMonteLocation.threshold > 0) ||
        (whittierLocation.onHand < whittierLocation.threshold * 0.2 && whittierLocation.threshold > 0)) {
        borderColor = 'border-danger';
    } 
    // If either location has incoming stock
    else if (elMonteLocation.incoming > 0 || whittierLocation.incoming > 0) {
        borderColor = 'border-warning';
    }
    // If stock is good
    else if (elMonteLocation.onHand >= elMonteLocation.threshold && whittierLocation.onHand >= whittierLocation.threshold) {
        borderColor = 'border-success';
    }
    
    card.classList.add(borderColor);
    
    // Set product information
    cardClone.querySelector('.product-title').textContent = product.productTitle;
    cardClone.querySelector('.variant-title').textContent = product.variantTitle;
    cardClone.querySelector('.product-type').textContent = product.productType;
    cardClone.querySelector('.product-sku').textContent = `SKU: ${product.sku}`;
    
    // Set product image
    const imgElement = cardClone.querySelector('.product-image img');
    if (product.imageUrl) {
        imgElement.src = product.imageUrl;
        imgElement.alt = product.productTitle;
    } else {
        imgElement.src = 'https://picsum.photos/300/200';
        imgElement.alt = 'Product image placeholder';
    }
    
    // Set El Monte inventory details
    const elMonteContainer = cardClone.querySelectorAll('.location-inventory')[0];
    elMonteContainer.querySelector('.onhand').textContent = `On Hand: ${elMonteLocation.onHand}`;
    elMonteContainer.querySelector('.threshold').textContent = `Threshold: ${elMonteLocation.threshold}`;
    
    // Set Whittier inventory details
    const whittierContainer = cardClone.querySelectorAll('.location-inventory')[1];
    whittierContainer.querySelector('.onhand').textContent = `On Hand: ${whittierLocation.onHand}`;
    whittierContainer.querySelector('.threshold').textContent = `Threshold: ${whittierLocation.threshold}`;
    
    // Pre-configure canvas elements with data attributes
    const elMonteCanvas = elMonteContainer.querySelector('.cylinder-chart');
    elMonteCanvas.dataset.location = 'el-monte';
    elMonteCanvas.dataset.elMonte = JSON.stringify({
        onHand: elMonteLocation.onHand,
        threshold: elMonteLocation.threshold,
        incoming: elMonteLocation.incoming,
        incomingDate: elMonteLocation.incomingDate
    });
    
    const whittierCanvas = whittierContainer.querySelector('.cylinder-chart');
    whittierCanvas.dataset.location = 'whittier';
    whittierCanvas.dataset.whittier = JSON.stringify({
        onHand: whittierLocation.onHand,
        threshold: whittierLocation.threshold,
        incoming: whittierLocation.incoming,
        incomingDate: whittierLocation.incomingDate
    });
    
    return cardClone;
}

// Create a 3D cylinder visualization using Three.js
function createCylinderChart(canvas, onHand, threshold, incoming = 0, incomingDate = '') {
    if (!canvas || canvas.clientWidth === 0 || canvas.clientHeight === 0) {
        console.error('Invalid canvas element or dimensions:', canvas);
        return;
    }

    try {
        // Set positive values for calculations
        onHand = Math.max(0, onHand);
        threshold = Math.max(1, threshold); // Ensure threshold is at least 1
        incoming = Math.max(0, incoming);
        
        // Calculate height percentages
        const maxHeight = 1.0; // Full height of cylinder
        const onHandPercent = Math.min(onHand / threshold, 1.0);
        const incomingPercent = incoming > 0 ? (incoming / threshold) : 0;
        
        // Determine color based on stock level
        let color;
        if (onHandPercent < 0.2) {
            color = 0xFF5252; // Red
        } else if (onHandPercent < 0.5) {
            color = 0xFFC107; // Yellow
        } else {
            color = 0x00C853; // Green
        }
        
        // Set up scene
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
        
        // Check if the canvas already has a renderer attached
        let renderer;
        if (canvas.renderer) {
            renderer = canvas.renderer;
        } else {
            renderer = new THREE.WebGLRenderer({ 
                canvas: canvas, 
                alpha: true, 
                antialias: true,
                preserveDrawingBuffer: true 
            });
            canvas.renderer = renderer;
        }
        
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        renderer.setClearColor(0x000000, 0); // Transparent background
        
        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
        directionalLight.position.set(1, 1, 1);
        scene.add(directionalLight);
        
        // Create cylinder for base (empty/total capacity)
        const baseGeometry = new THREE.CylinderGeometry(0.4, 0.4, maxHeight, 24, 1, false);
        const baseMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x333333, 
            transparent: true, 
            opacity: 0.2,
            wireframe: false
        });
        const baseCylinder = new THREE.Mesh(baseGeometry, baseMaterial);
        scene.add(baseCylinder);
        
        // Create cylinder for on-hand quantity
        if (onHandPercent > 0) {
            const onHandHeight = onHandPercent * maxHeight;
            const onHandGeometry = new THREE.CylinderGeometry(0.4, 0.4, onHandHeight, 24, 1, false);
            const onHandMaterial = new THREE.MeshPhongMaterial({ 
                color: color,
                transparent: true,
                opacity: 0.9
            });
            const onHandCylinder = new THREE.Mesh(onHandGeometry, onHandMaterial);
            
            // Position from bottom
            onHandCylinder.position.y = (onHandHeight - maxHeight) / 2;
            scene.add(onHandCylinder);
            
            // Add text overlay for on-hand value
            // (We'll simulate this with a line for threshold)
        }
        
        // Create threshold line
        const thresholdYPosition = 0; // Center of cylinder
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-0.6, thresholdYPosition, 0),
            new THREE.Vector3(0.6, thresholdYPosition, 0)
        ]);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xFFFFFF, opacity: 0.7, transparent: true });
        const thresholdLine = new THREE.Line(lineGeometry, lineMaterial);
        thresholdLine.position.z = 0.41; // Slightly in front of cylinder
        scene.add(thresholdLine);
        
        // Create cylinder for incoming quantity
        if (incomingPercent > 0) {
            const incomingHeight = incomingPercent * maxHeight;
            const incomingGeometry = new THREE.CylinderGeometry(0.4, 0.4, incomingHeight, 24, 1, false);
            const incomingMaterial = new THREE.MeshPhongMaterial({ 
                color: 0x4169E1, // Blue
                transparent: true,
                opacity: 0.8
            });
            const incomingCylinder = new THREE.Mesh(incomingGeometry, incomingMaterial);
            
            // Position on top of on-hand cylinder or at bottom if no on-hand
            const offsetY = onHandPercent > 0 ? 
                onHandPercent * maxHeight + incomingHeight / 2 - maxHeight / 2 :
                incomingHeight / 2 - maxHeight / 2;
            
            incomingCylinder.position.y = offsetY;
            
            // Add incoming metadata for tooltip
            incomingCylinder.userData = { 
                incoming: incoming,
                incomingDate: incomingDate
            };
            
            scene.add(incomingCylinder);
            
            // Add tooltip functionality
            canvas.addEventListener('mousemove', (event) => {
                const rect = canvas.getBoundingClientRect();
                const mouse = new THREE.Vector2(
                    ((event.clientX - rect.left) / canvas.clientWidth) * 2 - 1,
                    -((event.clientY - rect.top) / canvas.clientHeight) * 2 + 1
                );
                
                const raycaster = new THREE.Raycaster();
                raycaster.setFromCamera(mouse, camera);
                
                const intersects = raycaster.intersectObject(incomingCylinder);
                
                if (intersects.length > 0) {
                    showTooltip(
                        event.clientX, 
                        event.clientY, 
                        `Incoming: ${incoming} (${incomingDate || 'No date'})`
                    );
                } else {
                    hideTooltip();
                }
            });
            
            canvas.addEventListener('mouseleave', hideTooltip);
        }
        
        // Position camera
        camera.position.set(0, 0, 2.5);
        camera.lookAt(0, 0, 0);
        
        // Add a small animation to make it more visually appealing
        function animate() {
            requestAnimationFrame(animate);
            baseCylinder.rotation.y += 0.01;
            
            // Get all children that are cylinders and rotate them
            scene.children.forEach(child => {
                if (child.geometry && child.geometry.type === 'CylinderGeometry') {
                    child.rotation.y += 0.01;
                }
            });
            
            renderer.render(scene, camera);
        }
        
        animate();
        
        // Add numeric indicators
        addTextOverlay(canvas, onHand, threshold, incoming);
        
    } catch (error) {
        console.error('Error creating cylinder chart:', error);
    }
}

// Add text overlay for values
function addTextOverlay(canvas, onHand, threshold, incoming) {
    const overlayDiv = document.createElement('div');
    overlayDiv.className = 'cylinder-overlay';
    overlayDiv.style.position = 'absolute';
    overlayDiv.style.top = '0';
    overlayDiv.style.left = '0';
    overlayDiv.style.width = '100%';
    overlayDiv.style.height = '100%';
    overlayDiv.style.pointerEvents = 'none';
    overlayDiv.style.display = 'flex';
    overlayDiv.style.flexDirection = 'column';
    overlayDiv.style.justifyContent = 'center';
    overlayDiv.style.alignItems = 'center';
    overlayDiv.style.color = 'white';
    overlayDiv.style.textShadow = '1px 1px 2px rgba(0,0,0,0.5)';
    
    // Threshold label (middle)
    const thresholdLabel = document.createElement('div');
    thresholdLabel.textContent = threshold;
    thresholdLabel.style.position = 'absolute';
    thresholdLabel.style.top = '50%';
    thresholdLabel.style.transform = 'translateY(-50%)';
    thresholdLabel.style.fontSize = '14px';
    overlayDiv.appendChild(thresholdLabel);
    
    // On-hand label (bottom)
    if (onHand > 0) {
        const onHandLabel = document.createElement('div');
        onHandLabel.textContent = onHand;
        onHandLabel.style.position = 'absolute';
        onHandLabel.style.bottom = '20%';
        onHandLabel.style.fontSize = '16px';
        onHandLabel.style.fontWeight = 'bold';
        overlayDiv.appendChild(onHandLabel);
    }
    
    // Parent container should be positioned relatively
    canvas.parentElement.style.position = 'relative';
    canvas.parentElement.appendChild(overlayDiv);
}

// Show tooltip
function showTooltip(x, y, text) {
    let tooltip = document.querySelector('.tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        document.body.appendChild(tooltip);
    }
    
    tooltip.textContent = text;
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
    tooltip.style.display = 'block';
}

// Hide tooltip
function hideTooltip() {
    const tooltip = document.querySelector('.tooltip');
    if (tooltip) {
        tooltip.style.display = 'none';
    }
}

// Apply filters
function applyFilters() {
    const productType = document.getElementById('productTypeFilter').value;
    const sku = document.getElementById('skuFilter').value.toLowerCase();
    const productTitle = document.getElementById('productTitleFilter').value.toLowerCase();
    const stockLevel = document.getElementById('stockLevelFilter').value;
    
    filteredData = inventoryData.filter(product => {
        // Filter by product type
        if (productType && product.productType !== productType) {
            return false;
        }
        
        // Filter by SKU
        if (sku && !product.sku.toLowerCase().includes(sku)) {
            return false;
        }
        
        // Filter by product title
        if (productTitle && !product.productTitle.toLowerCase().includes(productTitle)) {
            return false;
        }
        
        // Filter by stock level
        if (stockLevel) {
            const elMonteLocation = product.locations.find(loc => loc.locationId === elMonteLocationId);
            const whittierLocation = product.locations.find(loc => loc.locationId === whittierLocationId);
            
            const elMonteRatio = elMonteLocation ? elMonteLocation.onHand / Math.max(1, elMonteLocation.threshold) : 0;
            const whittierRatio = whittierLocation ? whittierLocation.onHand / Math.max(1, whittierLocation.threshold) : 0;
            
            if (stockLevel === 'low' && elMonteRatio >= 0.2 && whittierRatio >= 0.2) {
                return false;
            } else if (stockLevel === 'medium' && (elMonteRatio < 0.2 || elMonteRatio >= 0.8) && 
                       (whittierRatio < 0.2 || whittierRatio >= 0.8)) {
                return false;
            } else if (stockLevel === 'high' && elMonteRatio < 0.8 && whittierRatio < 0.8) {
                return false;
            }
        }
        
        return true;
    });
    
    // Reset to first page and update display
    currentPage = 1;
    updateDashboard();
}

// Clear all filters
function clearFilters() {
    document.getElementById('productTypeFilter').value = '';
    document.getElementById('skuFilter').value = '';
    document.getElementById('productTitleFilter').value = '';
    document.getElementById('stockLevelFilter').value = '';
    
    filteredData = [...inventoryData];
    currentPage = 1;
    updateDashboard();
}

// Refresh data
function refreshData() {
    // Simulate refresh with animation
    const refreshBtn = document.getElementById('refreshData');
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-refresh-cw spinning"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
        Refreshing...
    `;
    
    // Reload data
    setTimeout(() => {
        loadCSVData().then(() => {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-refresh-cw"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
                Refresh Data
            `;
        });
    }, 1000);
}

// Navigate between pages
function navigatePage(direction) {
    const newPage = currentPage + direction;
    const maxPage = Math.ceil(filteredData.length / itemsPerPage);
    
    if (newPage >= 1 && newPage <= maxPage) {
        currentPage = newPage;
        renderProductCards();
        updatePagination();
    }
}

// Update pagination information
function updatePagination() {
    const maxPage = Math.ceil(filteredData.length / itemsPerPage);
    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${maxPage}`;
    
    // Disable/enable buttons as needed
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === maxPage;
}

// Add styles for the spinning animation
const style = document.createElement('style');
style.innerHTML = `
    .spinning {
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style); 