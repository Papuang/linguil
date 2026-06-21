'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback, memo } from 'react';
import type { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

// Dynamically import `html5-qrcode` to reduce bundle size.
const getHtml5Qrcode = () => import('html5-qrcode');

// Props for QRCodeScanner.
type QRCodeScannerProps = {
  // Callback on successful QR code scan.
  onScanSuccess: (decodedText: string) => void;
  // Ref to the hidden file input.
  fileInputRef: React.Ref<HTMLInputElement>;
};

// Methods exposed by the QRCodeScanner component ref.
export type QRCodeScannerRef = {
  // Stops the active camera scan.
  stopCameraScan: () => Promise<void>;
};

// A memoized QR code scanner using camera or image upload.
const QRCodeScanner = memo(forwardRef<QRCodeScannerRef, QRCodeScannerProps>(({ onScanSuccess, fileInputRef }, ref) => {
  const scannerRef = useRef<HTMLDivElement>(null); // Ref for the scanner container.
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null); // Ref for the html5-qrcode instance.
  
  // Manages the current view: idle, scanning, or error.
  const [view, setView] = useState<'idle' | 'scanning' | 'error'>('idle');
  // Stores error messages during scanning.
  const [errorMessage, setErrorMessage] = useState<string>('Error starting camera scan');

  // Stops the camera scan.
  const stopCameraScan = useCallback(async (): Promise<void> => {
    if (html5QrCodeRef.current?.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch {
        // Ignore errors on stop, component may be unmounting.
      }
    }
    html5QrCodeRef.current = null;
    setView('idle');
  }, []);

  // Exposes `stopCameraScan` via ref.
  useImperativeHandle(ref, () => ({ stopCameraScan }));

  // Starts and stops the camera scan based on the 'view' state.
  useEffect(() => {
    let isMounted = true;

    const startScan = async () => {
      if (!scannerRef.current) return;

      // Dynamically load required modules.
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await getHtml5Qrcode();

      // Create a new scanner instance.
      const newHtml5QrCode = new Html5Qrcode(scannerRef.current.id, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      html5QrCodeRef.current = newHtml5QrCode;

      try {
        // Start scanning with the environment-facing camera.
        await newHtml5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 250, aspectRatio: 1 },
          (decodedText) => {
            if (isMounted) onScanSuccess(decodedText);
          },
          () => {} // Empty on-scan-failure callback.
        );
      } catch (err: unknown) {
        if (!isMounted) return;

        // Check for camera permission errors.
        const isNotAllowedError = (err instanceof Error && err.name === 'NotAllowedError') ||
                                  (typeof err === 'string' && err.includes('NotAllowedError'));

        if (isNotAllowedError) {
          setErrorMessage('Allow camera access in your browser settings');
        } else {
          setErrorMessage('Error starting camera scan');
        }
        setView('error');
      }
    };

    if (view === 'scanning') {
      startScan();
    }

    // Cleanup to stop the scan on unmount.
    return () => {
      isMounted = false;
      if (html5QrCodeRef.current?.isScanning) {
        stopCameraScan();
      }
    };
  }, [view, onScanSuccess, stopCameraScan]);

  // Programmatically clicks the hidden file input.
  const handleFileSelect = () => {
    if (fileInputRef && 'current' in fileInputRef) {
        fileInputRef.current?.click();
    }
  };

  // Handles file input change for scanning QR from an image.
  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    event.target.value = ''; // Reset input for re-selection.

    if (!scannerRef.current) {
      return;
    }

    try {
      const { Html5Qrcode } = await getHtml5Qrcode();
      const newHtml5QrCode = new Html5Qrcode(scannerRef.current.id, false);
      const decodedText = await newHtml5QrCode.scanFile(file, true);
      onScanSuccess(decodedText);
    } catch {
      toast({
        title: 'Missing QR code',
        description: 'No QR code found in the uploaded image',
        variant: 'destructive',
      });
    }
  }, [onScanSuccess]);

  // Sets view to 'scanning' to start the camera.
  const handleStartScanRequest = () => {
    setErrorMessage('');
    setView('scanning');
  };

  return (
    <div>
      {/* Container for the camera feed. */}
      <div 
        id="qr-reader"
        ref={scannerRef} 
        style={{ display: view === 'scanning' ? 'block' : 'none', width: '100%', aspectRatio: '1 / 1' }}
      />

      {/* Initial view with camera and upload options. */}
      {view === 'idle' && (
        <div className="flex flex-col space-y-2">
          <Button onClick={handleStartScanRequest}>Open camera</Button>
          <Button onClick={handleFileSelect}>Upload image</Button>
        </div>
      )}

      {/* Error view with message and retry button. */}
      {view === 'error' && (
        <div className="flex flex-col space-y-2 text-center">
          <p className="text-red-500 text-sm">{errorMessage}</p>
          <Button onClick={handleStartScanRequest}>Try again</Button>
        </div>
      )}

      {/* Hidden file input for QR code images. */}
      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
    </div>
  );
}));

QRCodeScanner.displayName = 'QRCodeScanner';

export { QRCodeScanner };