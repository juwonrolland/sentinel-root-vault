import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ThreatOrigin {
  id: string;
  lat: number;
  lng: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  event_type: string;
  source_ip: string;
  timestamp: Date;
}

// Simulated IP geolocation data (in production, use a real IP geolocation service)
const ipToLocation = (ip: string): { lat: number; lng: number } => {
  // Generate deterministic but varied locations based on IP
  const hash = ip.split('.').reduce((acc, octet) => acc + parseInt(octet), 0);
  const regions = [
    { lat: 39.9, lng: 116.4 },   // Beijing
    { lat: 55.75, lng: 37.62 },  // Moscow
    { lat: 51.5, lng: -0.12 },   // London
    { lat: 40.71, lng: -74.01 }, // New York
    { lat: 35.68, lng: 139.69 }, // Tokyo
    { lat: -33.87, lng: 151.21 },// Sydney
    { lat: 52.52, lng: 13.41 },  // Berlin
    { lat: 48.86, lng: 2.35 },   // Paris
    { lat: 37.57, lng: 126.98 }, // Seoul
    { lat: 22.32, lng: 114.17 }, // Hong Kong
    { lat: 1.35, lng: 103.82 },  // Singapore
    { lat: 19.43, lng: -99.13 }, // Mexico City
    { lat: -23.55, lng: -46.63 },// São Paulo
    { lat: 25.2, lng: 55.27 },   // Dubai
    { lat: 28.61, lng: 77.23 },  // New Delhi
  ];
  
  const baseLocation = regions[hash % regions.length];
  const variation = {
    lat: (hash % 100 - 50) / 10,
    lng: ((hash * 7) % 100 - 50) / 10
  };
  
  return {
    lat: baseLocation.lat + variation.lat,
    lng: baseLocation.lng + variation.lng
  };
};

const severityColors = {
  critical: '#ff4757',
  high: '#ffa502',
  medium: '#00d4ff',
  low: '#2ed573'
};

interface GlobalThreatMapProps {
  className?: string;
  height?: string;
}

