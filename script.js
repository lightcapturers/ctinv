// Global variables
let inventoryData = [];
let filteredData = [];
let uniqueProductTypes = new Set();
let uniqueSKUs = new Set();
let uniqueProductTitles = new Set();
let currentPage = 1;
let itemsPerPage = 0; // Will be calculated based on viewport size
const elMonteLocationId = 'gid://shopify/Location/68455891180';
const whittierLocationId = 'gid://shopify/Location/71820017900';
const API_ENDPOINT = '/api/inventory'; // Endpoint to fetch data from server
let selectedProductTypes = new Set(); // Track selected product type pills

// Document ready function
document.addEventListener('DOMContentLoaded', () => {
    // We've removed the sidebar completely, so no need to initialize it
    
    // Handle window resize
    window.addEventListener('resize', handleWindowResize);
    handleWindowResize();
    
    // Load inventory data
    loadInventoryData();
    
    // Setup event listeners
    document.getElementById('refreshData').addEventListener('click', refreshData);
    document.getElementById('applyFilters').addEventListener('click', applyFilters);
    document.getElementById('clearFilters').addEventListener('click', clearFilters);
    
    // Setup autocomplete for SKU and Product Title
    setupAutocomplete('skuFilter', 'skuAutocomplete', []);
    setupAutocomplete('productTitleFilter', 'productTitleAutocomplete', []);
    
    // Hide pagination elements
    document.querySelector('.pagination').style.display = 'none';
});

// Setup mobile menu toggle
function setupMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    // Toggle sidebar when menu button is clicked
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        menuToggle.classList.toggle('active');
        overlay.classList.toggle('active');
        
        // Prevent body scrolling when sidebar is open
        if (sidebar.classList.contains('active')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    });
    
    // Close sidebar when clicking overlay
    overlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        menuToggle.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    });
    
    // Close sidebar when clicking a menu item
    const menuItems = sidebar.querySelectorAll('nav a');
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
                menuToggle.classList.remove('active');
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });
}

// Handle window resize events
function handleWindowResize() {
    // All sidebar references have been removed,
    // so we don't need to reset anything here
    
    // Additional responsive adjustments can be added here if needed
}

// Function to load inventory data
async function loadInventoryData() {
    try {
        // Show loading indicator
        document.body.classList.add('loading');
        
        // First try to fetch data from our static JSON file
        const response = await fetch('./data/inventory.json');
        
        if (!response.ok) {
            throw new Error('Failed to fetch local inventory data');
        }
        
        // Parse the JSON response
        const data = await response.json();
        
        // If local data is empty (empty array), try the API endpoint
        if (Array.isArray(data) && data.length === 0) {
            console.log('Local inventory data is empty, trying API endpoint...');
            
            // Try fetching from API
            try {
                const apiResponse = await fetch(API_ENDPOINT);
                
                if (!apiResponse.ok) {
                    throw new Error('Failed to fetch inventory data from API');
                }
                
                const apiData = await apiResponse.json();
                
                if (Array.isArray(apiData) && apiData.length > 0) {
                    console.log(`Successfully loaded ${apiData.length} items from API`);
                    inventoryData = apiData;
                    filteredData = [...inventoryData];
                } else {
                    console.warn('API returned empty data');
                    inventoryData = [];
                    filteredData = [];
                }
            } catch (apiError) {
                console.error('Error loading from API:', apiError);
                inventoryData = [];
                filteredData = [];
            }
        } else {
            // Process the data from JSON file
            console.log(`Successfully loaded ${data.length} items from local file`);
            inventoryData = data;
            filteredData = [...inventoryData];
        }
        
        // Update product type filter
        updateProductTypeFilter(inventoryData);
        
        // Populate autocomplete data
        uniqueSKUs = new Set(inventoryData.map(item => item.sku));
        uniqueProductTitles = new Set(inventoryData.map(item => item.productTitle));
        
        // Update the dashboard
        updateDashboard();
        
        // Hide loading indicator
        document.body.classList.remove('loading');
    } catch (error) {
        console.error('Error loading inventory data:', error);
        
        // Try API as fallback
        try {
            console.log('Trying API endpoint as fallback...');
            const apiResponse = await fetch(API_ENDPOINT);
            
            if (!apiResponse.ok) {
                throw new Error('Failed to fetch from API');
            }
            
            const apiData = await apiResponse.json();
            
            if (Array.isArray(apiData) && apiData.length > 0) {
                console.log(`Successfully loaded ${apiData.length} items from API`);
                inventoryData = apiData;
                filteredData = [...inventoryData];
                
                // Update product type filter
                updateProductTypeFilter(inventoryData);
                
                // Populate autocomplete data
                uniqueSKUs = new Set(inventoryData.map(item => item.sku));
                uniqueProductTitles = new Set(inventoryData.map(item => item.productTitle));
                
                // Update the dashboard
                updateDashboard();
                
                // Hide loading indicator
                document.body.classList.remove('loading');
                return;
            }
        } catch (apiError) {
            console.error('Error fallback to API:', apiError);
        }
        
        // Hide loading indicator
        document.body.classList.remove('loading');
        
        // Show error message
        alert('Error loading inventory data. Please check the console for details and ensure your credentials are set up correctly.');
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
    
    // Calculate count of products that need transfers
    let transferCount = 0;
    inventoryData.forEach(product => {
        if (needsTransfer(product)) {
            transferCount++;
        }
    });
    document.getElementById('transferCount').textContent = transferCount;
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

// Format a date for display
function formatDate(dateStr) {
    if (!dateStr) return 'Date not specified';
    
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            return dateStr; // If not a valid date, return as is
        }
        return date.toLocaleDateString();
    } catch (e) {
        return dateStr;
    }
}

