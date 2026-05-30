import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, GeoJSON, Popup, useMap } from 'react-leaflet';
import { fetchAPI, formatCurrency, getRiskColor } from '../lib/utils';
import { AlertTriangle, Users, IndianRupee, TrendingUp, MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// GeoJSON features for UP districts (simplified polygons)
const districtGeo = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { name: 'Lucknow' }, geometry: { type: 'Polygon', coordinates: [[[80.8, 26.7],[81.1, 26.7],[81.1, 27.0],[80.8, 27.0],[80.8, 26.7]]] } },
    { type: 'Feature', properties: { name: 'Kanpur' }, geometry: { type: 'Polygon', coordinates: [[[80.2, 26.3],[80.5, 26.3],[80.5, 26.6],[80.2, 26.6],[80.2, 26.3]]] } },
    { type: 'Feature', properties: { name: 'Moradabad' }, geometry: { type: 'Polygon', coordinates: [[[78.6, 28.7],[78.9, 28.7],[78.9, 29.0],[78.6, 29.0],[78.6, 28.7]]] } },
    { type: 'Feature', properties: { name: 'Agra' }, geometry: { type: 'Polygon', coordinates: [[[77.9, 27.0],[78.2, 27.0],[78.2, 27.3],[77.9, 27.3],[77.9, 27.0]]] } },
    { type: 'Feature', properties: { name: 'Varanasi' }, geometry: { type: 'Polygon', coordinates: [[[82.9, 25.2],[83.2, 25.2],[83.2, 25.5],[82.9, 25.5],[82.9, 25.2]]] } },
    { type: 'Feature', properties: { name: 'Bareilly' }, geometry: { type: 'Polygon', coordinates: [[[79.3, 28.2],[79.6, 28.2],[79.6, 28.5],[79.3, 28.5],[79.3, 28.2]]] } },
    { type: 'Feature', properties: { name: 'Meerut' }, geometry: { type: 'Polygon', coordinates: [[[77.6, 28.9],[77.9, 28.9],[77.9, 29.2],[77.6, 29.2],[77.6, 28.9]]] } },
    { type: 'Feature', properties: { name: 'Allahabad' }, geometry: { type: 'Polygon', coordinates: [[[81.7, 25.3],[82.0, 25.3],[82.0, 25.6],[81.7, 25.6],[81.7, 25.3]]] } },
    { type: 'Feature', properties: { name: 'Gorakhpur' }, geometry: { type: 'Polygon', coordinates: [[[83.3, 26.6],[83.6, 26.6],[83.6, 26.9],[83.3, 26.9],[83.3, 26.6]]] } },
    { type: 'Feature', properties: { name: 'Aligarh' }, geometry: { type: 'Polygon', coordinates: [[[78.0, 27.8],[78.3, 27.8],[78.3, 28.1],[78.0, 28.1],[78.0, 27.8]]] } },
  ]
};

function getColor(riskScore) {
  if (riskScore >= 60) return '#ef4444';
  if (riskScore >= 40) return '#f97316';
  if (riskScore >= 25) return '#f59e0b';
  if (riskScore >= 15) return '#84cc16';
  return '#10b981';
}

export default function Heatmap() {
  const [riskScores, setRiskScores] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAPI('/risk-score').then(data => {
      setRiskScores(data);
      setLoading(false);
    });
  }, []);

  const getRisk = (name) => riskScores.find(r => r.district === name) || {};

  const geoStyle = (feature) => {
    const risk = getRisk(feature.properties.name);
    return {
      fillColor: getColor(risk.riskScore || 0),
      weight: 2,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7,
    };
  };

  const onEachFeature = (feature, layer) => {
    layer.on({
      mouseover: (e) => {
        e.target.setStyle({ weight: 3, fillOpacity: 0.9 });
      },
      mouseout: (e) => {
        e.target.setStyle({ weight: 2, fillOpacity: 0.7 });
      },
      click: () => {
        const risk = getRisk(feature.properties.name);
        setSelectedDistrict({ name: feature.properties.name, ...risk });
      }
    });
  };

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-surface-500">Loading map data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="page-title">Risk Heatmap</h1>
        <p className="page-subtitle">Interactive district-level risk visualization — Uttar Pradesh</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Map */}
        <div className="lg:col-span-3 glass-card overflow-hidden" style={{ height: '550px' }}>
          <MapContainer
            center={[27.2, 80.5]}
            zoom={7}
            style={{ height: '100%', width: '100%', borderRadius: '1rem' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <GeoJSON data={districtGeo} style={geoStyle} onEachFeature={onEachFeature} />
          </MapContainer>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Legend */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold mb-3">Risk Legend</h3>
            <div className="space-y-2">
              {[
                { color: '#ef4444', label: 'Critical (60+)' },
                { color: '#f97316', label: 'High (40-59)' },
                { color: '#f59e0b', label: 'Medium (25-39)' },
                { color: '#84cc16', label: 'Low (15-24)' },
                { color: '#10b981', label: 'Safe (0-14)' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ background: l.color }} />
                  <span className="text-xs">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* District Detail */}
          {selectedDistrict ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-primary-500" />
                <h3 className="text-base font-semibold">{selectedDistrict.name}</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 rounded-lg bg-surface-50 dark:bg-surface-800/50">
                  <span className="text-xs text-surface-500 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Risk Score
                  </span>
                  <span className={`text-lg font-bold ${getRiskColor(selectedDistrict.riskLevel)}`}>
                    {selectedDistrict.riskScore || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-surface-50 dark:bg-surface-800/50">
                  <span className="text-xs text-surface-500 flex items-center gap-1">
                    <Users className="w-3 h-3" /> Beneficiaries
                  </span>
                  <span className="text-sm font-semibold">{selectedDistrict.totalBeneficiaries || 0}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-surface-50 dark:bg-surface-800/50">
                  <span className="text-xs text-surface-500 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Anomalies
                  </span>
                  <span className="text-sm font-bold text-red-500">{selectedDistrict.anomalyCount || 0}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-surface-50 dark:bg-surface-800/50">
                  <span className="text-xs text-surface-500 flex items-center gap-1">
                    <IndianRupee className="w-3 h-3" /> Total Amount
                  </span>
                  <span className="text-sm font-semibold">{formatCurrency(selectedDistrict.totalAmount || 0)}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-surface-50 dark:bg-surface-800/50">
                  <span className="text-xs text-surface-500">Complaints</span>
                  <span className="text-sm font-semibold">{selectedDistrict.complaintCount || 0}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-surface-50 dark:bg-surface-800/50">
                  <span className="text-xs text-surface-500">Risk Level</span>
                  <span className={`badge ${
                    selectedDistrict.riskLevel === 'High' ? 'badge-danger' :
                    selectedDistrict.riskLevel === 'Medium' ? 'badge-warning' : 'badge-success'
                  }`}>
                    {selectedDistrict.riskLevel || 'N/A'}
                  </span>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="glass-card p-6 text-center text-surface-400">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Click a district on the map to view details</p>
            </div>
          )}

          {/* Quick Stats */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold mb-3">District Rankings</h3>
            <div className="space-y-2">
              {riskScores.slice(0, 5).map((r, i) => (
                <div
                  key={r.district}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50 transition cursor-pointer"
                  onClick={() => setSelectedDistrict(r)}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                    i < 2 ? 'bg-red-500' : i < 4 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}>{i + 1}</span>
                  <span className="text-sm flex-1">{r.district}</span>
                  <span className={`text-sm font-bold ${getRiskColor(r.riskLevel)}`}>{r.riskScore}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
