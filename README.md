# GridLocked — NHAI Traffic Command & Intelligence Platform

> **Predict · Plan · Prevent** — GridLock 2.0 Event-Driven Congestion Forecasting Challenge

A national-scale traffic intelligence platform built for NHAI command centers, featuring real-time event monitoring, AI-powered congestion forecasting, resource deployment optimization, and diversion planning.

---

## 🚀 Quick Start

### Option 1: One-click launch (Windows)
```batch
# Run from the project root:
start.bat
```

### Option 2: Manual setup

**Step 1 — Copy dataset**
```powershell
New-Item -ItemType Directory -Force frontend\public\data
Copy-Item "events_dashboard_ready 1.csv" frontend\public\data\events.csv
```

**Step 2 — Install frontend**
```bash
cd frontend
npm install --legacy-peer-deps
```

**Step 3 — Start frontend**
```bash
npm run dev
# → http://localhost:3000
```

**Step 4 — Start backend (optional)**
```bash
cd backend
pip install -r requirements.txt
python main.py
# → http://localhost:8000
```

---

## 📁 Project Structure

```
GridLocked/
├── frontend/                    # Next.js 14 App Router
│   ├── app/
│   │   ├── page.tsx             # Command Center (main dashboard)
│   │   ├── events/page.tsx      # Event Dashboard (filterable table)
│   │   ├── forecast/page.tsx    # Forecast Engine (charts + live forecast)
│   │   ├── resources/page.tsx   # Resource Planner (deployment gaps)
│   │   ├── diversions/page.tsx  # Diversion Planner
│   │   ├── monitor/page.tsx     # Live Monitor (real-time feed)
│   │   ├── historical/page.tsx  # Historical Intelligence (6 charts)
│   │   ├── learning/page.tsx    # Post Event Learning
│   │   ├── copilot/page.tsx     # AI Copilot workspace
│   │   ├── reports/page.tsx     # Report generator
│   │   └── settings/page.tsx    # Platform settings
│   ├── components/
│   │   ├── layout/              # Sidebar, TopHeader
│   │   ├── map/                 # MapplsMap (SDK abstraction + canvas fallback)
│   │   ├── dashboard/           # IntelligencePanel
│   │   ├── ui/                  # KPICard, etc.
│   │   └── providers/           # ThemeProvider, DataLoader
│   ├── lib/
│   │   ├── dataEngine.ts        # CSV parsing + analytics engine
│   │   ├── store.ts             # Zustand global state
│   │   └── utils.ts             # Helper utilities
│   ├── types/index.ts           # TypeScript definitions
│   └── public/data/events.csv   # Dataset (auto-copied)
├── backend/
│   └── main.py                  # FastAPI backend (5 services)
├── events_dashboard_ready 1.csv # Source dataset (8,206 events)
├── start.bat                    # One-click launch
└── setup.ps1                    # PowerShell setup script
```

---

## 🗺️ Mappls SDK Integration

The platform uses a **full abstraction layer** for the Mappls map:

1. **With API Key**: Live interactive Mappls map with event markers, heatmaps, and route overlays
2. **Without API Key**: Canvas-based simulation rendering all events on a Bengaluru city grid

**To enable live map:**
1. Get your key at [auth.mappls.com/console](https://auth.mappls.com/console)
2. Go to **Settings** in the platform and enter your API key, OR
3. Create `frontend/.env.local` with:
   ```
   NEXT_PUBLIC_MAPPLS_API_KEY=your_key_here
   ```

---

## 📊 Dataset Fields

| Field | Description |
|-------|-------------|
| `id` | Unique event ID (FKID format) |
| `event_type` | `planned` or `unplanned` |
| `event_cause` | vehicle_breakdown, accident, tree_fall, water_logging, congestion, pot_holes, construction, public_event, road_conditions, others |
| `congestion_risk_score` | 0–100 computed risk score |
| `congestion_label` | Low/Moderate/High Impact, Severe Congestion |
| `recommended_police` | Officers to deploy |
| `recommended_barricades` | Barricades needed |
| `diversion_required` | YES/NO |
| `decision_priority` | LOW/MEDIUM/HIGH/URGENT |
| `is_hotspot` | 1 if recurring incident location |
| `is_peak_hour` | 1 if event during peak traffic window |

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 App Router + TypeScript |
| Styling | Tailwind CSS + Custom Design System |
| Charts | Apache ECharts (echarts-for-react) |
| Map | Mappls SDK (with canvas fallback) |
| Animation | Framer Motion |
| State | Zustand |
| CSV Parsing | PapaParse |
| Backend | FastAPI + Python |
| Data Engine | Pandas + NumPy + scikit-learn |

---

## 🎨 Design System

- **Background**: `#07111F` (deep navy)  
- **Traffic Blue**: `#0F3D66`  
- **Signal Green**: `#22C55E`  
- **Amber Warning**: `#F59E0B`  
- **Traffic Red**: `#EF4444`  
- **Accent Cyan**: `#06B6D4`  
- **Typography**: IBM Plex Sans + IBM Plex Mono  

---

*GridLocked v2.0 — Built for GridLock 2.0 Challenge*
