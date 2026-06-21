'use client';

import { useState, useRef, memo, useEffect, lazy, Suspense, type ButtonHTMLAttributes } from 'react';
import { Button } from '@/client/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/client/components/ui/dialog';
import { VisuallyHidden } from '@/client/components/ui/visually-hidden';
import type { QRCodeScannerRef } from '@/client/components/leaderboard/QRCodeScanner';

// Dynamically import the QRCodeScanner component to lazy-load it.
const QRCodeScanner = lazy(() => import('@/client/components/leaderboard/QRCodeScanner').then(mod => ({ default: mod.QRCodeScanner })));

// Props for QRCodeScannerDialog.
type QRCodeScannerDialogProps = {
  // Callback on successful QR code scan.
  onScanSuccess: (decodedText: string) => void;
  // If true, the trigger button is smaller.
  small?: boolean;
  // Inherits button attributes, excluding 'onClick'.
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>;

// A dialog component that wraps the QR code scanner.
const QRCodeScannerDialog = memo<QRCodeScannerDialogProps>(({ onScanSuccess, small, className, ...rest }) => {
  // Controls the dialog's visibility.
  const [isOpen, setIsOpen] = useState(false);
  // Ref to access QRCodeScanner methods, like stopping the camera.
  const scannerRef = useRef<QRCodeScannerRef>(null);
  // Ref for the hidden file input, passed to the scanner.
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ensures the camera is released when the dialog closes.
  useEffect(() => {
    if (!isOpen) {
      scannerRef.current?.stopCameraScan();
    }
  }, [isOpen]);

  // Handles a successful scan, calls the parent callback, and closes the dialog.
  const handleScan = (decodedText: string) => {
    onScanSuccess(decodedText);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {/* The button that opens the QR code scanner dialog. */}
        <Button size={small ? 'sm' : 'default'} className={className} {...rest}>
          Scan QR code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xs" hideCloseButton>
        {/* Visually hide title and description for accessibility. */}
        <VisuallyHidden>
          <DialogTitle>Scan QR code</DialogTitle>
          <DialogDescription>
            Scan a QR code with your device&apos;s camera or upload an image to add a friend.
          </DialogDescription>
        </VisuallyHidden>
        <Suspense fallback={null}>
          <QRCodeScanner
            ref={scannerRef}
            onScanSuccess={handleScan}
            fileInputRef={fileInputRef}
          />
        </Suspense>
      </DialogContent>
    </Dialog>
  );
});

QRCodeScannerDialog.displayName = 'QRCodeScannerDialog';

export { QRCodeScannerDialog };