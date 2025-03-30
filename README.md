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