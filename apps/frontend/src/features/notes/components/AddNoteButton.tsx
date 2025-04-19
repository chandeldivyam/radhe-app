// ./apps/frontend/src/features/notes/components/AddNoteButton.tsx
import { useState } from "react";
import { Plus } from "lucide-react";
import { v4 as uuidv4 } from 'uuid'; // Need to install uuid
import { Button } from "@/components/ui/button";
import { useZero } from "@/features/sync/use-zero";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function AddNoteButton({ position }: { position: number }) {
  const z = useZero();
  const [isCreating, setIsCreating] = useState(false);

  const handleAddNote = async () => {
    if (!z) {
      toast.error("Sync engine not ready.");
      return;
    }
    setIsCreating(true);
    try {
      const newNoteId = uuidv4();
      // Simple sequential addition for now.
      // Later, position/path/depth might need calculation based on context.
      await z.mutate.note.insert({
        noteId: newNoteId,
        title: "Untitled Note", // Start with an empty title
        content: "", // Start with empty content
        parentId: null, // Top-level note for now
        position: position, // Default position, adjust later if needed
        path: null, // Default path, adjust later if needed
        depth: 0, // Default depth, adjust later if needed
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      toast.success("Note created");
      // Optionally: navigate to the new note or select it
    } catch (error) {
      console.error("Failed to create note:", error);
      toast.error("Failed to create note. See console for details.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleAddNote}
      disabled={isCreating || !z}
      aria-label="Add new note"
    >
      <Plus className={cn("h-5 w-5", isCreating && "animate-spin")} />
    </Button>
  );
}