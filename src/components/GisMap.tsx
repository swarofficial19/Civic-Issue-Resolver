import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { CivicReport, Priority, Department } from '../types';
import { MapPin, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

interface GisMapProps {
  reports: CivicReport[];
  selectedReportId?: string;
  onSelectReport: (report: CivicReport) => void;
  selectedDistrict?: string;
  selectedDepartment?: string;
  className?: string;
}

export const GisMap: React.FC<GisMapProps> = ({
  reports,
  selectedReportId,
  onSelectReport,
  selectedDistrict,
  selectedDepartment,
  className = 'h-[500px] w-full rounded-2xl overflow-hidden shadow-inner border border-slate-200 dark:border-slate-800'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  // Helper to construct custom HTML pin icon
  const createCustomPinIcon = (priority: Priority, isResolved: boolean, isSelected: boolean) => {
    let colorClass = 'bg-amber-500 border-amber-300';
    let ringColor = 'ring-amber-400';

    if (isResolved) {
      colorClass = 'bg-emerald-500 border-emerald-300';
      ringColor = 'ring-emerald-400';
    } else if (priority === 'CRITICAL') {
      colorClass = 'bg-rose-600 border-rose-300';
      ringColor = 'ring-rose-500 animate-bounce';
    } else if (priority === 'HIGH') {
      colorClass = 'bg-orange-500 border-orange-300';
      ringColor = 'ring-orange-400';
    } else if (priority === 'MEDIUM') {
      colorClass = 'bg-amber-500 border-amber-300';
      ringColor = 'ring-amber-400';
    } else {
      colorClass = 'bg-blue-500 border-blue-300';
      ringColor = 'ring-blue-400';
    }

    const scale = isSelected ? 'scale-125 z-50' : 'hover:scale-110';

    const html = `
      <div class="relative flex items-center justify-center cursor-pointer transition-transform duration-200 ${scale}">
        <div class="w-8 h-8 rounded-full ${colorClass} text-white flex items-center justify-center font-bold text-xs shadow-lg border-2 ring-2 ${ringColor}">
          ${isResolved ? '✓' : priority.charAt(0)}
        </div>
        <div class="absolute -bottom-1 w-2 h-2 ${colorClass} transform rotate-45"></div>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'custom-gis-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // India Default Center: [20.5937, 78.9629]
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([20.5937, 78.9629], 5);

      // OpenStreetMap Tile Layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      // Add Zoom Control to top right
      L.control.zoom({ position: 'topright' }).addTo(map);

      markersGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers & Pan
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    if (reports.length === 0) return;

    const bounds = L.latLngBounds([]);

    reports.forEach(report => {
      if (!report.location?.lat || !report.location?.lng) return;

      const isSelected = report.id === selectedReportId;
      const isResolved = report.status === 'Resolved';
      const icon = createCustomPinIcon(report.priority, isResolved, isSelected);

      const marker = L.marker([report.location.lat, report.location.lng], { icon });

      // Popup Content
      const popupHtml = `
        <div class="p-2 max-w-[240px] font-sans">
          <div class="flex items-center justify-between gap-2 mb-1">
            <span class="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
              report.priority === 'CRITICAL' ? 'bg-rose-100 text-rose-800' :
              report.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
              report.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
            }">${report.priority}</span>
            <span class="text-[10px] text-slate-500">${report.location.district}</span>
          </div>
          <h4 class="text-xs font-bold text-slate-900 leading-snug mb-1 line-clamp-2">${report.title}</h4>
          <p class="text-[11px] text-slate-600 mb-2">${report.location.address} • ${report.category}</p>
          <button id="btn-popup-${report.id}" class="w-full text-center py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold transition">
            View Issue Details
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('click', () => {
        onSelectReport(report);
      });

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-popup-${report.id}`);
        if (btn) {
          btn.onclick = () => onSelectReport(report);
        }
      });

      markersGroup.addLayer(marker);
      bounds.extend([report.location.lat, report.location.lng]);
    });

    // Auto fit bounds if filters active or markers exist
    if (reports.length > 0 && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }, [reports, selectedReportId, onSelectReport]);

  return (
    <div className="relative z-0 isolate overflow-hidden rounded-2xl">
      <div ref={mapContainerRef} className={className} />

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-[20] bg-white/95 dark:bg-slate-900/95 backdrop-blur px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md text-xs space-y-1.5 pointer-events-none">
        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
          GIS Issue Legend
        </div>
        <div className="flex items-center space-x-3 text-[11px]">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 ring-2 ring-rose-300"></span>
            <span className="font-semibold text-rose-700 dark:text-rose-400">Critical</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
            <span className="text-orange-700 dark:text-orange-400 font-medium">High</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span className="text-amber-700 dark:text-amber-400">Medium</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">Resolved</span>
          </span>
        </div>
      </div>
    </div>
  );
};