// Function to check if product needs a transfer
function needsTransfer(product) {
    const elMonteLocation = product.locations.find(loc => loc.locationId === elMonteLocationId);
    const whittierLocation = product.locations.find(loc => loc.locationId === whittierLocationId);
    
    // Both locations must exist
    if (!elMonteLocation || !whittierLocation) {
        return false;
    }
    
    // If Whittier threshold is zero, no transfer is needed
    if (whittierLocation.threshold <= 0) {
        return false;
    }
    
    // Whittier must be below or near its threshold
    const whittierNeedsStock = whittierLocation.onHand <= whittierLocation.threshold;
    
    // El Monte must have enough to cover both thresholds plus extra
    const elMonteHasExcess = elMonteLocation.onHand > (elMonteLocation.threshold + whittierLocation.threshold);
    
    // Return true if both conditions are met
    return whittierNeedsStock && elMonteHasExcess;
}

// Calculate recommended transfer amount
function calculateTransferAmount(product) {
    const elMonteLocation = product.locations.find(loc => loc.locationId === elMonteLocationId);
    const whittierLocation = product.locations.find(loc => loc.locationId === whittierLocationId);
    
    if (!elMonteLocation || !whittierLocation) {
        return 0;
    }
    
    // How much Whittier needs to reach threshold
    const whittierNeeds = Math.max(0, whittierLocation.threshold - whittierLocation.onHand);
    
    // How much El Monte can spare while keeping its own threshold plus a 20% buffer
    const elMonteSpare = Math.max(0, elMonteLocation.onHand - Math.ceil(elMonteLocation.threshold * 1.2));
    
    // Return the smaller of the two values
    return Math.min(whittierNeeds, elMonteSpare);
}