export const GlobalThreatMap = ({ className, height = "400px" }: GlobalThreatMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [threats, setThreats] = useState<ThreatOrigin[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const targetLocation = { lat: 37.7749, lng: -122.4194 }; // San Francisco (HQ)

  useEffect(() => {
    loadThreats();

    // Real-time subscription
    const channel = supabase
      .channel('threat-map-events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'security_events'
        },
        (payload) => {
          const event = payload.new as any;
          if (event.source_ip) {
            const location = ipToLocation(event.source_ip);
            const newThreat: ThreatOrigin = {
              id: event.id,
              lat: location.lat,
              lng: location.lng,
              severity: event.severity,
              event_type: event.event_type,
              source_ip: event.source_ip,
              timestamp: new Date(event.detected_at)
            };
            setThreats(prev => [newThreat, ...prev].slice(0, 50));
            
            // Add animated marker for new threat
            if (map.current && isLoaded) {
              addThreatMarker(newThreat, true);
              drawAttackLine(newThreat);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isLoaded]);

  const loadThreats = async () => {
    const { data, error } = await supabase
      .from('security_events')
      .select('*')
      .not('source_ip', 'is', null)
      .order('detected_at', { ascending: false })
      .limit(30);

    if (data && !error) {
      const threatOrigins = data.map(event => {
        const location = ipToLocation(event.source_ip || '0.0.0.0');
        return {
          id: event.id,
          lat: location.lat,
          lng: location.lng,
          severity: event.severity as ThreatOrigin['severity'],
          event_type: event.event_type,
          source_ip: event.source_ip || '',
          timestamp: new Date(event.detected_at || new Date())
        };
      });
      setThreats(threatOrigins);
    }
  };

  const addThreatMarker = (threat: ThreatOrigin, animate = false) => {
    if (!map.current) return;

    const el = document.createElement('div');
    el.className = 'threat-marker';
    el.style.cssText = `
      width: 12px;
      height: 12px;
      background: ${severityColors[threat.severity]};
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.3);
      box-shadow: 0 0 15px ${severityColors[threat.severity]};
      cursor: pointer;
      ${animate ? 'animation: pulse-marker 1s ease-out;' : ''}
    `;

    // Add pulse ring for critical/high
    if (threat.severity === 'critical' || threat.severity === 'high') {
      const ring = document.createElement('div');
      ring.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 24px;
        height: 24px;
        border: 2px solid ${severityColors[threat.severity]};
        border-radius: 50%;
        animation: pulse-ring 2s ease-out infinite;
        opacity: 0.5;
      `;
      el.appendChild(ring);
    }

    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat([threat.lng, threat.lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="background: #1a1a2e; color: #fff; padding: 8px; border-radius: 8px; min-width: 150px;">
            <div style="font-weight: bold; color: ${severityColors[threat.severity]}; margin-bottom: 4px;">
              ${threat.severity.toUpperCase()}
            </div>
            <div style="font-size: 12px; margin-bottom: 4px;">${threat.event_type}</div>
            <div style="font-size: 10px; color: #888;">IP: ${threat.source_ip}</div>
            <div style="font-size: 10px; color: #888;">${threat.timestamp.toLocaleTimeString()}</div>
          </div>
        `)
      )
      .addTo(map.current);

    markersRef.current.push(marker);
  };

  const drawAttackLine = (threat: ThreatOrigin) => {
    if (!map.current) return;

    const lineId = `attack-line-${threat.id}`;
    
    // Create animated line from threat origin to target
    const line: GeoJSON.Feature<GeoJSON.LineString> = {
      type: 'Feature',
      properties: { severity: threat.severity },
      geometry: {
        type: 'LineString',
        coordinates: [
          [threat.lng, threat.lat],
          [targetLocation.lng, targetLocation.lat]
        ]
      }
    };

    // Add source
    if (!map.current.getSource(lineId)) {
      map.current.addSource(lineId, {
        type: 'geojson',
        data: line
      });

      map.current.addLayer({
        id: lineId,
        type: 'line',
        source: lineId,
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        },
        paint: {
          'line-color': severityColors[threat.severity],
          'line-width': 2,
          'line-opacity': 0.6,
          'line-dasharray': [2, 4]
        }
      });

      // Animate and remove line after delay
      setTimeout(() => {
        if (map.current?.getLayer(lineId)) {
          map.current.removeLayer(lineId);
        }
        if (map.current?.getSource(lineId)) {
          map.current.removeSource(lineId);
        }
      }, 5000);
    }
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) {
      console.error('Mapbox token not found');
      return;
    }

    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      projection: 'globe',
      zoom: 1.5,
      center: [0, 20],
      pitch: 30,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      'top-right'
    );

    map.current.scrollZoom.disable();

    map.current.on('style.load', () => {
      map.current?.setFog({
        color: 'rgb(10, 10, 20)',
        'high-color': 'rgb(20, 30, 50)',
        'horizon-blend': 0.1,
      });
      setIsLoaded(true);
    });

    // Add target marker (HQ)
    const targetEl = document.createElement('div');
    targetEl.innerHTML = `
      <div style="
        width: 20px;
        height: 20px;
        background: #00d4ff;
        border-radius: 50%;
        border: 3px solid #fff;
        box-shadow: 0 0 30px #00d4ff;
        animation: pulse-glow 2s ease-in-out infinite;
      "></div>
    `;

    new mapboxgl.Marker({ element: targetEl })
      .setLngLat([targetLocation.lng, targetLocation.lat])
      .setPopup(new mapboxgl.Popup().setHTML(`
        <div style="background: #1a1a2e; color: #00d4ff; padding: 8px; border-radius: 8px;">
          <div style="font-weight: bold;">🛡️ Security HQ</div>
          <div style="font-size: 10px; color: #888;">Protected Infrastructure</div>
        </div>
      `))
      .addTo(map.current);

    // Slow rotation
    let userInteracting = false;
    const spinGlobe = () => {
      if (!map.current || userInteracting) return;
      const zoom = map.current.getZoom();
      if (zoom < 3) {
        const center = map.current.getCenter();
        center.lng -= 0.5;
        map.current.easeTo({ center, duration: 1000, easing: n => n });
      }
    };

    map.current.on('mousedown', () => { userInteracting = true; });
    map.current.on('mouseup', () => { userInteracting = false; spinGlobe(); });
    map.current.on('moveend', spinGlobe);
    spinGlobe();

    return () => {
      markersRef.current.forEach(m => m.remove());
      map.current?.remove();
    };
  }, []);

  // Add markers when threats change and map is loaded
  useEffect(() => {
    if (!isLoaded || !map.current) return;
    
    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    
    // Add all threat markers
    threats.forEach(threat => addThreatMarker(threat));
  }, [threats, isLoaded]);

  return (
    <div className={cn("relative rounded-lg overflow-hidden", className)} style={{ height }}>
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Overlay gradient */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-background/30 via-transparent to-transparent" />
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-card/80 backdrop-blur-sm rounded-lg p-3 border border-border/50">
        <p className="text-xs text-muted-foreground mb-2 font-semibold">THREAT ORIGINS</p>
        <div className="space-y-1">
          {Object.entries(severityColors).map(([level, color]) => (
            <div key={level} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} 
              />
              <span className="text-xs text-foreground capitalize">{level}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="absolute top-4 left-4 bg-card/80 backdrop-blur-sm rounded-lg p-3 border border-border/50">
        <p className="text-xs text-muted-foreground mb-1">ACTIVE THREATS</p>
        <p className="text-2xl font-bold font-mono text-foreground">{threats.length}</p>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes pulse-marker {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.5); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes pulse-ring {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
          100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px #00d4ff; }
          50% { box-shadow: 0 0 40px #00d4ff, 0 0 60px #00d4ff; }
        }
        .mapboxgl-popup-content {
          background: transparent !important;
          padding: 0 !important;
          box-shadow: none !important;
        }
        .mapboxgl-popup-tip {
          display: none !important;
        }
      `}</style>
    </div>
  );
};
