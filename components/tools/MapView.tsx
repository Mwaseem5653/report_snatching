"use client";

import { useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapViewProps {
    data: any[];
    currentTime: number; // Minutes from midnight
    selectedDate: string;
}

export default function MapView({ data, currentTime, selectedDate }: MapViewProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<L.Map | null>(null);
    const arrowMarkerRef = useRef<L.Marker | null>(null);
    const progressiveLineRef = useRef<L.Polyline | null>(null);
    const fullPathRef = useRef<L.Polyline | null>(null);
    const hourlyMarkersRef = useRef<L.LayerGroup | null>(null);
    const landmarkMarkersRef = useRef<L.LayerGroup | null>(null);

    // 1. Initialize Map with Detailed Layers
    useEffect(() => {
        if (!mapRef.current || mapInstance.current) return;

        // --- TILE LAYERS ---
        const streets = L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
            attribution: '&copy; OpenStreetMap'
        });

        const satellite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
            attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community'
        });

        const terrain = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
            attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)'
        });

        mapInstance.current = L.map(mapRef.current, {
            zoomControl: false,
            attributionControl: false,
            preferCanvas: true, // 🚀 Enable Canvas for smoother performance
            layers: [streets] // Default layer
        }).setView([24.8607, 67.0011], 13);

        // --- LAYER CONTROL (The Switcher) ---
        const baseMaps = {
            "Default View": streets,
            "Detailed Satellite": satellite,
            "Terrain View": terrain
        };
        L.control.layers(baseMaps, {}, { position: 'bottomleft' }).addTo(mapInstance.current);

        L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current);
        
        hourlyMarkersRef.current = L.layerGroup().addTo(mapInstance.current);
        landmarkMarkersRef.current = L.layerGroup().addTo(mapInstance.current);

        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, []);

    // 2. Global Reset / Cleanup
    useEffect(() => {
        if (data.length === 0 && mapInstance.current) {
            if (arrowMarkerRef.current) { arrowMarkerRef.current.remove(); arrowMarkerRef.current = null; }
            if (progressiveLineRef.current) { progressiveLineRef.current.remove(); progressiveLineRef.current = null; }
            if (fullPathRef.current) { fullPathRef.current.remove(); fullPathRef.current = null; }
            if (hourlyMarkersRef.current) hourlyMarkersRef.current.clearLayers();
            if (landmarkMarkersRef.current) landmarkMarkersRef.current.clearLayers();
            mapInstance.current.setView([24.8607, 67.0011], 12);
        }
    }, [data]);

    // 3. Landmarks Calculation
    const hourlyPoints = useMemo(() => {
        const landmarks: any[] = [];
        if (data.length === 0) return landmarks;
        const dayStart = new Date(selectedDate).getTime();
        
        for (let h = 1; h <= 23; h++) {
            const targetTs = dayStart + (h * 60 * 60 * 1000);
            const point = data.find(p => p.timestamp >= targetTs);
            if (point) {
                landmarks.push({
                    hour: h,
                    lat: point.lat,
                    lon: point.lon,
                    addr: point.address,
                    time: point.displayTime.split(" ")[1],
                    minuteOfDay: h * 60
                });
            }
        }
        return landmarks;
    }, [data, selectedDate]);

    // 4. Interpolation Logic
    const { currentPos, rotation, passedCoords } = useMemo(() => {
        if (data.length === 0) return { currentPos: null, rotation: 0, passedCoords: [] };

        const dayStart = new Date(selectedDate).getTime();
        const targetTs = dayStart + (currentTime * 60 * 1000);

        let prev = data[0];
        let next = data[0];
        const passed: [number, number][] = [];

        for (let i = 0; i < data.length; i++) {
            if (data[i].timestamp <= targetTs) {
                prev = data[i];
                passed.push([data[i].lat, data[i].lon]);
            }
            if (data[i].timestamp > targetTs) {
                next = data[i];
                break;
            }
        }

        let finalLat = prev.lat;
        let finalLon = prev.lon;
        let bearing = 0;

        if (prev !== next && targetTs < data[data.length - 1].timestamp) {
            const timeDiff = next.timestamp - prev.timestamp;
            const elapsed = targetTs - prev.timestamp;
            const pct = elapsed / timeDiff;
            finalLat = prev.lat + (next.lat - prev.lat) * pct;
            finalLon = prev.lon + (next.lon - prev.lon) * pct;
            bearing = (Math.atan2(next.lon - prev.lon, next.lat - prev.lat) * 180) / Math.PI;
        }

        const currentGlidePos: [number, number] = [finalLat, finalLon];
        passed.push(currentGlidePos);

        return { currentPos: currentGlidePos, rotation: bearing, passedCoords: passed };
    }, [data, currentTime, selectedDate]);

    // 5. Update Layers
    useEffect(() => {
        if (!mapInstance.current || !currentPos || data.length === 0) return;

        // Ghost Line
        if (!fullPathRef.current) {
            const validAllCoords = data
                .filter(p => p.lat !== null && p.lon !== null && !isNaN(p.lat) && !isNaN(p.lon))
                .map(p => [p.lat, p.lon] as [number, number]);
            
            if (validAllCoords.length > 1) {
                fullPathRef.current = L.polyline(validAllCoords, {
                    color: '#cbd5e1', weight: 2, opacity: 0.4, dashArray: '5, 5'
                }).addTo(mapInstance.current);
            }
        }

        // Landmarks (Start/End)
        if (landmarkMarkersRef.current && landmarkMarkersRef.current.getLayers().length === 0 && data.length > 0) {
            const first = data[0];
            const last = data[data.length - 1];
            
            if (first.lat !== null && !isNaN(first.lat)) {
                L.circleMarker([first.lat, first.lon], {
                    radius: 8, fillColor: "#10b981", color: "white", weight: 2, fillOpacity: 0.9
                }).addTo(landmarkMarkersRef.current).bindPopup(`<b>Start Point</b><br/>${first.displayTime}`);
            }

            if (last.lat !== null && !isNaN(last.lat)) {
                L.circleMarker([last.lat, last.lon], {
                    radius: 8, fillColor: "#f43f5e", color: "white", weight: 2, fillOpacity: 0.9
                }).addTo(landmarkMarkersRef.current).bindPopup(`<b>End Point</b><br/>${last.displayTime}`);
            }
        }

        // Progressive Path
        if (progressiveLineRef.current) {
            progressiveLineRef.current.setLatLngs(passedCoords);
        } else if (passedCoords.length > 1) {
            progressiveLineRef.current = L.polyline(passedCoords, {
                color: '#2563eb', weight: 5, opacity: 0.8, lineJoin: 'round'
            }).addTo(mapInstance.current);
        }

        // Hourly Markers (Grouped)
        if (hourlyMarkersRef.current) {
            hourlyMarkersRef.current.clearLayers();
            const locationGroups = new Map<string, any[]>();
            hourlyPoints.forEach(hp => {
                if (currentTime >= hp.minuteOfDay) {
                    const key = `${hp.lat.toFixed(5)},${hp.lon.toFixed(5)}`;
                    const group = locationGroups.get(key) || [];
                    group.push(hp);
                    locationGroups.set(key, group);
                }
            });

            locationGroups.forEach((points, key) => {
                const [lat, lon] = key.split(',').map(Number);
                let label = "";
                if (points.length > 1) {
                    const firstH = points[0].hour;
                    const lastH = points[points.length - 1].hour;
                    const formatH = (h: number) => h > 12 ? `${h - 12}PM` : `${h}AM`;
                    label = `${formatH(firstH)}-${formatH(lastH)}`;
                } else {
                    const h = points[0].hour;
                    label = h > 12 ? `${h - 12}PM` : `${h}AM`;
                }

                L.marker([lat, lon], { 
                    icon: L.divIcon({
                        className: "hour-text-icon",
                        html: `<div style="color: #1e293b; font-weight: 900; font-size: 10px; text-shadow: 0 0 3px white; white-space: nowrap;">${label}</div>`,
                        iconSize: [60, 20], iconAnchor: [30, 10]
                    }),
                    zIndexOffset: 1000 
                }).addTo(hourlyMarkersRef.current!).bindPopup(`<b>Stay Location</b><br/>${points.map(p => `• ${p.hour > 12 ? p.hour-12+'PM' : p.hour+'AM'}: ${p.addr}`).join('<br/>')}`);
            });
        }

        // Arrow
        if (arrowMarkerRef.current) {
            arrowMarkerRef.current.setLatLng(currentPos);
            const iconDiv = arrowMarkerRef.current.getElement()?.querySelector('.arrow-head') as HTMLElement;
            if (iconDiv) iconDiv.style.transform = `rotate(${rotation}deg)`;
            
            const h = Math.floor(currentTime / 60);
            const m = currentTime % 60;
            arrowMarkerRef.current.setTooltipContent(`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`);
        } else {
            const ArrowIcon = L.divIcon({
                className: "custom-nav-icon",
                html: `<div class="arrow-head" style="width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-bottom: 26px solid #ef4444; transform: rotate(${rotation}deg); filter: drop-shadow(0 0 5px rgba(239,68,68,0.5));"></div>`,
                iconSize: [20, 20], iconAnchor: [10, 10]
            });

            arrowMarkerRef.current = L.marker(currentPos, { icon: ArrowIcon, zIndexOffset: 5000 })
                .addTo(mapInstance.current)
                .bindTooltip("", { 
                    permanent: true, direction: "top", offset: [0, -25],
                    className: "bg-red-600 text-white font-black text-[11px] px-2 py-0.5 rounded shadow-xl border-none"
                });
        }

        mapInstance.current.panTo(currentPos, { animate: true, duration: 0.1 });

    }, [currentPos, rotation, passedCoords, currentTime, hourlyPoints, data]);

    // Bounds fitting
    useEffect(() => {
        if (mapInstance.current && data.length > 0) {
            const bounds = L.latLngBounds(data.map(p => [p.lat, p.lon]));
            mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [data, selectedDate]);

    return <div ref={mapRef} className="w-full h-full z-0" />;
}
