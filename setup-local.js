const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Function to extract credentials from .env and create credentials.json
function setupLocalEnvironment() {
  console.log('Setting up local environment...');
  
  // 1. Check and create data directory if it doesn't exist
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    console.log('Creating data directory...');
    fs.mkdirSync(dataDir);
  }
  
  // 2. Create empty inventory.json if it doesn't exist
  const inventoryJsonPath = path.join(dataDir, 'inventory.json');
  if (!fs.existsSync(inventoryJsonPath)) {
    console.log('Creating empty inventory.json file...');
    fs.writeFileSync(inventoryJsonPath, '[]');
  }
  
  // 3. Check if GOOGLE_CREDENTIALS exists in .env
  if (!process.env.GOOGLE_CREDENTIALS) {
    console.error('Error: GOOGLE_CREDENTIALS not found in .env file.');
    console.log('Please add your Google API credentials to the .env file.');
    process.exit(1);
  }
  
  try {
    // 4. Parse credentials to validate JSON
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    
    // Check if we have placeholder credentials
    if (credentials.project_id === 'your-project-id') {
      console.warn('Warning: You are using placeholder credentials in .env file.');
      console.warn('Please replace with your actual Google service account credentials.');
    }
    
    // 5. Write credentials to credentials.json
    fs.writeFileSync(
      path.join(__dirname, 'credentials.json'),
      JSON.stringify(credentials, null, 2)
    );
    
    console.log('Successfully created credentials.json file!');
    console.log('You can now run the local server using: node server.js');
  } catch (error) {
    console.error('Error setting up credentials:', error);
    console.log('Please check that GOOGLE_CREDENTIALS in .env contains valid JSON.');
    process.exit(1);
  }
}

// Run setup
setupLocalEnvironment(); 