// Create product card
function createProductCard(product) {
    // Clone template
    const template = document.getElementById('productCardTemplate');
    const productCard = template.content.cloneNode(true);
    
    // Set product details
    productCard.querySelector('.product-title').textContent = truncateText(product.productTitle, 40);
    productCard.querySelector('.variant-title').textContent = product.variantTitle || 'Standard';
    productCard.querySelector('.product-type').textContent = product.productType || 'Unknown Type';
    productCard.querySelector('.product-sku').textContent = product.sku || 'No SKU';
    
    // Set product image
    const imageElement = productCard.querySelector('.product-image img');
    if (product.imageUrl) {
        imageElement.src = product.imageUrl;
        imageElement.alt = product.productTitle;
    } else {
        imageElement.src = 'https://via.placeholder.com/150?text=No+Image';
        imageElement.alt = 'No Image Available';
    }
    
    // Get locations
    const elMonteLocation = product.locations.find(location => location.locationId === elMonteLocationId);
    const whittierLocation = product.locations.find(location => location.locationId === whittierLocationId);
    
    // Check for any incoming inventory
    let hasIncoming = false;
    let totalIncoming = 0;
    let incomingDate = '';
    
    if (elMonteLocation && elMonteLocation.incoming > 0) {
        hasIncoming = true;
        totalIncoming += elMonteLocation.incoming;
        incomingDate = elMonteLocation.incomingDate || '';
    }
    
    if (whittierLocation && whittierLocation.incoming > 0) {
        hasIncoming = true;
        totalIncoming += whittierLocation.incoming;
        if (!incomingDate && whittierLocation.incomingDate) {
            incomingDate = whittierLocation.incomingDate;
        }
    }
    
    // Display incoming info badge if there's incoming inventory
    if (hasIncoming) {
        const incomingInfo = productCard.querySelector('.incoming-info');
        const incomingText = incomingInfo.querySelector('.incoming-text');
        incomingInfo.style.display = 'block';
        incomingText.textContent = `${totalIncoming} units arriving ${formatDate(incomingDate)}`;
    }
    
    // Check if product needs transfer
    const requiresTransfer = needsTransfer(product);
    
    // Determine overall status for card border
    let cardStatus = 'normal';
    if (requiresTransfer) {
        cardStatus = 'transfer';
    } else if (elMonteLocation && whittierLocation) {
        const elMonteRatio = elMonteLocation.onHand / Math.max(1, elMonteLocation.threshold);
        const whittierRatio = whittierLocation.onHand / Math.max(1, whittierLocation.threshold);
        
        if (elMonteRatio < 0.2 || whittierRatio < 0.2) {
            cardStatus = 'danger';
        } else if (elMonteRatio < 0.5 || whittierRatio < 0.5) {
            cardStatus = 'warning';
        } else {
            cardStatus = 'success';
        }
    }
    
    // Set card border status
    const card = productCard.querySelector('.product-card');
    card.classList.add(`border-${cardStatus}`);
    
    // Add transfer badge if needed
    if (requiresTransfer) {
        const transferAmount = calculateTransferAmount(product);
        const transferBadge = document.createElement('div');
        transferBadge.className = 'transfer-badge';
        transferBadge.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 3v6m0 0V3m0 6h6m0 0h-6"/>
                <path d="M7 21v-6m0 0v6m0-6H1m0 0h6"/>
                <path d="M17 3h.01M7 21h.01M7 3h.01M17 21h.01M22 3h.01M2 21h.01M2 3h.01M22 21h.01"/>
                <path d="m19 7-6 5-2-2-6 5"/>
            </svg>
            Transfer ${transferAmount}
        `;
        // Add the badge to the product-meta section instead of the card
        productCard.querySelector('.product-meta').appendChild(transferBadge);
    }
    
    // Setup El Monte inventory
    if (elMonteLocation) {
        const elMonteContainer = productCard.querySelector('[data-location="el-monte"]');
        setupCylinder(
            elMonteContainer,
            elMonteLocation.onHand,
            elMonteLocation.threshold,
            elMonteLocation.incoming,
            elMonteLocation.incomingDate
        );
        
        // Set detail text
        productCard.querySelector('[data-location="el-monte"]').closest('.location-inventory').querySelector('.onhand').textContent = elMonteLocation.onHand;
        productCard.querySelector('[data-location="el-monte"]').closest('.location-inventory').querySelector('.threshold').textContent = elMonteLocation.threshold;
    } else {
        // No location data for El Monte
        const elMonteContainer = productCard.querySelector('[data-location="el-monte"]');
        setupCylinder(elMonteContainer, 0, 5, 0, '');
        
        // Set detail text
        productCard.querySelector('[data-location="el-monte"]').closest('.location-inventory').querySelector('.onhand').textContent = '0';
        productCard.querySelector('[data-location="el-monte"]').closest('.location-inventory').querySelector('.threshold').textContent = '0';
    }
    
    // Setup Whittier inventory
    if (whittierLocation) {
        const whittierContainer = productCard.querySelector('[data-location="whittier"]');
        setupCylinder(
            whittierContainer,
            whittierLocation.onHand,
            whittierLocation.threshold,
            whittierLocation.incoming,
            whittierLocation.incomingDate
        );
        
        // Set detail text
        productCard.querySelector('[data-location="whittier"]').closest('.location-inventory').querySelector('.onhand').textContent = whittierLocation.onHand;
        productCard.querySelector('[data-location="whittier"]').closest('.location-inventory').querySelector('.threshold').textContent = whittierLocation.threshold;
    } else {
        // No location data for Whittier
        const whittierContainer = productCard.querySelector('[data-location="whittier"]');
        setupCylinder(whittierContainer, 0, 5, 0, '');
        
        // Set detail text
        productCard.querySelector('[data-location="whittier"]').closest('.location-inventory').querySelector('.onhand').textContent = '0';
        productCard.querySelector('[data-location="whittier"]').closest('.location-inventory').querySelector('.threshold').textContent = '0';
    }
    
    return productCard;
}

// Helper function to truncate text with ellipsis
function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// Setup cylinder visualization (updated for compact design)
function setupCylinder(containerElement, onHand, threshold, incoming, incomingDate) {
    const cylinder = containerElement.querySelector('.cylinder');
    const fillElement = cylinder.querySelector('.cylinder-fill');
    const incomingElement = cylinder.querySelector('.cylinder-incoming');
    const thresholdLine = cylinder.querySelector('.threshold-line');
    const stockDisplay = cylinder.querySelector('.stock-display');
    
    // Clear any previous value labels
    const existingValues = cylinder.querySelectorAll('.cylinder-value');
    existingValues.forEach(el => el.remove());
    
    // Normalize values
    onHand = Math.max(0, parseInt(onHand) || 0);
    threshold = Math.max(1, parseInt(threshold) || 5);
    incoming = Math.max(0, parseInt(incoming) || 0);
    
    // Format incomingDate properly
    const formattedIncomingDate = formatDate(incomingDate);
    
    // Calculate percentages
    const currentPercentage = Math.min(Math.round((onHand / threshold) * 100), 100);
    const totalPercentage = Math.min(Math.round(((onHand + incoming) / threshold) * 100), 100);
    const incomingPercentage = totalPercentage - currentPercentage;
    
    // Remove any existing classes
    fillElement.classList.remove('low', 'medium', 'good', 'empty', 'has-incoming');
    
    // Set appropriate class based on stock level
    if (onHand === 0) {
        fillElement.classList.add('empty');
        stockDisplay.style.color = 'rgba(255, 82, 82, 0.8)';
        stockDisplay.style.textShadow = 'none';
        stockDisplay.style.bottom = '50%';
        stockDisplay.style.transform = 'translateY(50%)';
        stockDisplay.style.display = 'block';
        stockDisplay.textContent = onHand;
    } else {
        // For non-empty cylinders, display value in cylinder
        stockDisplay.style.display = 'none';
        
        // Set fill height based on percentage
        fillElement.style.height = `${currentPercentage}%`;
        
        // Always add value label to the cylinder, not to fill element
        const fillValue = document.createElement('div');
        fillValue.className = 'cylinder-value';
        fillValue.textContent = onHand;
        cylinder.appendChild(fillValue);
        
        // Position the value in the middle of the filled area
        // (or in the middle of the cylinder if it would be too low)
        const minHeightForLabel = 20; // Minimum height percentage for label to appear in fill
        if (currentPercentage >= minHeightForLabel) {
            fillValue.style.bottom = `${currentPercentage / 2}%`;
        } else {
            fillValue.style.bottom = '50%';
        }
        
        // Set fill color class
        if (currentPercentage < 25) {
            fillElement.classList.add('low');
        } else if (currentPercentage < 60) {
            fillElement.classList.add('medium');
        } else {
            fillElement.classList.add('good');
        }
    }
    
    // Set threshold line position
    thresholdLine.style.bottom = `${Math.min(Math.round((threshold / Math.max(threshold, (onHand + incoming) * 1.2)) * 100), 100)}%`;
    
    // Handle incoming inventory visualization
    if (incoming > 0) {
        // Add incoming class to current fill to modify border radius
        fillElement.classList.add('has-incoming');
        
        // Set incoming height
        incomingElement.style.height = `${incomingPercentage}%`;
        incomingElement.style.bottom = `${currentPercentage}%`;
        
        // Add value label to the incoming section 
        const incomingValue = document.createElement('div');
        incomingValue.className = 'cylinder-value incoming-value';
        incomingValue.textContent = incoming;
        cylinder.appendChild(incomingValue);
        
        // Position the value in the middle of the incoming area
        incomingValue.style.bottom = `${currentPercentage + (incomingPercentage / 2)}%`;
        
        // Store incoming date for tooltip
        incomingElement.dataset.incomingDate = formattedIncomingDate;
        incomingElement.dataset.incomingAmount = incoming;
        
        // Add hover events for tooltip
        incomingElement.addEventListener('mouseenter', function(e) {
            const rect = containerElement.getBoundingClientRect();
            const tooltipContent = `
                <div style="text-align: center;">
                    <strong>Incoming: ${this.dataset.incomingAmount} units</strong><br>
                    Expected: ${this.dataset.incomingDate}
                </div>
            `;
            showTooltip(
                rect.left + (rect.width / 2),
                rect.top - 10,
                tooltipContent
            );
        });
        
        incomingElement.addEventListener('mouseleave', hideTooltip);
    } else {
        // Reset incoming element
        incomingElement.style.height = '0';
        incomingElement.style.bottom = '0';
    }
}

// Initialize lazy loading of cylinders (keeping this function for compatibility)
function initLazyLoadingCharts() {
    // All cylinders are now created directly when the card is created
    // No need for additional lazy loading logic
}

// Function to update product filters
function updateProductTypeFilter(data) {
    // ... existing code ...
}

// Function to create and show tooltip
function showTooltip(x, y, html) {
    let tooltip = document.querySelector('.tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        document.body.appendChild(tooltip);
    }
    
    // Set content
    tooltip.innerHTML = html;
    
    // Make visible but off-screen first to measure dimensions
    tooltip.style.display = 'block';
    tooltip.style.left = '-9999px';
    tooltip.style.top = '-9999px';
    
    // Get dimensions after content is set
    const tooltipWidth = tooltip.offsetWidth;
    const tooltipHeight = tooltip.offsetHeight;
    
    // Calculate position, ensuring the tooltip stays within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Horizontal positioning - keep within viewport bounds
    let leftPos = Math.min(
        viewportWidth - tooltipWidth - 10,  // Right edge with padding
        Math.max(10, x - (tooltipWidth / 2)) // Left edge with padding
    );
    
    // Vertical positioning - above the element
    let topPos = Math.max(10, y - tooltipHeight - 10);
    
    // Set final position
    tooltip.style.left = `${leftPos}px`;
    tooltip.style.top = `${topPos}px`;
}

// Function to hide tooltip
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
            
            // For transfer needed filter
            if (stockLevel === 'transfer') {
                return needsTransfer(product);
            }
            
            // For incoming inventory filter
            if (stockLevel === 'incoming') {
                const hasIncoming = product.locations.some(loc => 
                    loc.incoming && loc.incoming > 0
                );
                return hasIncoming;
            }
            
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

// Add necessary styles for autocomplete
const autocompleteStyles = `
.autocomplete-container {
    position: relative;
    width: 100%;
}

.autocomplete-items {
    position: absolute;
    z-index: 99;
    top: 100%;
    left: 0;
    right: 0;
    max-height: 180px;
    overflow-y: auto;
    background-color: var(--background-dark);
    border: 1px solid var(--border-color);
    border-radius: 0 0 5px 5px;
    border-top: none;
    box-shadow: 0 4px 8px var(--shadow-color);
    display: none;
}

.autocomplete-item {
    padding: 6px 10px;
    cursor: pointer;
    transition: background-color 0.2s;
    color: var(--text-secondary);
    border-bottom: 1px solid var(--border-color);
    font-size: 12px;
}

.autocomplete-item:last-child {
    border-bottom: none;
}

.autocomplete-item:hover, .autocomplete-item.selected {
    background-color: rgba(65, 105, 225, 0.2);
    color: var(--text-primary);
}

.autocomplete-highlight {
    color: var(--accent-blue);
    font-weight: 600;
}

/* Pagination Styles */
.pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 15px;
    margin-top: 15px;
    padding: 10px 0;
}

#pageInfo {
    font-size: 13px;
    color: var(--text-secondary);
    font-weight: 500;
}
`;

// Add the styles to the header
const styleElement = document.createElement('style');
styleElement.textContent = autocompleteStyles;
document.head.appendChild(styleElement); 