import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RegisteredNetwork {
  id: string;
  name: string;
  networkRange: string;
  vlanId?: string;
  gateway: string;
  sector: string;
  registeredBy: string;
  registeredAt: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  devices: RegisteredDevice[];
  metadata: {
    contactPerson?: string;
    contactEmail?: string;
    location?: string;
    securityLevel: 'standard' | 'elevated' | 'classified' | 'top-secret';
    complianceFrameworks: string[];
  };
  lastScanned?: string;
  threatScore: number;
  isVerified: boolean;
}

export interface RegisteredDevice {
  id: string;
  networkId: string;
  name: string;
  type: 'server' | 'router' | 'switch' | 'firewall' | 'workstation' | 'mobile' | 'iot' | 'cloud';
  ipAddress: string;
  macAddress?: string;
  port?: number;
  status: 'online' | 'offline' | 'warning' | 'critical';
  lastSeen: string;
  threats: number;
  isMonitored: boolean;
}

const STORAGE_KEY = 'sentinel-registered-networks';

export const useRegisteredNetworks = () => {
  const [networks, setNetworks] = useState<RegisteredNetwork[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load networks from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setNetworks(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Failed to load registered networks:', err);
      setError('Failed to load registered networks');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save to localStorage whenever networks change
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(networks));
    }
  }, [networks, isLoading]);

  const registerNetwork = useCallback(async (network: Omit<RegisteredNetwork, 'id' | 'registeredAt' | 'devices' | 'threatScore' | 'isVerified'>) => {
    const newNetwork: RegisteredNetwork = {
      ...network,
      id: `net-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      registeredAt: new Date().toISOString(),
      devices: [],
      threatScore: 0,
      isVerified: false,
    };

    setNetworks(prev => [...prev, newNetwork]);

    // Log to security audit
    try {
      await supabase.from('security_audit_log').insert({
        event_type: 'network_registration',
        event_category: 'infrastructure',
        severity: 'info',
        resource_accessed: newNetwork.networkRange,
        action_performed: `Registered network: ${newNetwork.name}`,
        metadata: { network_id: newNetwork.id, sector: newNetwork.sector }
      });
    } catch (err) {
      console.error('Failed to log network registration:', err);
    }

    return newNetwork;
  }, []);

  const updateNetwork = useCallback((networkId: string, updates: Partial<RegisteredNetwork>) => {
    setNetworks(prev => prev.map(net => 
      net.id === networkId ? { ...net, ...updates } : net
    ));
  }, []);

  const removeNetwork = useCallback(async (networkId: string) => {
    const network = networks.find(n => n.id === networkId);
    setNetworks(prev => prev.filter(net => net.id !== networkId));

    if (network) {
      try {
        await supabase.from('security_audit_log').insert({
          event_type: 'network_removal',
          event_category: 'infrastructure',
          severity: 'warning',
          resource_accessed: network.networkRange,
          action_performed: `Removed network: ${network.name}`,
          metadata: { network_id: networkId, sector: network.sector }
        });
      } catch (err) {
        console.error('Failed to log network removal:', err);
      }
    }
  }, [networks]);

  const addDeviceToNetwork = useCallback((networkId: string, device: Omit<RegisteredDevice, 'id' | 'networkId'>) => {
    const newDevice: RegisteredDevice = {
      ...device,
      id: `dev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      networkId,
    };

    setNetworks(prev => prev.map(net => 
      net.id === networkId 
        ? { ...net, devices: [...net.devices, newDevice] }
        : net
    ));

    return newDevice;
  }, []);

  const updateDevice = useCallback((networkId: string, deviceId: string, updates: Partial<RegisteredDevice>) => {
    setNetworks(prev => prev.map(net => 
      net.id === networkId 
        ? { 
            ...net, 
            devices: net.devices.map(dev => 
              dev.id === deviceId ? { ...dev, ...updates } : dev
            )
          }
        : net
    ));
  }, []);

  const removeDevice = useCallback((networkId: string, deviceId: string) => {
    setNetworks(prev => prev.map(net => 
      net.id === networkId 
        ? { ...net, devices: net.devices.filter(dev => dev.id !== deviceId) }
        : net
    ));
  }, []);

  const isNetworkRegistered = useCallback((ipAddress: string) => {
    return networks.some(net => {
      const [networkBase] = net.networkRange.split('/');
      const networkParts = networkBase.split('.').slice(0, 3).join('.');
      const ipParts = ipAddress.split('.').slice(0, 3).join('.');
      return networkParts === ipParts || net.devices.some(d => d.ipAddress === ipAddress);
    });
  }, [networks]);

  const isDeviceRegistered = useCallback((ipAddress: string) => {
    return networks.some(net => net.devices.some(d => d.ipAddress === ipAddress));
  }, [networks]);

  const getNetworkByIp = useCallback((ipAddress: string) => {
    return networks.find(net => {
      const [networkBase] = net.networkRange.split('/');
      const networkParts = networkBase.split('.').slice(0, 3).join('.');
      const ipParts = ipAddress.split('.').slice(0, 3).join('.');
      return networkParts === ipParts;
    });
  }, [networks]);

  const verifyNetwork = useCallback(async (networkId: string) => {
    setNetworks(prev => prev.map(net => 
      net.id === networkId ? { ...net, isVerified: true, status: 'active' } : net
    ));

    try {
      await supabase.from('security_audit_log').insert({
        event_type: 'network_verification',
        event_category: 'infrastructure',
        severity: 'info',
        action_performed: `Network verified: ${networkId}`,
        metadata: { network_id: networkId }
      });
    } catch (err) {
      console.error('Failed to log network verification:', err);
    }
  }, []);

  const getActiveNetworks = useCallback(() => {
    return networks.filter(net => net.status === 'active');
  }, [networks]);

  const getTotalDevices = useCallback(() => {
    return networks.reduce((sum, net) => sum + net.devices.length, 0);
  }, [networks]);

  const getSecurityStats = useCallback(() => {
    const activeNetworks = networks.filter(n => n.status === 'active').length;
    const totalDevices = getTotalDevices();
    const onlineDevices = networks.reduce((sum, net) => 
      sum + net.devices.filter(d => d.status === 'online').length, 0
    );
    const threats = networks.reduce((sum, net) => 
      sum + net.devices.reduce((s, d) => s + d.threats, 0), 0
    );
    const avgThreatScore = networks.length > 0 
      ? networks.reduce((sum, net) => sum + net.threatScore, 0) / networks.length 
      : 0;

    return {
      activeNetworks,
      totalDevices,
      onlineDevices,
      offlineDevices: totalDevices - onlineDevices,
      threats,
      avgThreatScore,
      verifiedNetworks: networks.filter(n => n.isVerified).length,
    };
  }, [networks, getTotalDevices]);

  return {
    networks,
    isLoading,
    error,
    registerNetwork,
    updateNetwork,
    removeNetwork,
    addDeviceToNetwork,
    updateDevice,
    removeDevice,
    isNetworkRegistered,
    isDeviceRegistered,
    getNetworkByIp,
    verifyNetwork,
    getActiveNetworks,
    getTotalDevices,
    getSecurityStats,
  };
};
