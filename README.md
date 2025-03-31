# Inventory Dashboard

A beautiful dark-themed inventory dashboard for tracking stock levels across multiple locations.

## Features

- **Dark Theme**: Modern sleek dark UI for comfortable viewing
- **Interactive 3D Visualization**: Cylindrical 3D bar charts showing inventory levels
- **Multi-Location Tracking**: View inventory levels for El Monte and Whittier locations
- **Color-Coded Indicators**: Red, yellow, and green indicators based on threshold levels
- **Incoming Stock Display**: Blue section shows upcoming inventory with date information
- **Filtering Options**: Filter by product type, SKU, product title, or stock level
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Setup and Running

### Prerequisites

- Node.js (v14 or higher)

### Running the Application

1. Clone or download this repository
2. Navigate to the project directory
3. Run the server:

```bash
node server.js
```

4. Open your browser and go to `http://localhost:3000`

## Using the Dashboard

- **Navigation**: Use the sidebar to navigate between different views
- **Filtering**: Use the filter controls to narrow down the product list
- **Inventory Visualization**: 
  - Cylinders show current stock levels relative to thresholds
  - Red = Low stock (< 20% of threshold)
  - Yellow = Medium stock (20-50% of threshold)
  - Green = Good stock (> 50% of threshold)
  - Blue = Incoming stock (hover to see delivery date)
- **Refresh Data**: Click the refresh button to reload the latest data

## Planned Future Enhancements

- Google Sheets API integration for live data updates
- Export functionality for reports
- Advanced filtering and sorting options
- User authentication and role-based access control
- Dark/Light theme toggle

## Technical Information

- Built with HTML, CSS, JavaScript
- Uses Three.js for 3D visualizations
- CSV data handling with future Google Sheets API integration

## Setup Instructions

### 1. Set Up GitHub Secrets

For the automated data fetching to work, you need to add three secrets to your GitHub repository:

1. Go to your GitHub repository → Settings → Secrets and variables → Actions
2. Add three repository secrets:
   - `GOOGLE_CREDENTIALS`: Paste the entire content of your credentials.json file
   - `SHEET_ID`: Your Google Sheet ID (from the URL of your sheet)
   - `SHEET_NAME`: The name of the specific sheet/tab in your Google Spreadsheet (e.g., "Inventory")

### 2. Enable GitHub Pages

1. Go to your GitHub repository → Settings → Pages
2. Set source to "Deploy from a branch"
3. Select "main" branch and "/" (root) folder
4. Click "Save"

### 3. Run the Workflow Manually (Optional)

1. Go to your GitHub repository → Actions → "Update Inventory Data" workflow
2. Click "Run workflow" to manually fetch data the first time

## How It Works

1. GitHub Actions runs every 2 hours to fetch inventory data from Google Sheets
2. The data is saved as a static JSON file in the `data` directory
3. Your dashboard loads this JSON file to display the inventory information

## Updating Inventory Data

Simply update your Google Sheet, and within 2 hours the changes will automatically appear on the dashboard.

## Local Development

1. Clone the repository
2. Open index.html in your browser
3. For local data updates, run the fetch script manually:
   ```
   npm install google-spreadsheet
   GOOGLE_CREDENTIALS='...' SHEET_ID='your-sheet-id' SHEET_NAME='Your Sheet Name' node .github/scripts/fetch-inventory.js
   ``` 