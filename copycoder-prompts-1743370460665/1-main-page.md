Set up the frontend according to the following prompt:
  <frontend-prompt>
  Create detailed components with these requirements:
  1. Use 'use client' directive for client-side components
  2. Make sure to concatenate strings correctly using backslash
  3. Style with Tailwind CSS utility classes for responsive design
  4. Use Lucide React for icons (from lucide-react package). Do NOT use other UI libraries unless requested
  5. Use stock photos from picsum.photos where appropriate, only valid URLs you know exist
  6. Configure next.config.js image remotePatterns to enable stock photos from picsum.photos
  7. Create root layout.tsx page that wraps necessary navigation items to all pages
  8. MUST implement the navigation elements items in their rightful place i.e. Left sidebar, Top header
  9. Accurately implement necessary grid layouts
  10. Follow proper import practices:
     - Use @/ path aliases
     - Keep component imports organized
     - Update current src/app/page.tsx with new comprehensive code
     - Don't forget root route (page.tsx) handling
     - You MUST complete the entire prompt before stopping
  </frontend-prompt>

  <summary_title>
Inventory Management Dashboard with Multi-Location Stock Tracking
</summary_title>

<image_analysis>
1. Navigation Elements:
- Primary navigation: Inventory Overview, El Monte Inventory, Whittier Inventory, Low Stock Items
- Header contains "Inventory Overview" title (left) and "Refresh Data" button (right)
- Navigation height appears to be 60px
- Clean, minimal navigation design with white text on dark background

2. Layout Components:
- Main metrics container: ~200px height, displays 4 key metrics
- Search/filter bar: ~60px height with multiple input fields
- Product grid: 2x4 layout of inventory cards
- Cards dimensions approximately 400px x 300px
- Consistent 20px padding between elements

3. Content Sections:
- Key metrics display: Total Products (105), El Monte (1695), Whittier (328), Low Stock (46)
- Filter section with:
  * Product Type dropdown
  * SKU search field
  * Product Title search
  * Stock Level dropdown
  * Apply/Clear Filters buttons
- Product cards showing inventory levels with cylindrical visualizations

4. Interactive Controls:
- Dropdown menus: Product Type, Stock Level
- Search fields: SKU, Product Title
- Action buttons: Apply Filters, Clear Filters, Refresh Data
- Inventory cards with threshold indicators

5. Colors:
- Background: #1E1E1E (dark gray)
- Primary text: #FFFFFF
- Accent blue: #4169E1
- Warning indicators: #FFA500
- Success green: #00FF00
- Card borders: Various colors indicating status

6. Grid/Layout Structure:
- Main container: 100% width
- 2-column layout for metrics
- 4-column grid for product cards
- Responsive breakpoints at 1200px, 992px, 768px
</image_analysis>

<development_planning>
1. Project Structure:
```
src/
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Navigation.tsx
│   │   └── MetricsDisplay.tsx
│   ├── features/
│   │   ├── InventoryCard.tsx
│   │   ├── FilterBar.tsx
│   │   └── StockVisualization.tsx
│   └── shared/
├── assets/
├── styles/
├── hooks/
└── utils/
```

2. Key Features:
- Real-time inventory tracking
- Multi-location stock management
- Threshold monitoring
- Search and filtering system
- Data refresh functionality

3. State Management:
```typescript
interface AppState {
  inventory: {
    products: Product[]
    filters: FilterState
    loading: boolean
    error: Error | null
  }
  locations: {
    elMonte: LocationData
    whittier: LocationData
  }
  ui: {
    activeTab: string
    searchQuery: string
    filterSettings: FilterSettings
  }
}
```

4. Component Architecture:
- InventoryDashboard (parent)
  ├── MetricsDisplay
  ├── FilterBar
  ├── InventoryGrid
  └── InventoryCard

5. Responsive Breakpoints:
```scss
$breakpoints: (
  'desktop': 1200px,
  'tablet-landscape': 992px,
  'tablet': 768px,
  'mobile': 576px
);
```
</development_planning>