'use client';

import { useState } from 'react';
import { Button } from '@/client/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from '@/client/components/ui/dialog';
import { Input } from '@/client/components/ui/input';
import { Label } from '@/client/components/ui/label';
import { useToast } from '@/client/hooks/use-toast';
import { VisuallyHidden } from '@/client/components/ui/visually-hidden';

// Props for UpdateNameDialog.
interface UpdateNameDialogProps {
  // The user's current name.
  currentName: string;
  // Async function to call on save.
  onSave: (newName: string) => Promise<void>;
  // The trigger element for the dialog.
  children: React.ReactNode;
}

// A dialog for users to update their display name.
export function UpdateNameDialog({ currentName, onSave, children }: UpdateNameDialogProps) {
  // State for the new name input.
  const [name, setName] = useState(currentName);
  // Controls the dialog's open/closed state.
  const [isOpen, setIsOpen] = useState(false);
  // Tracks the saving state to disable UI.
  const [isSaving, setIsSaving] = useState(false);
  // Hook for displaying toast notifications.
  const { toast } = useToast();

  // Handles the save button click.
  const handleSave = async () => {
    // Prevents empty names.
    if (!name.trim()) {
      toast({
        title: 'Error',
        description: 'Name cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      // Calls the provided onSave function.
      await onSave(name);
      setIsOpen(false); // Close dialog on success.
      toast({
        title: 'Success',
        description: 'Your name has been updated',
      });
    } catch {
      // Shows error toast on failure.
      toast({
        title: 'Error',
        description: 'Failed to update name',
        variant: 'destructive',
      });
    } finally {
      // Re-enables UI after save attempt.
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {/* Child component acts as the dialog trigger. */}
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-[350px]" hideCloseButton>
          {/* Visually hidden labels for screen reader accessibility. */}
          <DialogTitle>
            <VisuallyHidden>Edit name</VisuallyHidden>
          </DialogTitle>
          <DialogDescription>
            <VisuallyHidden>Edit your name</VisuallyHidden>
          </DialogDescription>
        <div className="grid grid-cols-4 items-center gap-2">
            <Label htmlFor="name" className="text-center">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              disabled={isSaving} // Disable input while saving.
            />
        </div>
        <DialogFooter>
          {/* Save button shows saving state. */}
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}