// Global variables
let inventoryData = [];
let filteredData = [];
let uniqueProductTypes = new Set();
let uniqueSKUs = new Set();
let uniqueProductTitles = new Set();
let currentPage = 1;
// Remove itemsPerPage limit to show all items
// const itemsPerPage = 8; // Reduced items per page for a more compact view
const elMonteLocationId = 'gid://shopify/Location/68455891180';
const whittierLocationId = 'gid://shopify/Location/71820017900';
const API_ENDPOINT = '/api/inventory'; // Endpoint to fetch data from server
let selectedProductTypes = new Set(); // Track selected product type pills

// Document ready function
document.addEventListener('DOMContentLoaded', () => {
    // Load data from API endpoint that will provide Google Sheets data
    loadInventoryData();

    // Add event listeners
    document.getElementById('refreshData').addEventListener('click', refreshData);
    document.getElementById('applyFilters').addEventListener('click', applyFilters);
    document.getElementById('clearFilters').addEventListener('click', clearFilters);
    
    // Remove pagination event listeners
    // document.getElementById('prevPage').addEventListener('click', () => navigatePage(-1));
    // document.getElementById('nextPage').addEventListener('click', () => navigatePage(1));
    
    // Add autocomplete event listeners
    setupAutocomplete('skuFilter', 'skuAutocomplete', uniqueSKUs);
    setupAutocomplete('productTitleFilter', 'productTitleAutocomplete', uniqueProductTitles);
    
    // Hide pagination elements
    document.querySelector('.pagination').style.display = 'none';
});

// Load inventory data from API
async function loadInventoryData() {
    try {
        // Show loading indicator
        document.getElementById('productGrid').innerHTML = '<div class="loading">Loading inventory data...</div>';
        
        const response = await fetch(API_ENDPOINT);
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        processData(data);
        
        // Initialize the dashboard
        updateDashboard();
        
        console.log('Data loaded successfully from Google Sheets');
    } catch (error) {
        console.error('Error loading inventory data:', error);
        document.getElementById('productGrid').innerHTML = 
            `<div class="error-message">Error loading data. Please try again later.<br>${error.message}</div>`;
    }
}

