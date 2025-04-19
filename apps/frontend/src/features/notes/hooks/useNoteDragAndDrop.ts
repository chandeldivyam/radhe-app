import { useCallback } from "react";
import { useZero } from "@/features/sync/use-zero"; // Keep useZero here for the mutate call
import { getSortKeyBetweenItems } from "../utils/note-tree";
import type { NoteTreeData } from "../utils/note-tree";
import type { Note } from '../types/note'; // Import Note type
import { toast } from "sonner";

// --- DND Imports ---
import {
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
  arrayMove,
} from '@dnd-kit/sortable';
// --- End DND Imports ---

// --- Helper function to check ancestry ---
function isAncestor(
    potentialAncestorId: string,
    nodeId: string,
    notesById: Map<string, Note> // Use the basic Note type here is enough
): boolean {
    if (potentialAncestorId === nodeId) {
        return true; // Cannot drop onto itself
    }

    let currentNode = notesById.get(nodeId);
    let currentParentId = currentNode?.parentId;
    let depth = 0; // Safety break for potential cycles in bad data
    const maxDepth = 50; // Or adjust as needed

    while (currentParentId !== null && depth < maxDepth) {
        if (currentParentId === potentialAncestorId) {
            return true; // Found the potential ancestor in the chain
        }
        // Explicitly check if currentParentId is valid before using it as a key
        if (!currentParentId) {
             console.warn(`isAncestor check encountered null/undefined parentId unexpectedly.`);
             return false; // Should not happen if while loop condition is correct, but safe check
        }
        const parentNode = notesById.get(currentParentId);
        if (!parentNode) {
            console.warn(`isAncestor check failed: Parent node ${currentParentId} not found.`);
            return false; // Cannot determine ancestry if data is broken
        }
        currentParentId = parentNode.parentId;
        depth++;
    }

    if (depth >= maxDepth) {
        console.warn(`isAncestor check reached max depth limit (${maxDepth}). Assuming ancestor relationship to prevent potential infinite loop.`);
        return true; // Safer to prevent the move if depth limit reached
    }

    return false; // Reached root without finding the ancestor
}
// --- End Helper function ---


interface UseNoteDragAndDropProps {
  notesById: NoteTreeData['notesById'];
  childrenByParentId: NoteTreeData['childrenByParentId'];
  renderedNoteIds: string[]; // Pass the calculated rendered IDs
  isMovingNote: boolean;
  setIsMovingNote: (isMoving: boolean) => void;
  setDraggingNoteId: (id: UniqueIdentifier | null) => void;
  z: ReturnType<typeof useZero>; // Pass the z client instance
}

