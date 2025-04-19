// ./apps/frontend/src/features/notes/components/NoteList.tsx
import React, { useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom"; // Added useNavigate
import { ScrollArea } from '../../../components/ui/scroll-area'; // Corrected path
import { AddNoteButton } from "./AddNoteButton";
import { NoteItem } from "./NoteItem";
import { getSortKeyForNewItem } from "../utils/note-tree";
import type { NoteWithChildren } from "../utils/note-tree";
import { Loader2 } from "lucide-react";
import { toast } from "sonner"; // Import toast
import { cn } from "../../../lib/utils"; // Import cn

// --- Hook Imports ---
import { useNoteTreeData } from "../hooks/useNoteTreeData";
import { useNoteListState } from "../hooks/useNoteListState";
import { useNoteDragAndDrop } from "../hooks/useNoteDragAndDrop";

// --- DND Imports ---
import {
  DndContext,
  closestCenter,
  DragOverlay,
  MeasuringStrategy,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

// --- Shadcn UI Imports ---
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog'; // Corrected path

export function NoteList() {
  const params = useParams<{ noteId?: string }>();
  const navigate = useNavigate(); // Add useNavigate
  const activeNoteIdParam = params.noteId;

  // --- Use Custom Hooks ---
  const {
    tree: rootNotes,
    notesById,
    childrenByParentId,
    allNotes,
    isLoading,
    z // Get z client from data hook
  } = useNoteTreeData();

  const {
    expandedNoteIds,
    isMovingNote, // DND saving state
    draggingNoteId,
    handleToggleExpand,
    setIsMovingNote,
    setDraggingNoteId,
    // --- Deletion State & Handlers ---
    noteToDeleteId,     // ID of note pending delete confirmation
    isDeletingNote,     // Loading state for the delete mutation
    requestDeleteNote,  // Opens the confirmation dialog
    cancelDeleteNote,   // Closes the dialog without deleting
    confirmDeleteNote,  // User confirmed, triggers actual delete
    finishDeleteNote,   // Resets delete state after mutation
  } = useNoteListState();

  // --- Generate the ordered list of rendered IDs ---
  const renderedNoteIds = useMemo(() => {
    const ids: string[] = [];
    const collectIds = (notes: NoteWithChildren[]) => {
      for (const note of notes) {
        ids.push(note.noteId);
        if (expandedNoteIds[note.noteId] && note.children?.length > 0) {
          collectIds(note.children);
        }
      }
    };
    collectIds(rootNotes);
    return ids;
  }, [rootNotes, expandedNoteIds]);


  // --- Use Drag and Drop Hook ---
  const {
    sensors,
    handleDragStart,
    handleDragEnd,
    handleDragCancel
  } = useNoteDragAndDrop({
    notesById, // Keep the first instance
    childrenByParentId, // Keep the first instance
    renderedNoteIds, // Keep the first instance
    isMovingNote, // Keep the first instance
    setIsMovingNote, // Keep the first instance
    setDraggingNoteId,
    z
  });

  // --- Deletion Logic ---
  const handleConfirmDelete = useCallback(async () => {
      if (!noteToDeleteId || !z) {
          finishDeleteNote(); // Reset state even on error
          return;
      }

      // Call the state hook function that sets isDeletingNote = true
      confirmDeleteNote();

      const noteBeingDeleted = notesById.get(noteToDeleteId); // For toast message

      try {
          await z.mutate.note.delete({ noteId: noteToDeleteId });

          toast.success(`Note "${noteBeingDeleted?.title || 'Untitled'}" and its children deleted.`);

          // If the currently active note was deleted, navigate away
          if (activeNoteIdParam === noteToDeleteId) {
              navigate('/'); // Navigate to a safe default route
          }
          // Optionally: Collapse parent if it becomes childless? (More complex state update)

      } catch (error: any) {
          toast.error(`Failed to delete note: ${error.message || 'Unknown error'}`);
      } finally {
          finishDeleteNote(); // Reset isDeletingNote and noteToDeleteId
      }
  }, [noteToDeleteId, z, notesById, activeNoteIdParam, navigate, confirmDeleteNote, finishDeleteNote]);


  // --- Rendering Helpers ---
  const getNextTopLevelSortKey = useCallback(() => {
    return getSortKeyForNewItem(null, childrenByParentId);
  }, [childrenByParentId]);

  // Recursive function to render notes
  const renderNoteItems = useCallback((notes: NoteWithChildren[], level: number): React.ReactNode[] => {
    return notes.flatMap(note => {
      // Check if this specific note is the one currently targeted for deletion
      const isNoteCurrentlyDeleting = isDeletingNote && noteToDeleteId === note.noteId;
      return [
        <NoteItem
          key={note.noteId}
          note={note}
          level={level}
          expandedNoteIds={expandedNoteIds}
          onToggleExpand={handleToggleExpand}
          activeNoteId={activeNoteIdParam}
          notesById={notesById}
          childrenByParentId={childrenByParentId}
          // --- Pass Deletion Props ---
          onRequestDelete={requestDeleteNote} // Pass function to open dialog
          isDeleting={isNoteCurrentlyDeleting} // Pass deleting status for this specific note
        />,
        ...( (expandedNoteIds[note.noteId] && note.children?.length > 0)
             ? renderNoteItems(note.children, level + 1)
             : []
        )
      ];
    });
  }, [
      expandedNoteIds, handleToggleExpand, activeNoteIdParam, notesById,
      childrenByParentId, requestDeleteNote, isDeletingNote, noteToDeleteId // Add deletion state dependencies
  ]);


  // Find the note data for the DragOverlay
  const draggingNoteData = useMemo(() => {
    if (!draggingNoteId) return null;
    return notesById.get(draggingNoteId as string) ?? null;
  }, [draggingNoteId, notesById]);

  // Find the level of the dragging note
   const draggingNoteLevel = useMemo(() => {
    if (!draggingNoteData) return 0;
    let level = 0;
    let currentParentId = draggingNoteData.parentId;
    while (currentParentId !== null && level < 10) { // Limit depth for safety
        const parent = notesById.get(currentParentId);
        if (!parent) break;
        level++;
        currentParentId = parent.parentId;
    }
    return level;
   }, [draggingNoteData, notesById]);

  // Get title for confirmation dialog
  const noteToDeleteTitle = useMemo(() => {
      if (!noteToDeleteId) return "";
      return notesById.get(noteToDeleteId)?.title || "Untitled Note";
  }, [noteToDeleteId, notesById]);


  // --- Main Render ---
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
        {/* Header */}
        <div className="flex h-[60px] items-center justify-end border-b px-4 flex-shrink-0">
          <AddNoteButton getNextSortKey={getNextTopLevelSortKey} />
        </div>

        {/* Sortable List */}
        <SortableContext items={renderedNoteIds} strategy={verticalListSortingStrategy}>
          <ScrollArea className="flex-1 min-h-0 p-2">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading notes... <Loader2 className="inline-block h-4 w-4 animate-spin" />
              </div>
            ) : rootNotes.length === 0 && allNotes?.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No notes yet. Create one!
              </div>
            ) : (
              <nav className="space-y-1">
                {renderNoteItems(rootNotes, 0)}
              </nav>
            )}
          </ScrollArea>
        </SortableContext>

         {/* Drag Overlay */}
         <DragOverlay dropAnimation={null}>
           {draggingNoteData ? (
             <NoteItem
               key={`overlay-${draggingNoteData.noteId}`}
               note={draggingNoteData}
               level={draggingNoteLevel}
               expandedNoteIds={expandedNoteIds}
               onToggleExpand={() => {}} // Overlay item doesn't toggle expand
               activeNoteId={activeNoteIdParam}
               notesById={notesById}
               childrenByParentId={childrenByParentId}
               // --- Pass Deletion Props to Overlay Item ---
               // Overlay item cannot be deleted interactively, so pass defaults
               onRequestDelete={() => {}}
               isDeleting={false}
             />
           ) : null}
         </DragOverlay>

        {/* --- Saving/Deleting Indicator --- */}
        {(isMovingNote || isDeletingNote) && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-20 pointer-events-none">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm font-medium">
              {isMovingNote ? 'Saving position...' : 'Deleting note...'}
            </span>
          </div>
        )}

        {/* --- Delete Confirmation Dialog --- */}
        <AlertDialog open={!!noteToDeleteId} onOpenChange={(open) => !open && cancelDeleteNote()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the note
                    <strong className="mx-1">"{noteToDeleteTitle}"</strong>
                    and all of its descendants.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={cancelDeleteNote} disabled={isDeletingNote}>
                    Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                    onClick={handleConfirmDelete}
                    disabled={isDeletingNote}
                    className={cn(isDeletingNote && "cursor-not-allowed opacity-50")} // Style disabled action
                    // Use destructive variant if available in your theme
                    // variant="destructive" // Uncomment if you have a destructive variant
                 >
                    {isDeletingNote ? (
                        <>
                           <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
                        </>
                    ) : (
                        "Yes, delete note"
                    )}
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

      </div>
    </DndContext>
  );
}
