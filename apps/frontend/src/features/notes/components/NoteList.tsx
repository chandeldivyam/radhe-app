// ./apps/frontend/src/features/notes/components/NoteList.tsx
import React, { useState, useMemo, useCallback } from "react";
import { useZero } from "@/features/sync/use-zero";
import { useQuery } from "@rocicorp/zero/react";
import { useParams } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddNoteButton } from "./AddNoteButton";
import { NoteItem } from "./NoteItem";
import { buildNoteTree, getSortKeyForNewItem, getSortKeyBetweenItems } from "../utils/note-tree";
import type { NoteTreeData, NoteWithChildren } from "../utils/note-tree";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Note } from "../types/note"; // Import Note type

// --- DND Imports ---
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragCancelEvent,
  DragOverlay, // Import DragOverlay
  UniqueIdentifier,
  MeasuringStrategy,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
// --- End DND Imports ---


export function NoteList() {
  const z = useZero();
  const params = useParams<{ noteId?: string }>();
  const activeNoteIdParam = params.noteId;

  const notesQuery = z?.query.note;
  const notesQueryResult = useQuery(notesQuery);
  const allNotes: Note[] | undefined = notesQueryResult?.[0];

  const [expandedNoteIds, setExpandedNoteIds] = useState<Record<string, boolean>>({});
  const [isMovingNote, setIsMovingNote] = useState(false);
  const [draggingNoteId, setDraggingNoteId] = useState<UniqueIdentifier | null>(null);

  // Process the flat list into a sorted tree structure
  const noteTreeData: NoteTreeData = useMemo(() => {
    console.log("Building note tree...");
    return buildNoteTree(allNotes);
  }, [allNotes]);

  const { tree: rootNotes, childrenByParentId, notesById } = noteTreeData;

  // --- *** NEW: Generate the ordered list of rendered IDs *** ---
  const renderedNoteIds = useMemo(() => {
    const ids: string[] = [];
    const collectIds = (notes: NoteWithChildren[]) => {
      for (const note of notes) {
        ids.push(note.noteId);
        // IMPORTANT: Only include children if the parent is expanded
        if (expandedNoteIds[note.noteId] && note.children && note.children.length > 0) {
          collectIds(note.children);
        }
      }
    };
    collectIds(rootNotes); // Start collection from root notes
    console.log("Rendered Note IDs for SortableContext:", ids.length); // Debug log
    return ids;
    // Dependencies: rootNotes (which depends on allNotes) and expandedNoteIds
  }, [rootNotes, expandedNoteIds]);
  // --- *** END NEW *** ---


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
    console.log("Drag Start:", event.active.id);
    setDraggingNoteId(event.active.id);
    setIsMovingNote(false);
  }, []);

  const handleDragCancel = useCallback(() => {
    console.log("Drag Cancelled");
    setDraggingNoteId(null);
    setIsMovingNote(false);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggingNoteId(null);

    if (!over) {
      console.log("Drag End: No 'over' target.");
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    console.log(`Drag End: Active=${activeId}, Over=${overId}`);

    if (activeId === overId) {
      console.log("Drag End: Dragged onto self, no action.");
      return;
    }

    if (!z) {
        toast.error("Sync engine not available.");
        console.error("Drag End: Zero client not available.");
        return;
    }
    if (isMovingNote) {
        console.warn("Drag End: Already processing a move.");
        return;
    }

    const activeNote = notesById.get(activeId);
    const overNote = notesById.get(overId);

    if (!activeNote || !overNote) {
      console.error(`Drag End Error: Could not find active (${activeId}) or over (${overId}) note in notesById map.`);
      toast.error("Error processing note move: Note data missing.");
      return;
    }

    console.log(`Attempting move: Note "${activeNote.title}" (${activeId}, parent=${activeNote.parentId}) over "${overNote.title}" (${overId}, parent=${overNote.parentId})`);

    setIsMovingNote(true);

    try {
        // --- Determine Target Parent and Siblings ---
        // Use the `renderedNoteIds` to find the correct context for placement.
        // The `overId` tells us which item we dropped onto. Its position in the
        // `renderedNoteIds` list gives us context relative to other *visible* items.
        const overIndexInRendered = renderedNoteIds.indexOf(overId);
        if (overIndexInRendered === -1) {
             console.error(`Drag End Error: 'over' note ${overId} not found in the current renderedNoteIds list. State might be inconsistent.`);
             toast.error("Error processing note move: Cannot determine drop position.");
             setIsMovingNote(false);
             return;
        }

        // Determine the *intended* previous and next visible items based on the drop position
        // Note: This logic assumes dropping *onto* an item means placing *before* it conceptually
        // when calculating sort keys relative to siblings. dnd-kit's collision detection often
        // places the `over` element slightly differently, so we need to be robust.

        // Let's refine the logic to calculate the correct neighbors *within the target parent's list*.
        // 1. Determine the target parent ID: It's usually the parent of the `over` note.
        const targetParentId = overNote.parentId ?? null;
        console.log(`Target Parent ID: ${targetParentId === null ? 'root' : targetParentId}`);

        // 2. Get the list of siblings under the target parent from our reliable source
        const targetSiblings = childrenByParentId.get(targetParentId) ?? [];
        const targetSiblingIds = targetSiblings.map(note => note.noteId);
        console.log(`Target Siblings (${targetSiblingIds.length}):`, targetSiblingIds);

        // 3. Find the index of the 'over' item within its actual siblings list
        const overIndexInSiblings = targetSiblingIds.indexOf(overId);
        if (overIndexInSiblings === -1) {
            console.error(`Drag End Error: 'over' note ${overId} not found in its own calculated siblings list (parent: ${targetParentId}). This indicates a data structure inconsistency.`);
            toast.error("Error processing note move: Could not determine position among siblings.");
            setIsMovingNote(false);
            return;
        }

        // 4. Simulate the move to find the final neighbors for sort key calculation
        let movedSiblingIds: string[];
        const originalActiveIndexInSiblings = targetSiblingIds.indexOf(activeId); // Check if it was already a sibling

        if (originalActiveIndexInSiblings !== -1 && activeNote.parentId === targetParentId) {
            // Reordering within the same parent
            movedSiblingIds = arrayMove(targetSiblingIds, originalActiveIndexInSiblings, overIndexInSiblings);
            console.log("Reordering siblings. Moved IDs:", movedSiblingIds);
        } else {
            // Moving to a new parent OR inserting relative to 'over' item
            // We insert the activeId *before* the overId in the target sibling list conceptually
            const insertIndex = overIndexInSiblings;
            movedSiblingIds = [
                ...targetSiblingIds.slice(0, insertIndex),
                activeId,
                ...targetSiblingIds.slice(insertIndex)
            ];
             console.log(`Changing parent/position. Inserted ID at index ${insertIndex}. Moved IDs:`, movedSiblingIds);
        }

        // 5. Find the final index of the moved item in the simulated list
        const finalIndex = movedSiblingIds.indexOf(activeId);
        if (finalIndex === -1) {
            console.error("Drag End Error: activeId not found in simulated movedSiblingIds. This should not happen.");
            throw new Error("Failed to calculate final position.");
        }
        console.log(`Final index of ${activeId} in simulated list: ${finalIndex}`);

        // 6. Determine the notes immediately before and after the final position *within this sibling group*
        const prevId = finalIndex > 0 ? movedSiblingIds[finalIndex - 1] : null;
        const nextId = finalIndex < movedSiblingIds.length - 1 ? movedSiblingIds[finalIndex + 1] : null;

        const prevNote = prevId ? notesById.get(prevId) : null;
        const nextNote = nextId ? notesById.get(nextId) : null;

        console.log(`Neighboring notes for sort key: Prev=${prevNote?.noteId ?? 'null'} (${prevNote?.sortKey}), Next=${nextNote?.noteId ?? 'null'} (${nextNote?.sortKey})`);

        // 7. Calculate the new sort key
        const newSortKey = getSortKeyBetweenItems(prevNote, nextNote);
        const finalParentId = targetParentId; // The parent is determined by the 'over' item's parent
        console.log(`Calculated new parentId: ${finalParentId}, newSortKey: ${newSortKey}`);

        // --- Check if Changes are Needed ---
        if (activeNote.parentId === finalParentId && activeNote.sortKey === newSortKey) {
            console.log("Drag end ignored: No actual change in parent or sort key.");
            setIsMovingNote(false);
            return; // No change needed
        }

        // --- Call Mutator ---
        console.log(`Executing update for note ${activeId}: parentId=${finalParentId}, sortKey=${newSortKey}`);
        await z.mutate.note.update({
            noteId: activeId,
            parentId: finalParentId,
            sortKey: newSortKey,
            updatedAt: Date.now(),
        });

        toast.success(`Note "${activeNote.title || 'Untitled'}" moved.`);

    } catch (error: any) {
        console.error("Failed to move note:", error);
        toast.error(`Failed to move note: ${error.message || 'Unknown error'}`);
    } finally {
        setIsMovingNote(false); // Indicate processing end
    }
    // Add renderedNoteIds to dependency array if used directly (it's used indirectly via overIndexInRendered)
  }, [z, notesById, childrenByParentId, isMovingNote, renderedNoteIds]); // Add renderedNoteIds here


  // --- Rendering ---
  const handleToggleExpand = useCallback((noteId: string) => {
    setExpandedNoteIds(prev => ({ ...prev, [noteId]: !prev[noteId] }));
  }, []);

  const getNextTopLevelSortKey = useCallback(() => {
    return getSortKeyForNewItem(null, childrenByParentId);
  }, [childrenByParentId]);

  // Recursive function to render notes - unchanged
  const renderNoteItems = useCallback((notes: NoteWithChildren[], level: number): React.ReactNode[] => {
    return notes.flatMap(note => [
      <NoteItem
        key={note.noteId} // Key must be stable and match ID used in SortableContext
        note={note}
        level={level}
        expandedNoteIds={expandedNoteIds}
        onToggleExpand={handleToggleExpand}
        activeNoteId={activeNoteIdParam}
        notesById={notesById}
        childrenByParentId={childrenByParentId}
      />,
      // Recursively render children if expanded
      ...( (expandedNoteIds[note.noteId] && note.children && note.children.length > 0)
           ? renderNoteItems(note.children, level + 1)
           : []
      )
    ]);
  }, [expandedNoteIds, handleToggleExpand, activeNoteIdParam, notesById, childrenByParentId]);


  // Find the note data for the DragOverlay - unchanged
  const draggingNoteData = useMemo(() => {
    if (!draggingNoteId) return null;
    return notesById.get(draggingNoteId as string) ?? null;
  }, [draggingNoteId, notesById]);

  // Find the level of the dragging note - unchanged
   const draggingNoteLevel = useMemo(() => {
    if (!draggingNoteData) return 0;
    let level = 0;
    let currentParentId = draggingNoteData.parentId;
    while (currentParentId !== null && level < 10) {
        const parent = notesById.get(currentParentId);
        if (!parent) break;
        level++;
        currentParentId = parent.parentId;
    }
    return level;
   }, [draggingNoteData, notesById]);


  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
    >
      <div className="relative flex h-full flex-col overflow-hidden border-r bg-muted/40 dark:bg-zinc-900/40">
        <div className="flex h-[60px] items-center justify-end border-b px-4 flex-shrink-0">
          <AddNoteButton getNextSortKey={getNextTopLevelSortKey} />
        </div>

        {/* --- *** Use the CORRECT ordered list of IDs *** --- */}
        <SortableContext items={renderedNoteIds} strategy={verticalListSortingStrategy}>
          <ScrollArea className="flex-1 min-h-0 p-2">
            {!allNotes || rootNotes.length === 0 && allNotes?.length === 0 ? ( // Check allNotes length as well
              <div className="p-4 text-center text-sm text-muted-foreground">
                No notes yet. Create one!
              </div>
            ) : (
              <nav className="space-y-1">
                {/* Render items recursively */}
                {renderNoteItems(rootNotes, 0)}
              </nav>
            )}
             {!notesQueryResult && !allNotes && ( // Show loading only if no query result AND no notes data yet
                 <div className="p-4 text-center text-sm text-muted-foreground">
                    Loading notes... <Loader2 className="inline-block h-4 w-4 animate-spin" />
                 </div>
            )}
          </ScrollArea>
        </SortableContext>
        {/* --- *** END CHANGE *** --- */}

         {/* Drag Overlay - Unchanged */}
         <DragOverlay dropAnimation={null}>
           {draggingNoteData ? (
             <NoteItem
               key={`overlay-${draggingNoteData.noteId}`}
               note={draggingNoteData}
               level={draggingNoteLevel}
               expandedNoteIds={expandedNoteIds}
               onToggleExpand={() => {}}
               activeNoteId={activeNoteIdParam}
               notesById={notesById}
               childrenByParentId={childrenByParentId}
             />
           ) : null}
         </DragOverlay>

        {/* Saving Indicator - Unchanged */}
        {isMovingNote && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-20 pointer-events-none">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm font-medium">Saving position...</span>
          </div>
        )}
      </div>
    </DndContext>
  );
}