// Process and organize the data from API
function processData(data) {
    // Reset collections
    uniqueProductTypes.clear();
    uniqueSKUs.clear();
    uniqueProductTitles.clear();
    
    // Group data by product and variant
    const productMap = new Map();
    
    data.forEach(item => {
        // Add product type to unique set
        if (item['Product Type']) {
            uniqueProductTypes.add(item['Product Type']);
        }
        
        // Add SKU and Product Title to unique sets
        if (item['SKU']) {
            uniqueSKUs.add(item['SKU']);
        }
        
        if (item['Product Title']) {
            uniqueProductTitles.add(item['Product Title']);
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
    
    // Populate product type filter dropdown and pills
    populateProductTypeFilter();
    populateProductTypePills();
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

// Populate product type filter pills
function populateProductTypePills() {
    const pillsContainer = document.getElementById('productTypePills');
    pillsContainer.innerHTML = '';
    
    // Sort product types alphabetically
    const sortedTypes = Array.from(uniqueProductTypes).sort();
    
    // Create a pill for each product type
    sortedTypes.forEach(type => {
        if (type) {
            const pill = document.createElement('div');
            pill.className = 'filter-pill';
            if (selectedProductTypes.has(type)) {
                pill.classList.add('active');
            }
            pill.textContent = type;
            pill.dataset.type = type;
            
            // Add click event
            pill.addEventListener('click', toggleProductTypePill);
            
            pillsContainer.appendChild(pill);
        }
    });
}

// Toggle product type pill selection
function toggleProductTypePill(event) {
    const pill = event.currentTarget;
    const type = pill.dataset.type;
    
    if (selectedProductTypes.has(type)) {
        selectedProductTypes.delete(type);
        pill.classList.remove('active');
    } else {
        selectedProductTypes.add(type);
        pill.classList.add('active');
    }
    
    // Update the dropdown to reflect selection
    const productTypeFilter = document.getElementById('productTypeFilter');
    if (selectedProductTypes.size === 1) {
        productTypeFilter.value = Array.from(selectedProductTypes)[0];
    } else {
        productTypeFilter.value = '';
    }
    
    // Apply filters
    applyFilters();
}

// Set up autocomplete for an input field
function setupAutocomplete(inputId, autocompleteId, dataSet) {
    const input = document.getElementById(inputId);
    const autocompleteDiv = document.getElementById(autocompleteId);
    
    // Add input event listener
    input.addEventListener('input', function() {
        const value = this.value.toLowerCase();
        
        // Close any already open lists
        autocompleteDiv.innerHTML = '';
        
        // If no input, hide the autocomplete list
        if (!value) {
            autocompleteDiv.style.display = 'none';
            return;
        }
        
        // Create a filtered array of matches
        const matches = Array.from(dataSet)
            .filter(item => item.toLowerCase().includes(value))
            .sort()
            .slice(0, 10); // Limit to 10 results
        
        if (matches.length === 0) {
            autocompleteDiv.style.display = 'none';
            return;
        }
        
        // Display autocomplete items
        matches.forEach(match => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            
            // Highlight the matching part
            const matchIndex = match.toLowerCase().indexOf(value);
            const highlighted = match.substring(0, matchIndex) + 
                `<span class="autocomplete-highlight">${match.substring(matchIndex, matchIndex + value.length)}</span>` + 
                match.substring(matchIndex + value.length);
            
            item.innerHTML = highlighted;
            
            // Click event to select an item
            item.addEventListener('click', function() {
                input.value = match;
                autocompleteDiv.style.display = 'none';
            });
            
            autocompleteDiv.appendChild(item);
        });
        
        autocompleteDiv.style.display = 'block';
    });
    
    // Close autocomplete list when clicking outside
    document.addEventListener('click', function(e) {
        if (e.target !== input && e.target !== autocompleteDiv) {
            autocompleteDiv.style.display = 'none';
        }
    });
    
    // Handle keyboard navigation
    input.addEventListener('keydown', function(e) {
        const items = autocompleteDiv.getElementsByClassName('autocomplete-item');
        if (!items.length) return;
        
        // Find currently selected item
        let selectedIndex = -1;
        for (let i = 0; i < items.length; i++) {
            if (items[i].classList.contains('selected')) {
                selectedIndex = i;
                break;
            }
        }
        
        // Arrow down
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (selectedIndex < items.length - 1) {
                if (selectedIndex > -1) {
                    items[selectedIndex].classList.remove('selected');
                }
                items[selectedIndex + 1].classList.add('selected');
                items[selectedIndex + 1].scrollIntoView({ block: 'nearest' });
            }
        } 
        // Arrow up
        else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (selectedIndex > 0) {
                items[selectedIndex].classList.remove('selected');
                items[selectedIndex - 1].classList.add('selected');
                items[selectedIndex - 1].scrollIntoView({ block: 'nearest' });
            }
        } 
        // Enter
        else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex > -1) {
                input.value = items[selectedIndex].textContent.replace(/[\n\r]+|[\s]{2,}/g, ' ').trim();
                autocompleteDiv.style.display = 'none';
            }
        }
    });
}

