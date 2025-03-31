const fs = require('fs');
const path = require('path');
const { GoogleSpreadsheet } = require('google-spreadsheet');

async function fetchInventory() {
  try {
    // Parse credentials
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    const sheetId = process.env.SHEET_ID;
    const sheetName = process.env.SHEET_NAME || '';
    
    // Initialize the Google Sheet
    const doc = new GoogleSpreadsheet(sheetId);
    await doc.useServiceAccountAuth(credentials);
    await doc.loadInfo();
    
    // Get the specified sheet by name, or fall back to the first sheet
    let sheet;
    if (sheetName && doc.sheetsByTitle[sheetName]) {
      sheet = doc.sheetsByTitle[sheetName];
      console.log(`Using specified sheet: "${sheetName}"`);
    } else {
      sheet = doc.sheetsByIndex[0];
      console.log(`Using first sheet: "${sheet.title}"`);
    }
    
    await sheet.loadCells();
    const rows = await sheet.getRows();
    
    // Transform the data to the format your dashboard expects
    const inventoryData = rows.map(row => ({
      sku: row.SKU || '',
      productTitle: row.Title || '',
      productType: row.Type || '',
      variantTitle: row.Variant || '',
      imageUrl: row.ImageURL || '',
      locations: [
        {
          locationId: 'gid://shopify/Location/68455891180', // El Monte
          onHand: parseInt(row.ElMonteStock || '0'),
          threshold: parseInt(row.ElMonteThreshold || '5'),
          incoming: parseInt(row.ElMonteIncoming || '0'),
          incomingDate: row.ElMonteIncomingDate || ''
        },
        {
          locationId: 'gid://shopify/Location/71820017900', // Whittier
          onHand: parseInt(row.WhittierStock || '0'),
          threshold: parseInt(row.WhittierThreshold || '5'),
          incoming: parseInt(row.WhittierIncoming || '0'),
          incomingDate: row.WhittierIncomingDate || ''
        }
      ]
    }));

    // Create data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }
    
    // Write the data to a JSON file
    fs.writeFileSync(
      path.join(dataDir, 'inventory.json'),
      JSON.stringify(inventoryData, null, 2)
    );
    
    console.log(`Inventory data updated successfully with ${inventoryData.length} products!`);
  } catch (error) {
    console.error('Error fetching inventory data:', error);
    process.exit(1);
  }
}

fetchInventory(); 