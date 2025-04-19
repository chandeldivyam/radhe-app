// ./apps/frontend/src/features/notes/components/AddNoteButton.tsx
import { useState } from "react";
import { Plus, Loader2 } from "lucide-react"; // Added Loader2
import { v4 as uuidv4 } from 'uuid';
import { Button } from "@/components/ui/button";
import { useZero } from "@/features/sync/use-zero";
import { toast } from "sonner";

// --- Updated Props ---
interface AddNoteButtonProps {
  getNextSortKey: () => string; // Function to get the next sort key
}

export function AddNoteButton({ getNextSortKey }: AddNoteButtonProps) {
  const z = useZero();
  const [isCreating, setIsCreating] = useState(false);

  const handleAddNote = async () => {
    if (!z || isCreating) { // Prevent double-clicks
      toast.error("Sync engine not ready or already creating.");
      return;
    }
    setIsCreating(true);
    try {
      const newNoteId = uuidv4();
      const newSortKey = getNextSortKey(); // Calculate the sort key

      console.log("Adding top-level note with sortKey:", newSortKey);

      // --- Call updated mutator ---
      await z.mutate.note.insert({
        noteId: newNoteId,
        title: "Untitled Note", // Or "" if you prefer truly empty
        content: "",
        parentId: null, // Explicitly null for top-level
        sortKey: newSortKey, // Pass the generated sort key
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      toast.success("Note created");
    } catch (error: any) {
      console.error("Failed to create note:", error);
      toast.error(`Failed to create note: ${error.message || 'Unknown error'}`);
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
      className="hover:scale-110 hover:bg-muted rounded-md" // Moved style from NoteList
    >
      {isCreating
        ? <Loader2 className="h-5 w-5 animate-spin" />
        : <Plus className="h-5 w-5" />
      }
    </Button>
  );
}