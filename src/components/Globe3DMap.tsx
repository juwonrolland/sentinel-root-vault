import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, Activity, Shield, Zap } from 'lucide-react';

interface NodeLocation {
  id: string;
  name: string;
  lng: number;
  lat: number;
  status: 'active' | 'defending' | 'spawning';
  connections: number;
}

interface AttackLine {
  id: string;
  from: [number, number];
  to: [number, number];
  type: 'attack' | 'defense';
}

const initialNodes: NodeLocation[] = [
  { id: '1', name: 'US-East', lng: -74.006, lat: 40.7128, status: 'active', connections: 245 },
  { id: '2', name: 'US-West', lng: -122.4194, lat: 37.7749, status: 'active', connections: 312 },
  { id: '3', name: 'London', lng: -0.1276, lat: 51.5074, status: 'active', connections: 198 },
  { id: '4', name: 'Frankfurt', lng: 8.6821, lat: 50.1109, status: 'active', connections: 276 },
  { id: '5', name: 'Tokyo', lng: 139.6917, lat: 35.6895, status: 'active', connections: 421 },
  { id: '6', name: 'Singapore', lng: 103.8198, lat: 1.3521, status: 'active', connections: 187 },
  { id: '7', name: 'Sydney', lng: 151.2093, lat: -33.8688, status: 'active', connections: 143 },
  { id: '8', name: 'São Paulo', lng: -46.6333, lat: -23.5505, status: 'active', connections: 156 },
  { id: '9', name: 'Mumbai', lng: 72.8777, lat: 19.076, status: 'active', connections: 234 },
  { id: '10', name: 'Dubai', lng: 55.2708, lat: 25.2048, status: 'active', connections: 167 },
];

export const Globe3DMap: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [nodes, setNodes] = useState<NodeLocation[]>(initialNodes);
  const [stats, setStats] = useState({
    totalNodes: 10,
    activeConnections: 2339,
    attacksBlocked: 0
  });

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
      center: [20, 20],
      pitch: 45,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      'top-right'
    );

    map.current.scrollZoom.disable();

    map.current.on('style.load', () => {
      map.current?.setFog({
        color: 'rgb(10, 15, 30)',
        'high-color': 'rgb(20, 30, 60)',
        'horizon-blend': 0.1,
        'star-intensity': 0.15,
        'space-color': 'rgb(5, 10, 20)',
      });
    });

    // Rotation settings
    const secondsPerRevolution = 180;
    const maxSpinZoom = 5;
    const slowSpinZoom = 3;
    let userInteracting = false;

    function spinGlobe() {
      if (!map.current) return;
      const zoom = map.current.getZoom();
      if (!userInteracting && zoom < maxSpinZoom) {
        let distancePerSecond = 360 / secondsPerRevolution;
        if (zoom > slowSpinZoom) {
          const zoomDif = (maxSpinZoom - zoom) / (maxSpinZoom - slowSpinZoom);
          distancePerSecond *= zoomDif;
        }
        const center = map.current.getCenter();
        center.lng -= distancePerSecond;
        map.current.easeTo({ center, duration: 1000, easing: (n) => n });
      }
    }

    map.current.on('mousedown', () => { userInteracting = true; });
    map.current.on('dragstart', () => { userInteracting = true; });
    map.current.on('mouseup', () => { userInteracting = false; spinGlobe(); });
    map.current.on('touchend', () => { userInteracting = false; spinGlobe(); });
    map.current.on('moveend', spinGlobe);

    spinGlobe();

    return () => {
      markersRef.current.forEach(m => m.remove());
      map.current?.remove();
    };
  }, []);

  // Add/update markers when nodes change
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Add markers for each node
    nodes.forEach(node => {
      const el = document.createElement('div');
      el.className = 'globe-node-marker';
      el.innerHTML = `
        <div class="relative">
          <div class="w-4 h-4 rounded-full ${
            node.status === 'active' ? 'bg-green-500' :
            node.status === 'defending' ? 'bg-red-500' :
            'bg-purple-500'
          } shadow-lg animate-pulse"></div>
          <div class="absolute -inset-2 rounded-full ${
            node.status === 'active' ? 'bg-green-500/30' :
            node.status === 'defending' ? 'bg-red-500/30' :
            'bg-purple-500/30'
          } animate-ping"></div>
        </div>
      `;
      el.style.cssText = 'cursor: pointer;';

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false })
        .setHTML(`
          <div class="p-2 bg-gray-900 rounded text-white text-sm">
            <div class="font-bold">${node.name}</div>
            <div class="text-xs text-gray-400">Status: ${node.status}</div>
            <div class="text-xs text-gray-400">Connections: ${node.connections}</div>
          </div>
        `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([node.lng, node.lat])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [nodes]);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Random attacks and defenses
      setNodes(prev => prev.map(node => {
        if (Math.random() > 0.9 && node.status === 'active') {
          setTimeout(() => {
            setNodes(p => p.map(n => 
              n.id === node.id ? { ...n, status: 'active' } : n
            ));
          }, 2000);
          return { ...node, status: 'defending' as const };
        }
        return {
          ...node,
          connections: Math.max(100, node.connections + Math.floor(Math.random() * 20 - 10))
        };
      }));

      setStats(prev => ({
        ...prev,
        activeConnections: nodes.reduce((sum, n) => sum + n.connections, 0),
        attacksBlocked: prev.attacksBlocked + Math.floor(Math.random() * 5)
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, [nodes]);

  return (
    <Card className="cyber-card border-primary/20 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5 text-primary" />
            3D Global Network Visualization
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-success/10 border-success/30 text-success">
              <Activity className="h-3 w-3 mr-1" />
              Live
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Map Container */}
        <div className="relative w-full h-[500px]">
          <div ref={mapContainer} className="absolute inset-0" />
          
          {/* Stats Overlay */}
          <div className="absolute top-4 left-4 space-y-2">
            <div className="p-3 bg-card/90 backdrop-blur-sm rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-success" />
                <span className="text-success font-bold">{nodes.filter(n => n.status === 'active').length}</span>
                <span className="text-muted-foreground">Active</span>
              </div>
            </div>
            <div className="p-3 bg-card/90 backdrop-blur-sm rounded-lg border border-destructive/20">
              <div className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-destructive" />
                <span className="text-destructive font-bold">{nodes.filter(n => n.status === 'defending').length}</span>
                <span className="text-muted-foreground">Defending</span>
              </div>
            </div>
            <div className="p-3 bg-card/90 backdrop-blur-sm rounded-lg border border-accent/20">
              <div className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4 text-accent" />
                <span className="text-accent font-bold">{stats.attacksBlocked}</span>
                <span className="text-muted-foreground">Blocked</span>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 right-4 p-3 bg-card/90 backdrop-blur-sm rounded-lg border border-border/50 text-xs space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success" />
              <span>Active Node</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              <span>Under Attack</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-accent" />
              <span>Spawning</span>
            </div>
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="grid grid-cols-3 gap-4 p-4 border-t border-border/50">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{stats.totalNodes}</div>
            <div className="text-xs text-muted-foreground">Global Nodes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-success">{stats.activeConnections.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Active Connections</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent">{stats.attacksBlocked}</div>
            <div className="text-xs text-muted-foreground">Attacks Blocked</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Globe3DMap;
