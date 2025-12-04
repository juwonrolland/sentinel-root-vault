import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BiometricCredential {
  credentialId: string;
  publicKey: string;
  userId: string;
  email: string;
}

export const useBiometricAuth = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if WebAuthn is supported
    const checkSupport = async () => {
      const supported = 
        window.PublicKeyCredential !== undefined &&
        typeof window.PublicKeyCredential === 'function';
      
      if (supported) {
        try {
          // Check if platform authenticator (fingerprint/Face ID) is available
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setIsSupported(available);
        } catch {
          setIsSupported(false);
        }
      }
      
      // Check if user has enrolled biometrics
      const savedCredential = localStorage.getItem('biometric_credential');
      setIsEnrolled(!!savedCredential);
    };
    
    checkSupport();
  }, []);

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  };

  const enrollBiometric = useCallback(async (email: string, userId: string) => {
    if (!isSupported) {
      toast({
        title: 'Biometric Not Supported',
        description: 'Your device does not support biometric authentication',
        variant: 'destructive',
      });
      return false;
    }

    try {
      setIsAuthenticating(true);

      // Generate challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Create credential options
      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: 'Glorious Global Security',
          id: window.location.hostname,
        },
        user: {
          id: new TextEncoder().encode(userId),
          name: email,
          displayName: email.split('@')[0],
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Failed to create credential');
      }

      const response = credential.response as AuthenticatorAttestationResponse;
      
      // Store credential locally
      const biometricData: BiometricCredential = {
        credentialId: arrayBufferToBase64(credential.rawId),
        publicKey: arrayBufferToBase64(response.getPublicKey() || new ArrayBuffer(0)),
        userId,
        email,
      };

      localStorage.setItem('biometric_credential', JSON.stringify(biometricData));
      setIsEnrolled(true);

      toast({
        title: 'Biometric Enrolled',
        description: 'You can now use fingerprint or Face ID to sign in',
      });

      return true;
    } catch (error: any) {
      console.error('Biometric enrollment error:', error);
      toast({
        title: 'Enrollment Failed',
        description: error.message || 'Failed to enroll biometric',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  }, [isSupported, toast]);

  const authenticateWithBiometric = useCallback(async () => {
    if (!isSupported || !isEnrolled) {
      return null;
    }

    try {
      setIsAuthenticating(true);

      const savedCredential = localStorage.getItem('biometric_credential');
      if (!savedCredential) {
        throw new Error('No biometric credential found');
      }

      const biometricData: BiometricCredential = JSON.parse(savedCredential);

      // Generate challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        allowCredentials: [
          {
            id: base64ToArrayBuffer(biometricData.credentialId),
            type: 'public-key',
            transports: ['internal'],
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      };

      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      }) as PublicKeyCredential;

      if (!assertion) {
        throw new Error('Biometric authentication failed');
      }

      // Return the stored email for sign-in
      return biometricData;
    } catch (error: any) {
      console.error('Biometric authentication error:', error);
      
      if (error.name === 'NotAllowedError') {
        toast({
          title: 'Authentication Cancelled',
          description: 'Biometric authentication was cancelled',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Authentication Failed',
          description: error.message || 'Biometric authentication failed',
          variant: 'destructive',
        });
      }
      return null;
    } finally {
      setIsAuthenticating(false);
    }
  }, [isSupported, isEnrolled, toast]);

  const removeBiometric = useCallback(() => {
    localStorage.removeItem('biometric_credential');
    setIsEnrolled(false);
    toast({
      title: 'Biometric Removed',
      description: 'Biometric authentication has been disabled',
    });
  }, [toast]);

  return {
    isSupported,
    isEnrolled,
    isAuthenticating,
    enrollBiometric,
    authenticateWithBiometric,
    removeBiometric,
  };
};
