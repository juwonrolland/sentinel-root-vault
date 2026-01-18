import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useGeoLocation, WhoisData } from '@/hooks/useGeoLocation';
import { Globe, Search, Calendar, Server, Shield, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const DomainIntelligence: React.FC = () => {
  const [domain, setDomain] = useState('');
  const [whoisData, setWhoisData] = useState<WhoisData | null>(null);
  const { lookupDomain, isLoading } = useGeoLocation();

  const handleLookup = async () => {
    if (!domain.trim()) {
      toast.error('Please enter a domain name');
      return;
    }

    const result = await lookupDomain(domain);
    if (result.success && result.data) {
      setWhoisData(result.data);
      toast.success(`Domain ${result.data.domain} lookup complete`);
    } else {
      toast.error(result.error || 'Domain lookup failed');
    }
  };

  const getStatusBadge = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('active') || lowerStatus.includes('registered')) {
      return <Badge className="bg-success/20 text-success border-success/30">Active</Badge>;
    }
    if (lowerStatus.includes('available')) {
      return <Badge className="bg-info/20 text-info border-info/30">Available</Badge>;
    }
    if (lowerStatus.includes('pending') || lowerStatus.includes('hold')) {
      return <Badge className="bg-warning/20 text-warning border-warning/30">Pending</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <Card className="cyber-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Domain Intelligence (WHOIS)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Enter domain name (e.g., example.com)"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
            className="flex-1"
          />
          <Button onClick={handleLookup} disabled={isLoading} className="min-w-[100px]">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Search className="h-4 w-4 mr-1" />
                Lookup
              </>
            )}
          </Button>
        </div>

        {/* Results */}
        {whoisData && (
          <div className="space-y-4 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <h3 className="font-mono text-lg font-bold">{whoisData.domain}</h3>
                <p className="text-sm text-muted-foreground">Registrar: {whoisData.registrar}</p>
              </div>
              {getStatusBadge(whoisData.status)}
            </div>

            {/* Expiration Warning */}
            {whoisData.expirationWarning && (
              <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <span className="text-sm text-warning">Domain expires within 30 days!</span>
              </div>
            )}

            {/* Domain Age & Dates */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-card border rounded-lg">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Calendar className="h-3 w-3" />
                  Created
                </div>
                <p className="font-medium text-sm">{whoisData.createdDate}</p>
              </div>
              <div className="p-3 bg-card border rounded-lg">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Calendar className="h-3 w-3" />
                  Updated
                </div>
                <p className="font-medium text-sm">{whoisData.updatedDate}</p>
              </div>
              <div className="p-3 bg-card border rounded-lg">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Calendar className="h-3 w-3" />
                  Expires
                </div>
                <p className="font-medium text-sm">{whoisData.expiresDate}</p>
              </div>
              <div className="p-3 bg-card border rounded-lg">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Shield className="h-3 w-3" />
                  Age
                </div>
                <p className="font-medium text-sm">{whoisData.domainAge || 'N/A'}</p>
              </div>
            </div>

            {/* Registrant Info */}
            <div className="p-3 bg-card border rounded-lg">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Registrant Information
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Organization:</span>
                  <p className="font-medium">{whoisData.registrant.organization}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Country:</span>
                  <p className="font-medium">{whoisData.registrant.country}</p>
                </div>
              </div>
            </div>

            {/* Name Servers */}
            {whoisData.nameServers.length > 0 && (
              <div className="p-3 bg-card border rounded-lg">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Server className="h-4 w-4 text-info" />
                  Name Servers
                </h4>
                <div className="flex flex-wrap gap-2">
                  {whoisData.nameServers.map((ns, i) => (
                    <Badge key={i} variant="outline" className="font-mono text-xs">
                      {ns}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Security Assessment */}
            <div className="p-3 bg-card border rounded-lg">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                Security Assessment
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  {whoisData.domainAge && parseInt(whoisData.domainAge) >= 1 ? (
                    <CheckCircle className="h-3 w-3 text-success" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 text-warning" />
                  )}
                  <span>Domain Age</span>
                </div>
                <div className="flex items-center gap-1">
                  {whoisData.nameServers.length >= 2 ? (
                    <CheckCircle className="h-3 w-3 text-success" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 text-warning" />
                  )}
                  <span>DNS Redundancy</span>
                </div>
                <div className="flex items-center gap-1">
                  {!whoisData.expirationWarning ? (
                    <CheckCircle className="h-3 w-3 text-success" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 text-warning" />
                  )}
                  <span>Valid Expiry</span>
                </div>
                <div className="flex items-center gap-1">
                  {whoisData.registrar !== 'Unknown' ? (
                    <CheckCircle className="h-3 w-3 text-success" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 text-warning" />
                  )}
                  <span>Known Registrar</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!whoisData && !isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            <Globe className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Enter a domain name to lookup WHOIS information</p>
            <p className="text-xs mt-1">Powered by WhoisXML API</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
