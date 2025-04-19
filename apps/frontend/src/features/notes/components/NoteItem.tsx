// ./apps/frontend/src/features/notes/components/NoteItem.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronDown, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils'; // Corrected import path
import { Button } from '@/components/ui/button'; // Corrected import path
import { toast } from 'sonner';
import { useZero } from '@/features/sync/use-zero'; // Corrected import path
import { v4 as uuidv4 } from 'uuid';
import type { NoteWithChildren, NoteTreeData } from '../utils/note-tree'; // Adjust path if needed

interface NoteItemProps {
  note: NoteWithChildren; // This note object might become stale regarding its .children array
  level: number;
  expandedNoteIds: Record<string, boolean>; // Added prop
  onToggleExpand: (noteId: string) => void; // Added prop
  activeNoteId?: string;
  onNoteAdded: () => void; // Added prop
  calculateNextPosition: (parentId: string | null) => number; // Prop name consistency
  // Pass the full maps for accurate checks
  notesById: NoteTreeData['notesById']; // Added prop
  childrenByParentId: NoteTreeData['childrenByParentId']; // Added prop
}

// Helper function defined locally or imported
function calculateNextPositionHelper(parentId: string | null, map: Map<string | null, NoteWithChildren[]>): number {
    const siblings = map.get(parentId ?? null) ?? [];
    if (siblings.length === 0) return 0;
    // Ensure position exists and default to 0 if not
    const maxPosition = Math.max(...siblings.map(n => n.position ?? 0));
    return maxPosition + 1;
}


export function NoteItem({
  note,
  level,
  expandedNoteIds,
  onToggleExpand,
  activeNoteId,
  onNoteAdded,
  calculateNextPosition,
  notesById,
  childrenByParentId
}: NoteItemProps) {
  const navigate = useNavigate();
  const z = useZero();
  const [isAddingChild, setIsAddingChild] = useState(false);

  // --- Crucial Changes Start ---

  // Determine if expanded based on the state map passed from parent
  const isExpanded = !!expandedNoteIds[note.noteId];

  // Determine if children exist using the potentially more up-to-date map
  const actualChildren = childrenByParentId.get(note.noteId) ?? [];
  const hasChildren = actualChildren.length > 0;

  // Get the child NoteWithChildren objects using the notesById map
  const childNoteObjects = actualChildren.map(childRef => notesById.get(childRef.noteId)).filter(Boolean) as NoteWithChildren[];


  // --- Crucial Changes End ---


  const isActive = note.noteId === activeNoteId;

  const handleNavigate = () => {
    navigate(`/notes/${note.noteId}`);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Only toggle if children actually exist (use the reliable check)
    if (hasChildren) {
      onToggleExpand(note.noteId);
    }
  };

  const handleAddChild = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!z || isAddingChild) return;

    setIsAddingChild(true);
    try {
      const parentId = note.noteId;
      // Use the reliable map to calculate next position
      const nextPosition = calculateNextPositionHelper(parentId, childrenByParentId);

      const newNoteId = uuidv4();
      const parentNote = notesById.get(parentId); // Get parent reliably
      const newDepth = (parentNote?.depth ?? -1) + 1;
      const parentPath = parentNote?.path;
      // Construct path carefully, handling root case
      const newPath = parentPath ? `${parentPath}.${nextPosition}` : `${nextPosition}`;


      await z.mutate.note.insert({
        noteId: newNoteId,
        title: '', // Start with empty title
        content: '',
        parentId: parentId,
        position: nextPosition,
        depth: newDepth,
        path: newPath,
        // Add any other required fields from your schema with default values
        createdAt: Date.now(),
        updatedAt: Date.now(),
        // userId: 'current_user_id' // Make sure to associate with the user if needed
      });

      toast.success("Child note created");
      onNoteAdded(); // Notify parent list (e.g., for potential refetch)

      // Expand the parent immediately after adding a child if it wasn't already
      if (!isExpanded) {
         onToggleExpand(parentId);
      }

      // Navigate after a short delay to allow state updates/rendering
      setTimeout(() => navigate(`/notes/${newNoteId}`), 50);
    } catch (error: any) {
        console.error("Failed to add child note:", error);
        toast.error(`Failed to add child: ${error.message || 'Unknown error'}`);
    } finally {
      setIsAddingChild(false);
    }
  };


  return (
    <>
      {/* Note Row */}
      <div
        className={cn(
          "group flex items-center justify-between w-full text-left text-sm font-medium rounded-md cursor-pointer",
          isActive
            ? "bg-primary text-primary-foreground"
            : "hover:bg-accent hover:text-accent-foreground",
        )}
        style={{ paddingLeft: `${level * 1.25 + 0.75}rem` }}
        onClick={handleNavigate}
      >
        {/* Expand/Collapse Toggle */}
        <button
          onClick={handleToggle}
          className={cn(
            "flex-shrink-0 mr-1 rounded-sm",
            // Use the reliable 'hasChildren' check for visibility and disabled state
            !hasChildren && "invisible", // Hide if no children
            isActive ? "hover:bg-primary/80" : "hover:bg-muted"
          )}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
          aria-expanded={isExpanded}
          // Disable ONLY if no children exist
          disabled={!hasChildren}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : (
            // Keep placeholder for alignment even if invisible
            <span className="inline-block h-4 w-4"></span>
          )}
        </button>

        {/* Note Title */}
        <span className="truncate flex-grow py-2">
          {note.title || "Untitled Note"}
        </span>

        {/* Add Child Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleAddChild}
          className={cn(
            "flex-shrink-0 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity",
             isActive ? "text-primary-foreground hover:bg-primary/80" : "text-muted-foreground hover:bg-muted"
          )}
          disabled={isAddingChild || !z}
          aria-label="Add child note"
        >
          {isAddingChild ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>

      {/* Render Children Recursively */}
      {/* Use the reliable hasChildren check AND the isExpanded state */}
      {hasChildren && isExpanded && (
        <div className="mt-1 space-y-1">
          {/* Render using the fetched childNoteObjects */}
          {childNoteObjects.map((childNote) => (
              <NoteItem
                key={childNote.noteId}
                note={childNote} // Pass the correct child object
                level={level + 1}
                expandedNoteIds={expandedNoteIds} // Pass map down
                onToggleExpand={onToggleExpand}   // Pass handler down
                activeNoteId={activeNoteId}
                onNoteAdded={onNoteAdded} // Pass handler down
                calculateNextPosition={calculateNextPosition} // Pass helper down
                // Pass the maps down for the next level
                notesById={notesById}
                childrenByParentId={childrenByParentId}
              />
            ))}
        </div>
      )}
    </>
  );
}
