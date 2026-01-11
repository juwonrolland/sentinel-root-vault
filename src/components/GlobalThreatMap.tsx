import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useOfflineMode } from '@/hooks/useOfflineMode';
import { Maximize2, Minimize2, RotateCcw, X, Move, ZoomIn, MousePointer2, WifiOff, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getMapboxToken } from '@/lib/mapbox';
interface ThreatOrigin {
  id: string;
  lat: number;
  lng: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  event_type: string;
  source_ip: string;
  timestamp: Date;
}

// Simulated IP geolocation data
const ipToLocation = (ip: string): { lat: number; lng: number } => {
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [showGestureHints, setShowGestureHints] = useState(false);
  const [isUsingCache, setIsUsingCache] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState(false);
  const isMobile = useIsMobile();
  const { lightTap, mediumTap, warning } = useHapticFeedback();
  const { isOnline, cacheData, getCachedData, getCacheAge } = useOfflineMode();
  const targetLocation = { lat: 37.7749, lng: -122.4194 };
  const CACHE_KEY = 'threat-map-data';

  // Fetch Mapbox token on mount
  useEffect(() => {
    const fetchToken = async () => {
      const token = await getMapboxToken();
      if (token) {
        setMapboxToken(token);
      } else {
        setTokenError(true);
      }
    };
    fetchToken();
  }, []);

  // Check if user has seen hints before
  useEffect(() => {
    const hasSeenHints = localStorage.getItem('map-gesture-hints-seen');
    if (!hasSeenHints && isMobile) {
      setShowGestureHints(true);
    }
  }, [isMobile]);

  const dismissHints = () => {
    lightTap();
    setShowGestureHints(false);
    localStorage.setItem('map-gesture-hints-seen', 'true');
  };

  // Handle fullscreen mode
  const toggleFullscreen = () => {
    mediumTap();
    setIsFullscreen(!isFullscreen);
    setTimeout(() => {
      map.current?.resize();
    }, 100);
  };

  // Lock body scroll when fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  useEffect(() => {
    loadThreats();

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
    // Try to load from network first
    if (isOnline) {
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .not('source_ip', 'is', null)
        .order('detected_at', { ascending: false })
        .limit(isMobile ? 15 : 30);

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
        setIsUsingCache(false);
        // Cache for offline use
        cacheData(CACHE_KEY, threatOrigins, 30); // Cache for 30 minutes
      }
    } else {
      // Load from cache when offline
      const cached = getCachedData<ThreatOrigin[]>(CACHE_KEY);
      if (cached) {
        setThreats(cached.map(t => ({ ...t, timestamp: new Date(t.timestamp) })));
        setIsUsingCache(true);
        warning(); // Haptic feedback for offline mode
      }
    }
  };

  const markerSize = isMobile ? 8 : 12;
  const ringSize = isMobile ? 16 : 24;

  const addThreatMarker = (threat: ThreatOrigin, animate = false) => {
    if (!map.current) return;

    const el = document.createElement('div');
    el.className = 'threat-marker';
    el.style.cssText = `
      width: ${markerSize}px;
      height: ${markerSize}px;
      background: ${severityColors[threat.severity]};
      border-radius: 50%;
      border: ${isMobile ? '1px' : '2px'} solid rgba(255,255,255,0.3);
      box-shadow: 0 0 ${isMobile ? '8px' : '15px'} ${severityColors[threat.severity]};
      cursor: pointer;
      ${animate ? 'animation: pulse-marker 1s ease-out;' : ''}
    `;

    // Add haptic feedback on marker tap
    el.addEventListener('click', () => {
      if (threat.severity === 'critical') {
        warning();
      } else {
        lightTap();
      }
    });

    if ((threat.severity === 'critical' || threat.severity === 'high') && !isMobile) {
      const ring = document.createElement('div');
      ring.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: ${ringSize}px;
        height: ${ringSize}px;
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
        new mapboxgl.Popup({ 
          offset: isMobile ? 15 : 25,
          closeButton: isMobile,
          maxWidth: isMobile ? '200px' : '250px'
        }).setHTML(`
          <div style="background: #1a1a2e; color: #fff; padding: ${isMobile ? '6px' : '8px'}; border-radius: 8px; min-width: ${isMobile ? '120px' : '150px'};">
            <div style="font-weight: bold; color: ${severityColors[threat.severity]}; margin-bottom: 4px; font-size: ${isMobile ? '11px' : '12px'};">
              ${threat.severity.toUpperCase()}
            </div>
            <div style="font-size: ${isMobile ? '10px' : '12px'}; margin-bottom: 4px;">${threat.event_type}</div>
            <div style="font-size: ${isMobile ? '9px' : '10px'}; color: #888;">IP: ${threat.source_ip}</div>
            <div style="font-size: ${isMobile ? '9px' : '10px'}; color: #888;">${threat.timestamp.toLocaleTimeString()}</div>
          </div>
        `)
      )
      .addTo(map.current);

    markersRef.current.push(marker);
  };

  const drawAttackLine = (threat: ThreatOrigin) => {
    if (!map.current || isMobile) return; // Skip lines on mobile for performance

    const lineId = `attack-line-${threat.id}`;
    
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

  const resetMapView = () => {
    if (!map.current) return;
    map.current.easeTo({
      center: [0, 20],
      zoom: isMobile ? 0.8 : 1.5,
      pitch: isMobile ? 0 : 30,
      duration: 1000
    });
  };

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      projection: 'globe',
      zoom: isMobile ? 0.8 : 1.5,
      center: [0, 20],
      pitch: isMobile ? 0 : 30,
      dragRotate: !isMobile,
      touchZoomRotate: true,
      touchPitch: !isMobile,
    });

    // Mobile-friendly controls
    if (isMobile) {
      map.current.addControl(
        new mapboxgl.NavigationControl({ 
          showCompass: false,
          visualizePitch: false 
        }),
        'bottom-right'
      );
      // Enable pinch-to-zoom
      map.current.touchZoomRotate.enable();
      map.current.touchZoomRotate.disableRotation();
    } else {
      map.current.addControl(
        new mapboxgl.NavigationControl({ visualizePitch: true }),
        'top-right'
      );
      map.current.scrollZoom.disable();
    }

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
    const targetSize = isMobile ? 14 : 20;
    targetEl.innerHTML = `
      <div style="
        width: ${targetSize}px;
        height: ${targetSize}px;
        background: #00d4ff;
        border-radius: 50%;
        border: ${isMobile ? '2px' : '3px'} solid #fff;
        box-shadow: 0 0 ${isMobile ? '15px' : '30px'} #00d4ff;
        ${!isMobile ? 'animation: pulse-glow 2s ease-in-out infinite;' : ''}
      "></div>
    `;

    new mapboxgl.Marker({ element: targetEl })
      .setLngLat([targetLocation.lng, targetLocation.lat])
      .setPopup(new mapboxgl.Popup({ maxWidth: isMobile ? '150px' : '200px' }).setHTML(`
        <div style="background: #1a1a2e; color: #00d4ff; padding: ${isMobile ? '6px' : '8px'}; border-radius: 8px;">
          <div style="font-weight: bold; font-size: ${isMobile ? '11px' : '12px'};">🛡️ Security HQ</div>
          <div style="font-size: ${isMobile ? '9px' : '10px'}; color: #888;">Protected Infrastructure</div>
        </div>
      `))
      .addTo(map.current);

    // Slow rotation - only on desktop
    if (!isMobile) {
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
    }

    return () => {
      markersRef.current.forEach(m => m.remove());
      map.current?.remove();
      map.current = null;
    };
  }, [isMobile, mapboxToken]);

  useEffect(() => {
    if (!isLoaded || !map.current) return;
    
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    
    threats.forEach(threat => addThreatMarker(threat));
  }, [threats, isLoaded, isMobile]);

  const dynamicHeight = isFullscreen 
    ? '100vh'
    : isExpanded 
      ? (isMobile ? '70vh' : '600px')
      : (isMobile ? '280px' : height);

  const mapContent = (
    <>
      {/* Token Error State */}
      {tokenError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/95 z-50">
          <div className="text-center p-6 max-w-sm">
            <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
            <h3 className="text-lg font-bold text-foreground mb-2">Map Unavailable</h3>
            <p className="text-sm text-muted-foreground mb-4">
              The map cannot be displayed because the Mapbox token is not configured.
            </p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      )}

      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Overlay gradient */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-background/30 via-transparent to-transparent" />
      
      {/* Gesture Hints Overlay */}
      {showGestureHints && isMobile && (
        <div 
          className="absolute inset-0 z-50 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-fade-in"
          onClick={dismissHints}
        >
          <div className="text-center space-y-6 max-w-xs">
            <h3 className="text-lg font-bold text-foreground">Map Controls</h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-left">
                <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center flex-shrink-0">
                  <Move className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Drag to Pan</p>
                  <p className="text-xs text-muted-foreground">Use one finger to move around the globe</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-left">
                <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center flex-shrink-0">
                  <ZoomIn className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Pinch to Zoom</p>
                  <p className="text-xs text-muted-foreground">Use two fingers to zoom in and out</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-left">
                <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center flex-shrink-0">
                  <MousePointer2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Tap Markers</p>
                  <p className="text-xs text-muted-foreground">Tap threat markers to see details</p>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={dismissHints}
              className="w-full mt-4"
            >
              Got it
            </Button>
            
            <p className="text-[10px] text-muted-foreground">Tap anywhere to dismiss</p>
          </div>
        </div>
      )}
      
      {/* Controls */}
      <div className={cn(
        "absolute flex gap-1 z-10",
        isFullscreen ? "top-4 right-4" : (isMobile ? "top-2 right-2" : "top-4 right-14")
      )}>
        {isMobile && (
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="h-8 w-8 p-0 bg-card/80 backdrop-blur-sm border-border/50"
          >
            {isFullscreen ? <X className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        )}
        {!isFullscreen && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => { lightTap(); setIsExpanded(!isExpanded); }}
            className="h-8 w-8 p-0 bg-card/80 backdrop-blur-sm border-border/50"
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => { lightTap(); resetMapView(); }}
          className="h-8 w-8 p-0 bg-card/80 backdrop-blur-sm border-border/50"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        {isMobile && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => { lightTap(); setShowGestureHints(true); }}
            className="h-8 w-8 p-0 bg-card/80 backdrop-blur-sm border-border/50 text-[10px]"
          >
            ?
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className={cn(
        "absolute bg-card/80 backdrop-blur-sm rounded-lg border border-border/50 z-10",
        isFullscreen ? "top-4 left-4 p-3" : (isMobile ? "top-2 left-2 p-2" : "top-4 left-4 p-3")
      )}>
        <div className="flex items-center gap-2">
          <p className={cn(
            "text-muted-foreground",
            isMobile && !isFullscreen ? "text-[9px]" : "text-xs"
          )}>ACTIVE THREATS</p>
          {isUsingCache && (
            <div className="flex items-center gap-1 text-warning">
              <WifiOff className="h-3 w-3" />
              <span className={cn(
                "text-[8px]",
                !isMobile && "text-[10px]"
              )}>CACHED</span>
            </div>
          )}
        </div>
        <p className={cn(
          "font-bold font-mono text-foreground",
          isMobile && !isFullscreen ? "text-lg" : "text-2xl"
        )}>{threats.length}</p>
        {isUsingCache && (
          <p className="text-[8px] text-muted-foreground">{getCacheAge(CACHE_KEY)}</p>
        )}
      </div>
      
      {/* Legend */}
      {isMobile && !isFullscreen ? (
        <button
          onClick={() => { lightTap(); setShowLegend(!showLegend); }}
          className="absolute bottom-2 left-2 bg-card/80 backdrop-blur-sm rounded-lg border border-border/50 p-2 z-10"
        >
          {showLegend ? (
            <div className="space-y-1">
              <p className="text-[9px] text-muted-foreground font-semibold">THREATS ▼</p>
              {Object.entries(severityColors).map(([level, color]) => (
                <div key={level} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[9px] text-foreground capitalize">{level}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[9px] text-muted-foreground font-semibold">LEGEND ▶</p>
          )}
        </button>
      ) : (
        <div className={cn(
          "absolute bg-card/80 backdrop-blur-sm rounded-lg border border-border/50 z-10",
          isFullscreen ? "bottom-4 left-4 p-3" : "bottom-4 left-4 p-3"
        )}>
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
      )}

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
        .mapboxgl-ctrl-group {
          background: hsl(222 47% 8% / 0.8) !important;
          border: 1px solid hsl(222 30% 18% / 0.5) !important;
          backdrop-filter: blur(8px);
        }
        .mapboxgl-ctrl-group button {
          background: transparent !important;
        }
        .mapboxgl-ctrl-group button:hover {
          background: hsl(185 100% 50% / 0.1) !important;
        }
        .mapboxgl-ctrl-icon {
          filter: invert(1);
        }
      `}</style>
    </>
  );

  // Fullscreen portal
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[100] bg-background">
        <div className="relative w-full h-full">
          {mapContent}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "relative rounded-lg overflow-hidden transition-all duration-300",
        className
      )} 
      style={{ height: dynamicHeight }}
    >
      {mapContent}
    </div>
  );
};
