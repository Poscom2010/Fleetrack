# FleetTrack

Multi-tenant fleet management platform supporting traditional fleets (taxi, courier) and commodity operations (fuel/gas trucking).

## Tech Stack
- **Frontend:** React 19, Vite, TailwindCSS, Recharts
- **Backend:** Firebase Auth, Firestore
- **Hosting:** Vercel

## Quick Start
```bash
npm install
npm run dev
```

## Business Types
| Type | Features |
|------|----------|
| **Traditional** | Vehicle tracking, trip logbook, daily entries, expenses |
| **Commodity** | Load/offload events, tank reconciliation, invoicing, multi-customer deliveries |
| **Hybrid** | Both traditional fleet + commodity operations |

## User Roles
- **System Admin** - Platform management
- **Company Admin** - Full company control
- **Manager** - Analytics, team oversight
- **Driver** - Trip logging, assigned vehicle

## Key Features
- Multi-tenant data isolation
- Role-based access control
- Real-time analytics dashboards
- Mobile-responsive UI
- Dark/light theme support
- Invoice generation & payment tracking
- Tank discrepancy alerts
- Mileage gap detection

## Project Structure
```
src/
├── components/     # UI components
├── pages/          # Route pages
├── services/       # Firebase & business logic
├── hooks/          # Custom React hooks
└── contexts/       # React contexts
```

## Deployment
```bash
npm run build
# Deploy to Vercel or run: vercel --prod
```

## Firebase Rules
```bash
firebase deploy --only firestore:rules
```

---
Built with React + Firebase | [@poscom2010](https://github.com/poscom2010)