export function useNoteDragAndDrop({
  notesById,
  childrenByParentId,
  renderedNoteIds,
  isMovingNote,
  setIsMovingNote,
  setDraggingNoteId,
  z
}: UseNoteDragAndDropProps) {

  // --- DND Sensor Setup ---
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  // --- End DND Sensor Setup ---

  // --- DND Event Handlers ---
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setDraggingNoteId(event.active.id);
    setIsMovingNote(false); // Reset moving state on new drag
  }, [setDraggingNoteId, setIsMovingNote]);

  const handleDragCancel = useCallback(() => {
    setDraggingNoteId(null);
    setIsMovingNote(false);
  }, [setDraggingNoteId, setIsMovingNote]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggingNoteId(null); // Clear dragging ID regardless of outcome

    if (!over) {
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) {
      console.log("Drag End (hook): Dragged onto self, no action.");
      return;
    }

    if (!z) {
        toast.error("Sync engine not available.");
        return;
    }
    if (isMovingNote) {
        console.warn("Drag End (hook): Already processing a move.");
        return;
    }

    const activeNote = notesById.get(activeId);
    const overNote = notesById.get(overId);

    if (!activeNote || !overNote) {
      console.error(`Drag End Error (hook): Could not find active (${activeId}) or over (${overId}) note in notesById map.`);
      toast.error("Error processing note move: Note data missing.");
      return;
    }

    // --- NEW: Ancestor Check ---
    // Perform the check using the helper function
    // Check if the item being dragged (activeId) is an ancestor of, or the same as,
    // the item it's being dropped near (overId).
    if (isAncestor(activeId, overId, notesById)) {
        console.warn(`Drag End (hook): Invalid move attempt - Cannot move note "${activeNote.title || activeId}" into itself or one of its descendants (near "${overNote.title || overId}").`);
        toast.warning("Cannot move a note into itself or one of its children.");
        // Reset moving state if it was potentially set earlier (shouldn't be needed here, but safe)
        // if (isMovingNote) setIsMovingNote(false); // isMovingNote is checked above, so this isn't strictly needed
        return; // Abort the move
    }
    // --- END: Ancestor Check ---

    // Now we know the move is potentially valid, proceed.
    setIsMovingNote(true); // Set loading state *after* validation passes

    try {
        // --- Determine Target Parent and Siblings ---
        const overIndexInRendered = renderedNoteIds.indexOf(overId);
        if (overIndexInRendered === -1) {
             console.error(`Drag End Error (hook): 'over' note ${overId} not found in the current renderedNoteIds list. State might be inconsistent.`);
             toast.error("Error processing note move: Cannot determine drop position.");
             setIsMovingNote(false);
             return;
        }

        const targetParentId = overNote.parentId ?? null;

        const targetSiblings = childrenByParentId.get(targetParentId) ?? [];
        const targetSiblingIds = targetSiblings.map(note => note.noteId);

        const overIndexInSiblings = targetSiblingIds.indexOf(overId);
        if (overIndexInSiblings === -1) {
            console.error(`Drag End Error (hook): 'over' note ${overId} not found in its own calculated siblings list (parent: ${targetParentId}). This indicates a data structure inconsistency.`);
            toast.error("Error processing note move: Could not determine position among siblings.");
            setIsMovingNote(false);
            return;
        }

        let movedSiblingIds: string[];
        const originalActiveIndexInSiblings = targetSiblingIds.indexOf(activeId);

        if (originalActiveIndexInSiblings !== -1 && activeNote.parentId === targetParentId) {
            movedSiblingIds = arrayMove(targetSiblingIds, originalActiveIndexInSiblings, overIndexInSiblings);
        } else {
            const insertIndex = overIndexInSiblings;
            movedSiblingIds = [
                ...targetSiblingIds.slice(0, insertIndex),
                activeId,
                ...targetSiblingIds.slice(insertIndex)
            ];
        }

        const finalIndex = movedSiblingIds.indexOf(activeId);
        if (finalIndex === -1) {
            throw new Error("Failed to calculate final position.");
        }

        const prevId = finalIndex > 0 ? movedSiblingIds[finalIndex - 1] : null;
        const nextId = finalIndex < movedSiblingIds.length - 1 ? movedSiblingIds[finalIndex + 1] : null;

        const prevNote = prevId ? notesById.get(prevId) : null;
        const nextNote = nextId ? notesById.get(nextId) : null;

        const newSortKey = getSortKeyBetweenItems(prevNote, nextNote);
        const finalParentId = targetParentId ?? null;

        if (activeNote.parentId === finalParentId && activeNote.sortKey === newSortKey) {
            setIsMovingNote(false);
            return;
        }

        await z.mutate.note.update({
            noteId: activeId,
            parentId: finalParentId,
            sortKey: newSortKey,
            updatedAt: Date.now(),
        });

        toast.success(`Note "${activeNote.title || 'Untitled'}" moved.`);

    } catch (error: any) {
        toast.error(`Failed to move note: ${error.message || 'Unknown error'}`);
    } finally {
        setIsMovingNote(false);
    }
  }, [z, notesById, childrenByParentId, isMovingNote, renderedNoteIds, setIsMovingNote, setDraggingNoteId]); // Dependencies

  return {
    sensors,
    handleDragStart,
    handleDragEnd,
    handleDragCancel
  };
}
