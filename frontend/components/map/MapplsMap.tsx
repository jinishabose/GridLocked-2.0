'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Layers, ZoomIn, ZoomOut, Crosshair } from 'lucide-react';
import { useGridLockedStore } from '@/lib/store';
import { getMarkerColorHex, truncateAddress } from '@/lib/utils';
import type { TrafficEvent } from '@/types';

// Mappls SDK abstraction layer
// Set NEXT_PUBLIC_MAPPLS_API_KEY in .env.local to enable live map
// Falls back to canvas-based simulation when key is not provided

interface MapplsMapProps {
  height?: string;
  customEvents?: TrafficEvent[];
}

// Bengaluru center coordinates
const CENTER = { lat: 12.9716, lng: 77.5946 };

export function MapplsMap({ height = '100%', customEvents }: MapplsMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [usingCanvas, setUsingCanvas] = useState(false);
  const { filteredEvents, mapLayers, settings, isLoading, selectedEvent, selectEvent } = useGridLockedStore();


  const apiKey = settings.mapplsApiKey || process.env.NEXT_PUBLIC_MAPPLS_API_KEY || '';

  // --- Try Mappls SDK ---
  useEffect(() => {
    console.log("[MapplsMap] Checking API Key config. Detection state:", apiKey ? "KEY_FOUND" : "KEY_MISSING");
    if (!apiKey) {
      console.warn("[MapplsMap] No API Key provided. Defaulting to Canvas Vector grid simulation.");
      setUsingCanvas(true);
      return;
    }

    console.log("[MapplsMap] Injecting Mappls SDK script tag...");
    const script = document.createElement('script');
    script.src = `https://apis.mappls.com/advancedmaps/v1/${apiKey}/map_load?v=1.5&layer=vector&callback=initGridLockedMap`;
    script.async = true;

    (window as any).initGridLockedMap = () => {
      console.log("[MapplsMap] callback 'initGridLockedMap' fired. SDK successfully loaded on window. mappls available:", typeof (window as any).mappls !== 'undefined');
      setSdkLoaded(true);
    };

    script.onerror = (err) => {
      console.error("[MapplsMap] Mappls script load failed. Reverting to Canvas mode:", err);
      setUsingCanvas(true);
    };

    document.head.appendChild(script);

    return () => {
      try {
        document.head.removeChild(script);
      } catch (e) { }
      delete (window as any).initGridLockedMap;
    };
  }, [apiKey]);

  // --- Initialize Mappls Map ---
  useEffect(() => {
    if (!sdkLoaded || !mapContainerRef.current || mapRef.current) return;
    const M = (window as any).mappls;
    if (!M) {
      console.warn("[MapplsMap] window.mappls undefined. Cannot init.");
      return;
    }

    console.log("[MapplsMap] Initializing Mappls Map. window.mappls structure:", Object.keys(M));
    const container = document.getElementById('gridlocked-map');
    if (!container) {
      console.error("[MapplsMap] Map container '#gridlocked-map' not found in DOM.");
      setUsingCanvas(true);
      return;
    }

    const rect = container.getBoundingClientRect();
    console.log(`[MapplsMap] Map container dimensions: ${rect.width}px x ${rect.height}px`);

    try {
      console.log("[MapplsMap] Initializing Mappls Map using id + params constructor...");

      mapRef.current = new M.Map(
        "gridlocked-map",
        {
          center: [CENTER.lat, CENTER.lng],
          zoom: 11,
        }
      );

      console.log("[MapplsMap] Mappls Map successfully initialized!");
    } catch (err: any) {
      console.error(
        "[MapplsMap] Critical error during Map initialization:",
        err
      );
      setUsingCanvas(true);
    }
  }, [sdkLoaded]);

  // --- Region Centers & Offsets ---
  const REGION_CENTERS: Record<string, { lat: number; lng: number; zoom: number }> = React.useMemo(() => ({
    'Bengaluru': { lat: 12.9716, lng: 77.5946, zoom: 11 },
    'Delhi NCR': { lat: 28.6139, lng: 77.2090, zoom: 10 },
    'Mumbai': { lat: 19.0760, lng: 72.8777, zoom: 10 },
    'Hyderabad': { lat: 17.3850, lng: 78.4867, zoom: 11 },
    'Chennai': { lat: 13.0827, lng: 80.2707, zoom: 11 },
    'All India': { lat: 20.5937, lng: 78.9629, zoom: 5 },
  }), []);

  // Center/Zoom region fly-to effect
  useEffect(() => {
    if (!mapRef.current) return;
    const center = REGION_CENTERS[settings.region] || REGION_CENTERS['Bengaluru'];
    try {
      if (typeof mapRef.current.setCenter === 'function') {
        mapRef.current.setCenter([center.lat, center.lng]);
      }
      if (typeof mapRef.current.setZoom === 'function') {
        mapRef.current.setZoom(center.zoom);
      }
    } catch (e) {
      console.warn("[MapplsMap] Failed to set region center/zoom:", e);
    }
  }, [settings.region, REGION_CENTERS]);

  // Center/Zoom on selected event effect
  useEffect(() => {
    if (!selectedEvent || !selectedEvent.latitude || !selectedEvent.longitude) return;
    let lat = selectedEvent.latitude;
    let lng = selectedEvent.longitude;

    if (settings.region !== 'Bengaluru' && settings.region !== 'All India') {
      const center = REGION_CENTERS[settings.region] || REGION_CENTERS['Bengaluru'];
      const bCenter = REGION_CENTERS['Bengaluru'];
      lat += (center.lat - bCenter.lat);
      lng += (center.lng - bCenter.lng);
    }

    try {
      if (mapRef.current) {
        if (typeof mapRef.current.setCenter === 'function') {
          mapRef.current.setCenter([lat, lng]);
        }
        if (typeof mapRef.current.setZoom === 'function') {
          mapRef.current.setZoom(14);
        }
      }
    } catch (e) {
      console.warn("[MapplsMap] Failed to center on selected event:", e);
    }
  }, [selectedEvent, settings.region, REGION_CENTERS]);

  // Project events coordinates around region center
  const eventsToRender = React.useMemo(() => {
    const raw = customEvents || filteredEvents;
    if (settings.region === 'Bengaluru' || settings.region === 'All India') {
      return raw;
    }
    const center = REGION_CENTERS[settings.region] || REGION_CENTERS['Bengaluru'];
    const bCenter = REGION_CENTERS['Bengaluru'];
    const latOffset = center.lat - bCenter.lat;
    const lngOffset = center.lng - bCenter.lng;
    return raw.map(ev => ({
      ...ev,
      latitude: ev.latitude + latOffset,
      longitude: ev.longitude + lngOffset,
      endlatitude: ev.endlatitude ? ev.endlatitude + latOffset : 0,
      endlongitude: ev.endlongitude ? ev.endlongitude + lngOffset : 0,
    }));
  }, [customEvents, filteredEvents, settings.region, REGION_CENTERS]);

  // --- Update Mappls Markers and Layers ---
  useEffect(() => {
    if (!sdkLoaded || !mapRef.current) return;

    const M = (window as any).mappls;
    const MapmyIndiaObj = (window as any).MapmyIndia;
    const LObj = (window as any).L;
    const MapboxObj = (window as any).mapboxgl;

    try {
      // Clear existing markers safely
      markersRef.current.forEach((m) => {
        try {
          if (m && typeof m.remove === "function") {
            m.remove();
          } else if (m && typeof m.setMap === "function") {
            m.setMap(null);
          }
        } catch (e) {
          console.warn("[MapplsMap] Error removing old marker:", e);
        }
      });
      markersRef.current = [];

      // Find enabled states for layer rendering
      const eventsEnabled = mapLayers.find((l) => l.id === 'events')?.enabled;
      const closuresEnabled = mapLayers.find((l) => l.id === 'closures')?.enabled;
      const policeEnabled = mapLayers.find((l) => l.id === 'police')?.enabled;
      const hotspotsEnabled = mapLayers.find((l) => l.id === 'hotspots')?.enabled;
      const diversionsEnabled = mapLayers.find((l) => l.id === 'diversions')?.enabled;

      // Dynamic Marker Creator Helper
      const createSingleMarker = (ev: TrafficEvent, htmlContent: string) => {
        const latLng = { lat: ev.latitude, lng: ev.longitude };
        const latLngArray = [ev.latitude, ev.longitude];

        // Strategy 1: new mappls.Marker
        if (M && typeof M.Marker === "function") {
          try {
            const marker = new M.Marker({
              map: mapRef.current,
              position: latLng,
              html: htmlContent
            });
            if (marker.addListener) {
              marker.addListener('click', () => selectEvent(ev));
            } else if (marker.on) {
              marker.on('click', () => selectEvent(ev));
            }
            return marker;
          } catch (err) {
            console.warn("[MapplsMap] new M.Marker failed, trying alternate constructors:", err);
          }
        }

        // Strategy 6: Mapbox GL custom Marker
        if (MapboxObj && typeof MapboxObj.Marker === "function") {
          try {
            const el = document.createElement('div');
            el.innerHTML = htmlContent;
            el.style.cursor = 'pointer';
            el.addEventListener('click', () => selectEvent(ev));
            const marker = new MapboxObj.Marker(el)
              .setLngLat([ev.longitude, ev.latitude])
              .addTo(mapRef.current);
            return marker;
          } catch (err) {
            console.warn("[MapplsMap] Mapbox GL Marker failed:", err);
          }
        }

        // Strategy 5: Leaflet L.marker (v1.5/v1.3 legacy Leaflet underlay)
        if (LObj && typeof LObj.marker === "function") {
          try {
            const customIcon = LObj.divIcon({
              html: htmlContent,
              className: '',
              iconSize: [14, 14],
              iconAnchor: [7, 7]
            });
            const marker = LObj.marker(latLngArray, { icon: customIcon });
            marker.addTo(mapRef.current);
            marker.on('click', () => selectEvent(ev));
            return marker;
          } catch (err) {
            console.warn("[MapplsMap] Leaflet L.marker failed:", err);
          }
        }

        return null;
      };

      // Loop and draw markers for active layers
      const visible = eventsToRender.slice(0, 1500);
      visible.forEach((ev) => {
        if (!ev.latitude || !ev.longitude) return;

        // 1. Event Locations
        if (eventsEnabled) {
          const color = getMarkerColorHex(ev.marker_color);
          const htmlContent = `<div style="width:10.5px;height:10.5px;border-radius:50%;background:${color};border:1.5px solid rgba(255,255,255,0.6);box-shadow:0 0 6px ${color}aa;cursor:pointer;"></div>`;
          const markerInstance = createSingleMarker(ev, htmlContent);
          if (markerInstance) markersRef.current.push(markerInstance);
        }

        // 2. Road Closures
        if (closuresEnabled && (ev.requires_road_closure || ev.road_closure_flag === 1 || ev.event_cause === 'road_closure')) {
          const htmlContent = `<div style="display:flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:#EF4444;border:1.5px solid white;box-shadow:0 0 8px rgba(239,68,68,0.75);color:white;font-size:11px;font-weight:bold;line-height:1;cursor:pointer;">⛔</div>`;
          const markerInstance = createSingleMarker(ev, htmlContent);
          if (markerInstance) markersRef.current.push(markerInstance);
        }

        // 3. Police Deployment
        if (policeEnabled && ev.recommended_police > 0) {
          const htmlContent = `<div style="display:flex;align-items:center;justify-content:center;padding:2px 5px;border-radius:10px;background:#3B82F6;border:1.5px solid white;box-shadow:0 0 8px rgba(59,130,246,0.7);color:white;font-size:9px;font-weight:bold;line-height:1;font-family:monospace;white-space:nowrap;cursor:pointer;">👮 ${ev.recommended_police}</div>`;
          const markerInstance = createSingleMarker(ev, htmlContent);
          if (markerInstance) markersRef.current.push(markerInstance);
        }

        // 4. Parking Hotspots
        if (hotspotsEnabled && ev.is_hotspot === 1) {
          const htmlContent = `<div style="display:flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:#F97316;border:1.5px solid white;box-shadow:0 0 8px rgba(249,115,22,0.75);font-size:11px;line-height:1;cursor:pointer;">🔥</div>`;
          const markerInstance = createSingleMarker(ev, htmlContent);
          if (markerInstance) markersRef.current.push(markerInstance);
        }

        // 5. Diversion Routes (detour node markers)
        if (diversionsEnabled && ev.diversion_required === 'YES') {
          const htmlContent = `<div style="display:flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:#10B981;border:1.5px solid white;box-shadow:0 0 8px rgba(16,185,129,0.75);font-size:11px;line-height:1;cursor:pointer;">↩️</div>`;
          const markerInstance = createSingleMarker(ev, htmlContent);
          if (markerInstance) markersRef.current.push(markerInstance);
        }
      });

      // Synchronize Vector Overlay Layers (Heatmap, Detour Lines, Event Zones)
      const map = mapRef.current;
      const syncLayers = () => {
        if (!map || typeof map.addSource !== 'function') return;

        try {
          const layersToRemove = ['heatmap-layer', 'event-zones-layer', 'diversion-layer'];
          const sourcesToRemove = ['heatmap-source', 'event-zones', 'diversion-lines'];

          layersToRemove.forEach(l => {
            if (map.getLayer(l)) map.removeLayer(l);
          });
          sourcesToRemove.forEach(s => {
            if (map.getSource(s)) map.removeSource(s);
          });

          // 1. Heatmap & Event Zones
          const congestionEnabled = mapLayers.find(l => l.id === 'congestion')?.enabled;
          if (congestionEnabled && eventsToRender.length > 0) {
            const geojson = {
              type: 'FeatureCollection',
              features: eventsToRender.map(ev => ({
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [ev.longitude, ev.latitude]
                },
                properties: {
                  congestion_risk_score: ev.congestion_risk_score,
                  color: getMarkerColorHex(ev.marker_color),
                  radius: ev.impact_radius_m || 600
                }
              }))
            };

            map.addSource('heatmap-source', { type: 'geojson', data: geojson });
            map.addLayer({
              id: 'heatmap-layer',
              type: 'heatmap',
              source: 'heatmap-source',
              maxzoom: 15,
              paint: {
                'heatmap-weight': ['interpolate', ['linear'], ['get', 'congestion_risk_score'], 0, 0, 100, 1],
                'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
                'heatmap-color': [
                  'interpolate', ['linear'], ['heatmap-density'],
                  0, 'rgba(6,182,212,0)',
                  0.2, 'rgba(6,182,212,0.2)',
                  0.4, 'rgba(245,158,11,0.4)',
                  0.6, 'rgba(249,115,22,0.6)',
                  0.8, 'rgba(239,68,68,0.8)'
                ],
                'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 5, 15, 30],
                'heatmap-opacity': 0.75
              }
            });

            // Event zones circle overlay
            map.addSource('event-zones', { type: 'geojson', data: geojson });
            map.addLayer({
              id: 'event-zones-layer',
              type: 'circle',
              source: 'event-zones',
              paint: {
                'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 4, 15, 24],
                'circle-color': ['get', 'color'],
                'circle-opacity': 0.12,
                'circle-stroke-color': ['get', 'color'],
                'circle-stroke-width': 1,
                'circle-stroke-opacity': 0.4
              }
            });
          }

          // 2. Diversion Routes (lines)
          const diversionsEnabled = mapLayers.find(l => l.id === 'diversions')?.enabled;
          if (diversionsEnabled) {
            const divEvents = eventsToRender.filter(ev => ev.diversion_required === 'YES');
            if (divEvents.length > 0) {
              const features = divEvents.map(ev => {
                const endLat = ev.endlatitude || ev.latitude + 0.003;
                const endLng = ev.endlongitude || ev.longitude + 0.003;
                return {
                  type: 'Feature',
                  geometry: {
                    type: 'LineString',
                    coordinates: [
                      [ev.longitude, ev.latitude],
                      [ev.longitude + (endLng - ev.longitude) * 0.5 + 0.001, ev.latitude + (endLat - ev.latitude) * 0.5 - 0.001],
                      [endLng, endLat]
                    ]
                  },
                  properties: {}
                };
              });

              map.addSource('diversion-lines', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features }
              });

              map.addLayer({
                id: 'diversion-layer',
                type: 'line',
                source: 'diversion-lines',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                  'line-color': '#10B981',
                  'line-width': 2.5,
                  'line-dasharray': [3, 2]
                }
              });
            }
          }
        } catch (e) {
          console.warn("[MapplsMap] Error syncing vector layers:", e);
        }
      };

      if (map.isStyleLoaded()) {
        syncLayers();
      } else {
        map.once('load', syncLayers);
        map.once('styledata', syncLayers);
      }

    } catch (err) {
      console.error("[MapplsMap] Critical error updating markers. Marker loop interrupted:", err);
    }
  }, [sdkLoaded, eventsToRender, mapLayers, selectEvent]);
  // --- Canvas Fallback Renderer ---
  useEffect(() => {
    if (!usingCanvas || !canvasRef.current) return;
    renderCanvasMap();
  }, [usingCanvas, eventsToRender, mapLayers, selectedEvent, settings.region]);

  function renderCanvasMap() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    const H = canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;

    // Background
    ctx.fillStyle = '#0A1929';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(6,182,212,0.06)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Coordinate bounds based on selected region center
    const center = REGION_CENTERS[settings.region] || REGION_CENTERS['Bengaluru'];
    const LAT_MIN = center.lat - 0.18, LAT_MAX = center.lat + 0.18;
    const LNG_MIN = center.lng - 0.175, LNG_MAX = center.lng + 0.175;

    const toX = (lng: number) => ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * w;
    const toY = (lat: number) => ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * h;

    // Draw road network lines (simulated and offset by region)
    const bCenter = REGION_CENTERS['Bengaluru'];
    const latOffset = center.lat - bCenter.lat;
    const lngOffset = center.lng - bCenter.lng;

    const baseRoads = [
      [[12.97, 77.44], [13.04, 77.52], [13.07, 77.59], [13.04, 77.66], [12.97, 77.70], [12.90, 77.66], [12.87, 77.59], [12.90, 77.52], [12.97, 77.44]],
      [[12.97, 77.59], [13.07, 77.59], [13.15, 77.62]],
      [[12.97, 77.59], [12.88, 77.60], [12.82, 77.62]],
      [[12.97, 77.59], [12.94, 77.55], [12.90, 77.50]],
      [[12.97, 77.59], [13.03, 77.54], [13.10, 77.49]],
      [[12.97, 77.59], [12.97, 77.66], [12.97, 77.75]],
    ];

    const roads = baseRoads.map(road => road.map(([lat, lng]) => [lat + latOffset, lng + lngOffset]));

    ctx.strokeStyle = 'rgba(15,61,102,0.6)';
    ctx.lineWidth = 1.5;
    for (const road of roads) {
      ctx.beginPath();
      road.forEach(([lat, lng], i) => {
        const x = toX(lng), y = toY(lat);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // 1. Draw congestion heatmap/overlay if enabled
    const congestionLayer = mapLayers.find((l) => l.id === 'congestion');
    if (congestionLayer?.enabled) {
      for (const ev of eventsToRender.slice(0, 500)) {
        if (!ev.latitude || !ev.longitude) continue;
        const x = toX(ev.longitude);
        const y = toY(ev.latitude);
        const r = (ev.impact_radius_m / 1000) * (w / (LNG_MAX - LNG_MIN)) * 0.5;
        const color = getMarkerColorHex(ev.marker_color);
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
        gradient.addColorStop(0, color + '22');
        gradient.addColorStop(1, color + '00');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.strokeStyle = color + '15';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }

    // 2. Draw diversion lines if enabled
    const diversionsLayer = mapLayers.find((l) => l.id === 'diversions');
    if (diversionsLayer?.enabled) {
      const diversions = eventsToRender.filter(e => e.diversion_required === 'YES').slice(0, 50);
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 2]);
      for (const ev of diversions) {
        const sx = toX(ev.longitude);
        const sy = toY(ev.latitude);
        const ex = toX(ev.endlongitude || ev.longitude + 0.003);
        const ey = toY(ev.endlatitude || ev.latitude + 0.003);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.bezierCurveTo(sx + (ex - sx) * 0.5, sy - 15, sx + (ex - sx) * 0.5, ey + 15, ex, ey);
        ctx.stroke();

        ctx.fillStyle = '#10B981';
        ctx.beginPath();
        ctx.arc(ex, ey, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.setLineDash([]);
    }

    // 3. Draw event markers
    const eventsLayer = mapLayers.find((l) => l.id === 'events');
    if (eventsLayer?.enabled) {
      for (const ev of eventsToRender.slice(0, 1500)) {
        if (!ev.latitude || !ev.longitude) continue;
        const x = toX(ev.longitude);
        const y = toY(ev.latitude);
        if (x < 0 || x > w || y < 0 || y > h) continue;

        const color = getMarkerColorHex(ev.marker_color);
        const radius = ev.is_hotspot ? 5 : 3.5;

        // Glow
        ctx.beginPath();
        ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
        ctx.fillStyle = color + '20';
        ctx.fill();

        // Dot
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Border
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }

    // 4. Draw closures (⛔ icon overlay)
    const closuresLayer = mapLayers.find((l) => l.id === 'closures');
    if (closuresLayer?.enabled) {
      const closures = eventsToRender.filter(e => e.requires_road_closure || e.road_closure_flag === 1).slice(0, 80);
      for (const ev of closures) {
        const x = toX(ev.longitude);
        const y = toY(ev.latitude);
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#EF4444';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x - 4, y);
        ctx.lineTo(x + 4, y);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }
    }

    // 5. Draw police deployment (👮/P text overlay)
    const policeLayer = mapLayers.find((l) => l.id === 'police');
    if (policeLayer?.enabled) {
      const policeEvents = eventsToRender.filter(e => e.recommended_police > 0).slice(0, 80);
      for (const ev of policeEvents) {
        const x = toX(ev.longitude);
        const y = toY(ev.latitude);
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#3B82F6';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = 'white';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(ev.recommended_police), x, y);
      }
    }

    // 6. Draw hotspots (🔥 rings overlay)
    const hotspotLayer = mapLayers.find((l) => l.id === 'hotspots');
    if (hotspotLayer?.enabled) {
      const hotspots = eventsToRender.filter((e) => e.is_hotspot === 1).slice(0, 50);
      for (const ev of hotspots) {
        const x = toX(ev.longitude);
        const y = toY(ev.latitude);
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.strokeStyle = '#F97316';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Draw highlight ring for selected event
    if (selectedEvent && selectedEvent.latitude && selectedEvent.longitude) {
      let sx = selectedEvent.longitude;
      let sy = selectedEvent.latitude;
      if (settings.region !== 'Bengaluru' && settings.region !== 'All India') {
        sx += lngOffset;
        sy += latOffset;
      }
      const cx = toX(sx);
      const cy = toY(sy);
      if (cx >= 0 && cx <= w && cy >= 0 && cy <= h) {
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.strokeStyle = '#06B6D4';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
        ctx.fill();
        ctx.strokeStyle = '#06B6D4';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Labels
    ctx.fillStyle = 'rgba(148,163,184,0.7)';
    ctx.font = '9px IBM Plex Sans';
    ctx.textAlign = 'center';
    const labels = [
      { name: 'North District', lat: bCenter.lat + 0.07 + latOffset, lng: bCenter.lng + lngOffset },
      { name: 'East District', lat: bCenter.lat - 0.01 + latOffset, lng: bCenter.lng + 0.10 + lngOffset },
      { name: 'South District', lat: bCenter.lat - 0.05 + latOffset, lng: bCenter.lng - 0.01 + lngOffset },
      { name: 'West District', lat: bCenter.lat + 0.05 + latOffset, lng: bCenter.lng - 0.05 + lngOffset },
      { name: 'Sector 1', lat: bCenter.lat - 0.12 + latOffset, lng: bCenter.lng + 0.08 + lngOffset },
      { name: 'Sector 2', lat: bCenter.lat + 0.05 + latOffset, lng: bCenter.lng - 0.05 + lngOffset },
      { name: 'Central Hub', lat: bCenter.lat + latOffset, lng: bCenter.lng + lngOffset },
      { name: 'Sector 3', lat: bCenter.lat - 0.07 + latOffset, lng: bCenter.lng - 0.01 + lngOffset },
    ];
    for (const l of labels) {
      ctx.fillText(l.name, toX(l.lng), toY(l.lat));
    }

    // Watermark
    ctx.fillStyle = 'rgba(6,182,212,0.15)';
    ctx.font = 'bold 11px IBM Plex Sans';
    ctx.textAlign = 'left';
    ctx.fillText('GRIDLOCKED · ' + settings.region.toUpperCase() + ' TRAFFIC NETWORK', 12, h - 10);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(148,163,184,0.3)';
    ctx.font = '9px IBM Plex Sans';
    ctx.fillText('ACTIVE LAYER: ' + settings.region.toUpperCase() + ' NETWORK GRID', w - 12, h - 10);
  }

  return (
    <div className="map-container" style={{ height, position: 'relative' }}>
      {!usingCanvas && (
        <div
          ref={mapContainerRef}
          id="gridlocked-map"
          style={{ width: '100%', height: '100%' }}
        />
      )}

      {/* Canvas Fallback */}
      {usingCanvas && (
        <div className="map-placeholder" style={{ width: '100%', height: '100%' }}>
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block' }}
            onClick={(e) => {
              // Click detection for canvas markers
              const rect = canvasRef.current!.getBoundingClientRect();
              const mx = e.clientX - rect.left;
              const my = e.clientY - rect.top;
              const LAT_MIN = 12.82, LAT_MAX = 13.18;
              const LNG_MIN = 77.43, LNG_MAX = 77.78;
              const w = rect.width, h = rect.height;
              const toX = (lng: number) => ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * w;
              const toY = (lat: number) => ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * h;

              let closest: TrafficEvent | null = null;
              let minDist = 12;
              for (const ev of eventsToRender.slice(0, 2000)) {
                const x = toX(ev.longitude), y = toY(ev.latitude);
                const dist = Math.hypot(x - mx, y - my);
                if (dist < minDist) { minDist = dist; closest = ev; }
              }
              selectEvent(closest);
            }}
          />

          {/* Marker Popup */}
          {selectedEvent && (
            <div
              className="absolute top-4 right-4 gl-card p-3 w-72 z-10"
              style={{ border: '1px solid rgba(6,182,212,0.3)' }}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="font-semibold" style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                  {selectedEvent.alert_title}
                </span>
                <button onClick={() => selectEvent(null)} style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1 }}>×</button>
              </div>
              <div className="space-y-1" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>ID:</span> {selectedEvent.id}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Cause:</span> {selectedEvent.event_cause.replace(/_/g, ' ')}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Location:</span> {truncateAddress(selectedEvent.address, 50)}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Congestion:</span> {selectedEvent.congestion_risk_score.toFixed(1)} ({selectedEvent.congestion_label})</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Corridor:</span> {selectedEvent.corridor}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Police needed:</span> {selectedEvent.recommended_police}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Action:</span> {selectedEvent.recommended_action}</div>
              </div>
            </div>
          )}

          {/* No API key notice */}
          <div className="absolute bottom-10 left-3"
            style={{ fontSize: '10px', color: 'rgba(6,182,212,0.5)', background: 'rgba(7,17,31,0.8)', padding: '4px 8px', borderRadius: '3px' }}>
            Vector Grid Simulation Mode
          </div>
        </div>
      )}

      {/* Layer Controls */}
      <MapLayerControls />

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1">
        <button className="gl-btn-secondary p-1.5" title="Zoom in"><ZoomIn size={14} /></button>
        <button className="gl-btn-secondary p-1.5" title="Zoom out"><ZoomOut size={14} /></button>
        <button className="gl-btn-secondary p-1.5" title="Reset view"><Crosshair size={14} /></button>
      </div>

      {/* Stats overlay */}
      <div className="absolute top-3 left-3 flex flex-col gap-1.5">
        <div className="flex gap-2">
          {[
            { label: 'Active', color: '#22C55E' },
            { label: 'High Risk', color: '#F97316' },
            { label: 'Critical', color: '#EF4444' },
            { label: 'Closed', color: '#64748B' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1"
              style={{ fontSize: '10px', color: 'var(--text-secondary)', background: 'rgba(7,17,31,0.85)', padding: '3px 7px', borderRadius: '3px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
              {item.label}
            </div>
          ))}
        </div>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center"
          style={{ background: 'rgba(7,17,31,0.8)' }}>
          <div className="text-center">
            <div className="gl-skeleton h-2 w-48 mb-2" />
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Loading event data…</div>
          </div>
        </div>
      )}
    </div>
  );
}

function MapLayerControls() {
  const { mapLayers, toggleMapLayer } = useGridLockedStore();
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="absolute top-3 right-14"
      style={{ zIndex: 1000 }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="gl-btn-secondary flex items-center gap-1.5"
        style={{ fontSize: '11px', padding: '4px 10px' }}
        onClick={() => setExpanded((v) => !v)}
      >
        <Layers size={12} />
        Layers
      </button>
      {expanded && (
        <div
          className="absolute top-full right-0 mt-1 gl-card p-2 w-48"
          style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', zIndex: 1010 }}
        >
          {mapLayers.map((layer) => (
            <label key={layer.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-white/5 transition-colors">
              <input
                type="checkbox"
                checked={layer.enabled}
                onChange={() => toggleMapLayer(layer.id)}
                className="w-3 h-3 accent-cyan-400"
              />
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{layer.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
