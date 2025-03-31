const fs = require('fs');
const path = require('path');
const { fetchInventoryData } = require('./googleSheetsService');

async function fixInventoryData() {
  try {
    console.log('Fetching data from Google Sheets...');
    const rawData = await fetchInventoryData();
    console.log(`Fetched ${rawData.length} rows from Google Sheets`);
    
    // Group data by product+variant+sku (similar to how it's done in fetch-inventory.js)
    const productMap = new Map();
    
    rawData.forEach(row => {
      const key = `${row['Product Title']}|${row['Variant Title']}|${row['SKU']}`;
      
      if (!productMap.has(key)) {
        productMap.set(key, {
          sku: row['SKU'] || '',
          productTitle: row['Product Title'] || '',
          productType: row['Product Type'] || '',
          variantTitle: row['Variant Title'] || '',
          imageUrl: row['Image URL'] || '',
          locations: []
        });
      }
      
      // Skip if this isn't a location row
      if (!row['Location ID']) return;
      
      // Each row represents a product at a specific location
      const locationId = row['Location ID'];
      
      // Add location data
      let location = {
        locationId: locationId,
        onHand: parseInt(row['On Hand'] || '0'),
        threshold: parseInt(row['Threshold'] || '5'),
        incoming: parseInt(row['Incoming'] || '0'),
        incomingDate: row['Incoming Date'] || ''
      };
      
      // Add location to product
      productMap.get(key).locations.push(location);
    });
    
    // Convert product map to array
    const inventoryData = Array.from(productMap.values()).map(product => {
      // Ensure both locations exist for each product
      const elMonte = product.locations.find(loc => loc.locationId === 'gid://shopify/Location/68455891180');
      const whittier = product.locations.find(loc => loc.locationId === 'gid://shopify/Location/71820017900');
      
      // Create default locations if they don't exist
      const locations = [];
      
      if (elMonte) {
        locations.push(elMonte);
      } else {
        locations.push({
          locationId: 'gid://shopify/Location/68455891180',
          onHand: 0,
          threshold: 5,
          incoming: 0,
          incomingDate: ''
        });
      }
      
      if (whittier) {
        locations.push(whittier);
      } else {
        locations.push({
          locationId: 'gid://shopify/Location/71820017900',
          onHand: 0,
          threshold: 5,
          incoming: 0,
          incomingDate: ''
        });
      }
      
      // Replace locations with standardized version
      product.locations = locations;
      return product;
    });
    
    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }
    
    // Write the data to inventory.json
    fs.writeFileSync(
      path.join(dataDir, 'inventory.json'),
      JSON.stringify(inventoryData, null, 2)
    );
    
    console.log(`Successfully created inventory.json with ${inventoryData.length} products!`);
  } catch (error) {
    console.error('Error fixing inventory data:', error);
  }
}

// Run the function
fixInventoryData(); 