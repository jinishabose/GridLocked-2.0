"""
GridLocked FastAPI Backend
Developed By: Code Crumbles
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import pandas as pd
import numpy as np
from pathlib import Path
import json
import os

# ─── Data Store ─────────────────────────────────────────────────────────────
DATA_PATH = Path(__file__).parent.parent / "events_dashboard_ready 1.csv"
_df: pd.DataFrame | None = None


def load_data():
    global _df
    if DATA_PATH.exists():
        _df = pd.read_csv(DATA_PATH, low_memory=False)
        # Ensure numeric columns
        for col in ["congestion_risk_score", "recommended_police", "recommended_barricades",
                    "duration_hours", "event_hour", "event_month", "event_day", "is_weekend",
                    "is_peak_hour", "is_hotspot", "road_closure_flag", "impact_radius_m"]:
            if col in _df.columns:
                _df[col] = pd.to_numeric(_df[col], errors="coerce").fillna(0)
        print(f"✓ Loaded {len(_df)} events from dataset")
    else:
        print(f"⚠ Dataset not found at {DATA_PATH}")
        _df = pd.DataFrame()


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_data()
    yield


# ─── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="GridLocked API",
    description="GridLocked Traffic Intelligence Platform developed by Code Crumbles",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def df() -> pd.DataFrame:
    if _df is None or _df.empty:
        raise HTTPException(status_code=503, detail="Dataset not loaded")
    return _df


# ─── Routes ──────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"platform": "GridLocked", "version": "2.0.0", "tagline": "Predict · Plan · Prevent"}


@app.get("/api/health")
def health():
    return {"status": "healthy", "events_loaded": len(_df) if _df is not None else 0}


# ── Events ──────────────────────────────────────────────────────────────────
@app.get("/api/events")
def get_events(
    status: str = Query("all"),
    event_type: str = Query("all"),
    corridor: str = Query("all"),
    risk_level: str = Query("all"),
    cause: str = Query("all"),
    limit: int = Query(500, le=5000),
    offset: int = Query(0),
):
    data = df().copy()

    if status != "all":
        data = data[data["status"] == status]
    if event_type != "all":
        data = data[data["event_type"] == event_type]
    if corridor != "all":
        data = data[data["corridor"] == corridor]
    if cause != "all":
        data = data[data["event_cause"] == cause]
    if risk_level != "all":
        label_map = {
            "Critical": "Severe Congestion", "High": "High Impact",
            "Medium": "Moderate Impact", "Low": "Low Impact",
        }
        if risk_level in label_map:
            data = data[data["congestion_label"] == label_map[risk_level]]

    total = len(data)
    data = data.iloc[offset : offset + limit]
    data = data.replace({np.nan: None})
    return {"total": total, "events": data.to_dict(orient="records")}


@app.get("/api/events/{event_id}")
def get_event(event_id: str):
    data = df()
    row = data[data["id"] == event_id]
    if row.empty:
        raise HTTPException(status_code=404, detail="Event not found")
    return row.replace({np.nan: None}).to_dict(orient="records")[0]


# ── KPIs ─────────────────────────────────────────────────────────────────────
@app.get("/api/kpis")
def get_kpis(status: str = Query("all")):
    data = df()
    active = data[data["status"] == "active"]
    high_risk = data[data["congestion_label"].isin(["High Impact", "Severe Congestion"])]
    closures = data[(data["requires_road_closure"] == True) | (data["road_closure_flag"] == 1)]
    diversions = data[data["diversion_required"] == "YES"]
    corridors = data[data["corridor"] != "Non-corridor"]["corridor"].nunique()

    avg_congestion = active["congestion_risk_score"].mean() if not active.empty else data["congestion_risk_score"].mean()

    return {
        "activeEvents": int(len(active)),
        "highRiskEvents": int(len(high_risk)),
        "predictedCongestionScore": round(float(avg_congestion), 1) if not np.isnan(avg_congestion) else 0,
        "affectedCorridors": int(corridors),
        "recommendedOfficers": int(active["recommended_police"].sum()),
        "roadClosures": int(len(closures)),
        "totalEvents": int(len(data)),
        "criticalEvents": int(len(data[data["congestion_label"] == "Severe Congestion"])),
        "plannedEvents": int(len(data[data["event_type"] == "planned"])),
        "unplannedEvents": int(len(data[data["event_type"] == "unplanned"])),
        "hotspots": int(data["is_hotspot"].sum()),
        "diversionsRequired": int(len(diversions)),
    }


# ── Analytics ─────────────────────────────────────────────────────────────────
@app.get("/api/analytics/corridors")
def get_corridor_analytics():
    data = df()
    grouped = data.groupby("corridor").agg(
        eventCount=("id", "count"),
        avgCongestion=("congestion_risk_score", "mean"),
        maxCongestion=("congestion_risk_score", "max"),
        activeEvents=("status", lambda x: (x == "active").sum()),
        requiredPolice=("recommended_police", "sum"),
        requiredBarricades=("recommended_barricades", "sum"),
    ).reset_index()
    grouped = grouped[grouped["corridor"] != "Non-corridor"]
    grouped = grouped.sort_values("avgCongestion", ascending=False)
    grouped = grouped.replace({np.nan: 0})
    return grouped.to_dict(orient="records")


@app.get("/api/analytics/hourly")
def get_hourly_analytics():
    data = df()
    grouped = data.groupby("event_hour").agg(
        eventCount=("id", "count"),
        avgCongestion=("congestion_risk_score", "mean"),
        peakCongestion=("congestion_risk_score", "max"),
    ).reset_index()
    grouped = grouped.replace({np.nan: 0})
    return grouped.to_dict(orient="records")


@app.get("/api/analytics/causes")
def get_cause_analytics():
    data = df()
    grouped = data.groupby("event_cause").agg(
        count=("id", "count"),
        avgCongestion=("congestion_risk_score", "mean"),
        avgPolice=("recommended_police", "mean"),
        avgDuration=("duration_hours", "mean"),
    ).reset_index()
    grouped = grouped.sort_values("count", ascending=False)
    grouped = grouped.replace({np.nan: 0})
    return grouped.to_dict(orient="records")


@app.get("/api/analytics/monthly")
def get_monthly_analytics():
    data = df()
    data["month_key"] = data["event_year"].astype(str) + "-" + data["event_month"].astype(str).str.zfill(2)
    grouped = data.groupby("month_key").agg(
        eventCount=("id", "count"),
        avgCongestion=("congestion_risk_score", "mean"),
        closures=("road_closure_flag", "sum"),
    ).reset_index()
    grouped = grouped.sort_values("month_key")
    grouped = grouped.replace({np.nan: 0})
    return grouped.to_dict(orient="records")


# ── Forecast ──────────────────────────────────────────────────────────────────
@app.post("/api/forecast")
def run_forecast(payload: dict):
    cause = payload.get("cause", "vehicle_breakdown")
    hour = int(payload.get("hour", 12))
    corridor = payload.get("corridor", "")

    data = df()
    similar = data[data["event_cause"] == cause]
    if not similar.empty:
        base_score = similar["congestion_risk_score"].mean()
    else:
        base_score = 50.0

    # Peak hour multiplier
    is_peak = (7 <= hour <= 10) or (17 <= hour <= 20)
    if is_peak:
        base_score = min(100, base_score * 1.2)

    risk = "Critical" if base_score >= 75 else "High" if base_score >= 60 else "Medium" if base_score >= 45 else "Low"

    return {
        "congestionScore": round(float(base_score), 1),
        "riskLevel": risk,
        "expectedDelay": int(base_score * 1.5),
        "recommendedPolice": int(np.ceil(base_score / 10)),
        "recommendedBarricades": int(np.ceil(base_score / 15)),
        "diversionRequired": base_score >= 60,
        "confidence": 88,
        "reasoning": [
            f"Historical average for {cause}: {round(float(similar['congestion_risk_score'].mean()), 1) if not similar.empty else 'N/A'}",
            f"Peak hour multiplier applied: {is_peak}",
            f"Corridor context: {corridor}",
        ],
    }


# ── Agent / AI Insights ───────────────────────────────────────────────────────
@app.get("/api/agent/insights")
def get_insights():
    data = df()
    insights = []

    # Peak hour concentration
    peak = data[data["is_peak_hour"] == 1]
    peak_pct = round(len(peak) / max(len(data), 1) * 100, 1)
    insights.append({
        "id": "peak-hour",
        "category": "pattern",
        "title": f"{peak_pct}% Events in Peak Hours",
        "description": f"Peak hour events show {round(peak['congestion_risk_score'].mean(), 1)} avg congestion vs {round(data['congestion_risk_score'].mean(), 1)} overall.",
        "confidence": 94,
        "impact": "high",
        "recommendedAction": "Pre-position officers 30 min before peak windows.",
        "dataPoints": int(len(peak)),
    })

    # Top corridor
    corridor_groups = data[data["corridor"] != "Non-corridor"].groupby("corridor")["congestion_risk_score"].mean()
    if not corridor_groups.empty:
        top = corridor_groups.idxmax()
        insights.append({
            "id": "top-corridor",
            "category": "risk",
            "title": f"{top} — Highest Risk Corridor",
            "description": f"Average congestion: {round(float(corridor_groups[top]), 1)}",
            "confidence": 91,
            "impact": "critical",
            "recommendedAction": f"Deploy maximum resources to {top} immediately.",
            "dataPoints": int(len(data[data["corridor"] == top])),
        })

    # Breakdown dominance
    bd = data[data["event_cause"] == "vehicle_breakdown"]
    bd_pct = round(len(bd) / max(len(data), 1) * 100, 1)
    insights.append({
        "id": "breakdown",
        "category": "policy",
        "title": f"Vehicle Breakdowns — {bd_pct}% of Incidents",
        "description": f"{len(bd)} breakdown events. Average resolution: {round(bd['duration_hours'].mean(), 1)}h.",
        "confidence": 96,
        "impact": "high",
        "recommendedAction": "Mandate pre-trip inspection and deploy additional tow trucks.",
        "dataPoints": int(len(bd)),
    })

    return {"insights": insights}


@app.get("/api/agent/summary")
def get_executive_summary():
    data = df()
    active = data[data["status"] == "active"]
    top_corridor = data[data["corridor"] != "Non-corridor"].groupby("corridor")["congestion_risk_score"].mean().idxmax() if not data.empty else "N/A"

    return {
        "summary": f"""GRIDLOCKED EXECUTIVE INTELLIGENCE BRIEF
Generated: {pd.Timestamp.now().strftime('%d %b %Y %H:%M IST')}

OPERATIONAL STATUS
Total Events: {len(data):,}
Active Incidents: {len(active):,}
Critical Events: {len(data[data['congestion_label'] == 'Severe Congestion']):,}

TOP RISK CORRIDOR: {top_corridor}
RECOMMENDED DEPLOYMENT: {int(active['recommended_police'].sum())} officers
DIVERSIONS REQUIRED: {len(data[data['diversion_required'] == 'YES']):,}

LEADING INCIDENT CAUSE: {data['event_cause'].value_counts().idxmax() if not data.empty else 'N/A'}
""",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
