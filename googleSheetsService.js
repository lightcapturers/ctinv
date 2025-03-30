const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Configuration
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const SPREADSHEET_ID = '1tnhq9slBEB6bXgKka-CPfyRYwLqZP7RmS8cgEXZS3kE';
const SHEET_NAME = 'Shift Knobs';

/**
 * Authenticate with Google Sheets API using service account credentials
 * @returns {Promise<google.auth.JWT>} Authenticated JWT client
 */
async function authorize() {
  try {
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    const auth = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      SCOPES
    );
    
    // Verify authentication works
    await auth.authorize();
    console.log('Google Sheets API authentication successful');
    return auth;
  } catch (error) {
    console.error('Error authenticating with Google Sheets API:', error);
    throw error;
  }
}

/**
 * Fetch data from Google Sheets
 * @returns {Promise<Array>} Array of inventory data
 */
async function fetchInventoryData() {
  try {
    const auth = await authorize();
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Get sheet data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_NAME
    });
    
    const rows = response.data.values;
    
    if (!rows || rows.length === 0) {
      console.log('No data found in the spreadsheet.');
      return [];
    }
    
    // Convert rows to objects with headers as keys (first row contains headers)
    const headers = rows[0];
    const data = rows.slice(1).map(row => {
      const item = {};
      headers.forEach((header, index) => {
        item[header] = row[index] || '';
      });
      return item;
    });
    
    console.log(`Fetched ${data.length} rows from Google Sheets`);
    return data;
  } catch (error) {
    console.error('Error fetching data from Google Sheets:', error);
    throw error;
  }
}

/**
 * Test connection to Google Sheets API
 */
async function testConnection() {
  try {
    await authorize();
    console.log('Connection to Google Sheets API successful');
  } catch (error) {
    console.error('Error connecting to Google Sheets API:', error);
  }
}

module.exports = {
  fetchInventoryData,
  testConnection
}; 