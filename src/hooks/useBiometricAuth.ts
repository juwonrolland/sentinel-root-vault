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

  // Derive an AES-GCM key from the credentialId (stable per-device secret)
  const deriveKey = async (credentialId: string): Promise<CryptoKey> => {
    const enc = new TextEncoder();
    const base = await crypto.subtle.importKey(
      'raw', enc.encode(credentialId), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: enc.encode('biometric-meta-v1'), iterations: 100_000, hash: 'SHA-256' },
      base,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  };

  const encryptMeta = async (credentialId: string, payload: { userId: string; email: string }) => {
    const key = await deriveKey(credentialId);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = new TextEncoder().encode(JSON.stringify(payload));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
    return { iv: arrayBufferToBase64(iv.buffer), ct: arrayBufferToBase64(ct) };
  };

  const decryptMeta = async (
    credentialId: string,
    blob: { iv: string; ct: string }
  ): Promise<{ userId: string; email: string }> => {
    const key = await deriveKey(credentialId);
    const iv = new Uint8Array(base64ToArrayBuffer(blob.iv));
    const pt = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv }, key, base64ToArrayBuffer(blob.ct)
    );
    return JSON.parse(new TextDecoder().decode(pt));
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

      const credentialId = arrayBufferToBase64(credential.rawId);
      const publicKey = arrayBufferToBase64(response.getPublicKey() || new ArrayBuffer(0));

      // Store only public WebAuthn data in localStorage
      localStorage.setItem(
        'biometric_credential',
        JSON.stringify({ credentialId, publicKey })
      );

      // Encrypt PII (userId/email) at rest using key derived from credentialId
      const metaBlob = await encryptMeta(credentialId, { userId, email });
      localStorage.setItem('biometric_meta', JSON.stringify(metaBlob));

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
      const savedMeta = localStorage.getItem('biometric_meta');
      if (!savedCredential || !savedMeta) {
        throw new Error('No biometric credential found');
      }

      const publicData: { credentialId: string; publicKey: string } = JSON.parse(savedCredential);

      // Generate challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        allowCredentials: [
          {
            id: base64ToArrayBuffer(publicData.credentialId),
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

      // Decrypt PII only after successful biometric verification
      const meta = await decryptMeta(publicData.credentialId, JSON.parse(savedMeta));
      return { ...publicData, ...meta } as BiometricCredential;
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
    localStorage.removeItem('biometric_meta');
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
