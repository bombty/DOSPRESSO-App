import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "Silmek istediğinize emin misiniz?",
  description = "Bu işlem geri alınamaz. Devam etmek istiyor musunuz?",
  confirmText = "Evet, Sil",
  cancelText = "İptal",
  isLoading = false,
}: ConfirmDeleteDialogProps) {
  const [internalLoading, setInternalLoading] = useState(false);
  const loading = isLoading || internalLoading;

  const handleConfirm = async () => {
    try {
      setInternalLoading(true);
      await onConfirm();
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="confirm-delete-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle data-testid="text-delete-title">{title}</AlertDialogTitle>
          <AlertDialogDescription data-testid="text-delete-description">{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading} data-testid="button-delete-cancel">
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="button-delete-confirm"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function useConfirmDelete() {
  const [deleteState, setDeleteState] = useState<{
    open: boolean;
    itemId: string | number | null;
    itemName?: string;
  }>({ open: false, itemId: null });

  const requestDelete = (itemId: string | number, itemName?: string) => {
    setDeleteState({ open: true, itemId, itemName });
  };

  const cancelDelete = () => {
    setDeleteState({ open: false, itemId: null });
  };

  const confirmDelete = () => {
    const id = deleteState.itemId;
    setDeleteState({ open: false, itemId: null });
    return id;
  };

  return {
    deleteState,
    requestDelete,
    cancelDelete,
    confirmDelete,
    setDeleteState,
  };
}