// Update dashboard with current data
function updateDashboard() {
    updateMetrics();
    renderProductCards();
    // Remove updatePagination call
    // updatePagination();
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
    
    // No longer slice the data - show all items
    const currentPageData = filteredData;
    
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

    // Important: Use lazy loading instead of rendering all charts at once
    requestAnimationFrame(() => {
        initLazyLoadingCharts();
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
    
    // Set product information - truncate long titles
    const productTitle = cardClone.querySelector('.product-title');
    productTitle.textContent = truncateText(product.productTitle, 30);
    productTitle.title = product.productTitle; // Set full title as tooltip
    
    const variantTitle = cardClone.querySelector('.variant-title');
    variantTitle.textContent = truncateText(product.variantTitle, 30);
    variantTitle.title = product.variantTitle; // Set full variant as tooltip
    
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
    
    // Set El Monte inventory details - simplify display
    const elMonteContainer = cardClone.querySelectorAll('.location-inventory')[0];
    elMonteContainer.querySelector('.onhand').textContent = `On Hand: ${elMonteLocation.onHand}`;
    elMonteContainer.querySelector('.threshold').textContent = `Threshold: ${elMonteLocation.threshold}`;
    
    // Set Whittier inventory details - simplify display
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

// Helper function to truncate text with ellipsis
function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// Create visualization chart
function createCylinderChart(canvas, onHand, threshold, incoming = 0, incomingDate = '') {
    if (!canvas) {
        console.error('Canvas element is null or undefined');
        return;
    }

    // Remove any existing chart
    Chart.getChart(canvas)?.destroy();
    
    // Remove any existing error messages
    const previousError = canvas.parentElement.querySelector('.cylinder-error');
    if (previousError) {
        canvas.parentElement.removeChild(previousError);
    }

    try {
        // Normalize values for calculations
        onHand = Math.max(0, parseInt(onHand) || 0);
        threshold = Math.max(1, parseInt(threshold) || 1);
        
        // Calculate percentage for color determination
        const percentage = Math.min(Math.round((onHand / threshold) * 100), 100);
        
        // Determine color based on stock level
        let color;
        if (percentage < 20) {
            color = '#FF5252'; // Red
        } else if (percentage < 50) {
            color = '#FFC107'; // Yellow
        } else {
            color = '#00C853'; // Green
        }
        
        // Create vertical bar chart
        new Chart(canvas, {
            type: 'bar',
            data: {
                labels: [''], // Single empty label
                datasets: [{
                    label: 'Stock',
                    data: [onHand],
                    backgroundColor: color,
                    borderWidth: 0,
                    borderRadius: 4,
                    barThickness: 40
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 20,    // Add padding for threshold line
                        bottom: 5,
                        left: 0,
                        right: 0
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: Math.max(threshold * 1.2, onHand * 1.1), // Show slightly above threshold or current value
                        grid: {
                            display: false,
                            drawBorder: false
                        },
                        ticks: {
                            display: false // Hide axis ticks
                        },
                        border: {
                            display: false
                        }
                    },
                    x: {
                        grid: {
                            display: false,
                            drawBorder: false
                        },
                        ticks: {
                            display: false // Hide axis ticks
                        },
                        border: {
                            display: false
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        enabled: false
                    },
                    legend: {
                        display: false
                    },
                    title: {
                        display: false
                    },
                    // Custom plugin to draw threshold line
                    threshold: {
                        threshold: threshold,
                        lineWidth: 2,
                        lineColor: 'rgba(255, 255, 255, 0.5)',
                        labelColor: 'rgba(255, 255, 255, 0.7)',
                        labelSize: 9
                    }
                },
                animation: {
                    duration: 600
                }
            },
            plugins: [{
                id: 'threshold',
                beforeDraw: function(chart) {
                    if (chart.options.plugins.threshold) {
                        const ctx = chart.ctx;
                        const threshold = chart.options.plugins.threshold.threshold;
                        const yAxis = chart.scales.y;
                        const thresholdY = yAxis.getPixelForValue(threshold);
                        const lineWidth = chart.options.plugins.threshold.lineWidth || 2;
                        const lineColor = chart.options.plugins.threshold.lineColor || 'rgba(255, 255, 255, 0.5)';
                        const labelColor = chart.options.plugins.threshold.labelColor || 'rgba(255, 255, 255, 0.7)';
                        const labelSize = chart.options.plugins.threshold.labelSize || 9;
                        
                        // Draw threshold line
                        ctx.save();
                        ctx.beginPath();
                        ctx.moveTo(chart.chartArea.left, thresholdY);
                        ctx.lineTo(chart.chartArea.right, thresholdY);
                        ctx.lineWidth = lineWidth;
                        ctx.strokeStyle = lineColor;
                        ctx.setLineDash([4, 2]); // Dashed line
                        ctx.stroke();
                        ctx.restore();
                        
                        // Add small threshold label
                        ctx.save();
                        ctx.fillStyle = labelColor;
                        ctx.font = `${labelSize}px Inter`;
                        ctx.textAlign = 'left';
                        ctx.textBaseline = 'bottom';
                        ctx.fillText(`T: ${threshold}`, chart.chartArea.left + 5, thresholdY - 2);
                        ctx.restore();
                    }
                }
            }]
        });
        
        // Add text overlay
        addTextOverlay(canvas, onHand, threshold, incoming);
        
        canvas.dataset.initialized = 'true';
        
    } catch (error) {
        console.error('Chart error:', error);
        createFallbackDisplay(canvas, onHand, threshold);
    }
}

// Add text overlay for values
function addTextOverlay(canvas, onHand, threshold, incoming) {
    // Remove any existing overlay
    const existingOverlay = canvas.parentElement.querySelector('.cylinder-overlay');
    if (existingOverlay) {
        canvas.parentElement.removeChild(existingOverlay);
    }

    const overlayDiv = document.createElement('div');
    overlayDiv.className = 'cylinder-overlay';
    overlayDiv.style.position = 'absolute';
    overlayDiv.style.top = '0';
    overlayDiv.style.left = '0';
    overlayDiv.style.width = '100%';
    overlayDiv.style.height = '100%';
    overlayDiv.style.pointerEvents = 'none';
    
    // Top right counter
    const valueContainer = document.createElement('div');
    valueContainer.className = 'value-container';
    valueContainer.style.position = 'absolute';
    valueContainer.style.top = '5px';
    valueContainer.style.right = '5px';
    valueContainer.style.display = 'flex';
    valueContainer.style.flexDirection = 'column';
    valueContainer.style.alignItems = 'flex-end';
    valueContainer.style.backgroundColor = 'rgba(45, 45, 45, 0.7)';
    valueContainer.style.backdropFilter = 'blur(2px)';
    valueContainer.style.borderRadius = '4px';
    valueContainer.style.padding = '2px 5px';
    
    // Determine text color based on stock level
    const ratio = onHand / Math.max(1, threshold);
    let textColor = '#FF5252'; // Red
    
    if (ratio >= 0.5) {
        textColor = '#00C853'; // Green
    } else if (ratio >= 0.2) {
        textColor = '#FFC107'; // Yellow
    }
    
    // Value text
    const valueText = document.createElement('div');
    valueText.style.fontSize = '16px';
    valueText.style.fontWeight = '600';
    valueText.style.lineHeight = '1.1';
    valueText.style.color = textColor;
    valueText.textContent = onHand;
    
    valueContainer.appendChild(valueText);
    
    // Add incoming indicator if there's incoming stock
    if (incoming > 0) {
        const incomingText = document.createElement('div');
        incomingText.style.fontSize = '9px';
        incomingText.style.lineHeight = '1';
        incomingText.style.color = '#42A5F5';
        incomingText.innerHTML = `+${incoming}`;
        valueContainer.appendChild(incomingText);
    }
    
    overlayDiv.appendChild(valueContainer);
    
    // Parent container should be positioned relatively
    canvas.parentElement.style.position = 'relative';
    canvas.parentElement.appendChild(overlayDiv);
}

// Create a fallback text display when Chart.js fails
function createFallbackDisplay(canvas, onHand, threshold) {
    // Create fallback display with text
    const errorMsg = document.createElement('div');
    errorMsg.className = 'cylinder-error';
    errorMsg.style.padding = '10px';
    errorMsg.style.display = 'flex';
    errorMsg.style.flexDirection = 'column';
    errorMsg.style.alignItems = 'center';
    errorMsg.style.justifyContent = 'center';
    
    // Style based on stock level
    const ratio = onHand / Math.max(1, threshold);
    let textColor = '#FF5252'; // Red
    
    if (ratio >= 0.5) {
        textColor = '#00C853'; // Green
    } else if (ratio >= 0.2) {
        textColor = '#FFC107'; // Yellow
    }
    
    // Create a simple visual bar
    const barContainer = document.createElement('div');
    barContainer.style.width = '60%';
    barContainer.style.height = '50px';
    barContainer.style.backgroundColor = '#333';
    barContainer.style.borderRadius = '3px';
    barContainer.style.position = 'relative';
    barContainer.style.marginBottom = '5px';
    
    const fillBar = document.createElement('div');
    fillBar.style.position = 'absolute';
    fillBar.style.bottom = '0';
    fillBar.style.left = '0';
    fillBar.style.width = '100%';
    fillBar.style.height = `${Math.min(100, Math.round((onHand / threshold) * 100))}%`;
    fillBar.style.backgroundColor = textColor;
    fillBar.style.borderRadius = '3px';
    
    const thresholdLine = document.createElement('div');
    thresholdLine.style.position = 'absolute';
    thresholdLine.style.bottom = '100%';
    thresholdLine.style.left = '0';
    thresholdLine.style.width = '100%';
    thresholdLine.style.height = '1px';
    thresholdLine.style.borderBottom = '2px dashed rgba(255,255,255,0.5)';
    
    barContainer.appendChild(fillBar);
    barContainer.appendChild(thresholdLine);
    
    // Value text
    const valueText = document.createElement('div');
    valueText.style.fontSize = '16px';
    valueText.style.fontWeight = '600';
    valueText.style.color = textColor;
    valueText.textContent = onHand;
    
    // Threshold text
    const thresholdText = document.createElement('div');
    thresholdText.style.fontSize = '10px';
    thresholdText.style.color = '#B0B0B0';
    thresholdText.textContent = `Threshold: ${threshold}`;
    
    errorMsg.appendChild(barContainer);
    errorMsg.appendChild(valueText);
    errorMsg.appendChild(thresholdText);
    
    canvas.parentElement.style.position = 'relative';
    canvas.style.display = 'none'; // Hide the canvas
    canvas.parentElement.appendChild(errorMsg);
    canvas.dataset.initialized = 'true';
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
    // Get filter values
    const productType = document.getElementById('productTypeFilter').value;
    const sku = document.getElementById('skuFilter').value.toLowerCase();
    const productTitle = document.getElementById('productTitleFilter').value.toLowerCase();
    const stockLevel = document.getElementById('stockLevelFilter').value;
    
    filteredData = inventoryData.filter(product => {
        // Filter by product type (from dropdown)
        if (productType && product.productType !== productType) {
            // Check if we should use the pill selection instead
            if (selectedProductTypes.size > 0 && !selectedProductTypes.has(product.productType)) {
                return false;
            } else if (selectedProductTypes.size === 0) {
                return false;
            }
        }
        
        // If pill selection is active and dropdown is empty
        if (!productType && selectedProductTypes.size > 0 && !selectedProductTypes.has(product.productType)) {
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
    
    // No longer reset to first page
    // currentPage = 1;
    updateDashboard();
}

// Clear all filters
function clearFilters() {
    document.getElementById('productTypeFilter').value = '';
    document.getElementById('skuFilter').value = '';
    document.getElementById('productTitleFilter').value = '';
    document.getElementById('stockLevelFilter').value = '';
    
    // Clear pill selections
    selectedProductTypes.clear();
    const pills = document.querySelectorAll('.filter-pill');
    pills.forEach(pill => pill.classList.remove('active'));
    
    filteredData = [...inventoryData];
    // No longer reset to first page
    // currentPage = 1;
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
        loadInventoryData().then(() => {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-refresh-cw"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
                Refresh Data
            `;
        });
    }, 1000);
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

// Function to implement lazy loading for charts (simplified since Chart.js doesn't have WebGL context limits)
function initLazyLoadingCharts() {
    // Set up intersection observer to detect when charts are visible
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const canvas = entry.target;
                
                // Only initialize charts that haven't been initialized yet
                if (canvas.dataset.initialized !== 'true') {
                    const location = canvas.dataset.location;
                    
                    if (location === 'el-monte') {
                        const data = JSON.parse(canvas.dataset.elMonte || '{}');
                        createCylinderChart(
                            canvas, 
                            data.onHand, 
                            data.threshold,
                            data.incoming,
                            data.incomingDate
                        );
                    } else if (location === 'whittier') {
                        const data = JSON.parse(canvas.dataset.whittier || '{}');
                        createCylinderChart(
                            canvas, 
                            data.onHand, 
                            data.threshold,
                            data.incoming,
                            data.incomingDate
                        );
                    }
                }
                
                // Stop observing this element
                observer.unobserve(canvas);
            }
        });
    }, {
        root: null, // viewport
        rootMargin: '100px', // load charts that are within 100px of viewport
        threshold: 0.1 // trigger when at least 10% of the element is visible
    });
    
    // Observe all cylinder charts that need to be rendered
    document.querySelectorAll('.cylinder-chart:not([data-initialized="true"])').forEach(canvas => {
        observer.observe(canvas);
    });
} 