// ./apps/frontend/src/features/notes/hooks/useNoteListState.ts
import { useState, useCallback } from "react";
import type { UniqueIdentifier } from '@dnd-kit/core';

export function useNoteListState() {
  const [expandedNoteIds, setExpandedNoteIds] = useState<Record<string, boolean>>({});
  const [isMovingNote, setIsMovingNote] = useState(false); // For DND saving
  const [draggingNoteId, setDraggingNoteId] = useState<UniqueIdentifier | null>(null);

  // --- New State for Deletion ---
  const [noteToDeleteId, setNoteToDeleteId] = useState<string | null>(null); // ID of note pending confirmation
  const [isDeletingNote, setIsDeletingNote] = useState(false); // True while delete mutation runs

  const handleToggleExpand = useCallback((noteId: string) => {
    setExpandedNoteIds(prev => ({ ...prev, [noteId]: !prev[noteId] }));
  }, []);

  // --- Functions to manage delete dialog ---
  const requestDeleteNote = useCallback((noteId: string) => {
    setNoteToDeleteId(noteId);
  }, []);

  const cancelDeleteNote = useCallback(() => {
    setNoteToDeleteId(null);
  }, []);

  const confirmDeleteNote = useCallback(() => {
    // Actual deletion logic will be handled elsewhere (e.g., in NoteList)
    // This just signals confirmation, the calling component will trigger mutation
    // But we can set the loading state here.
    if (noteToDeleteId) {
      setIsDeletingNote(true);
    }
  }, [noteToDeleteId]); // Dependency ensures we have an ID when confirming

  // Function to reset deleting state (called after mutation finishes)
  const finishDeleteNote = useCallback(() => {
    setIsDeletingNote(false);
    setNoteToDeleteId(null); // Also close the dialog implicitly
  }, []);


  return {
    expandedNoteIds,
    setExpandedNoteIds,
    isMovingNote,
    setIsMovingNote,
    draggingNoteId,
    setDraggingNoteId,
    handleToggleExpand,

    // Deletion related state and handlers
    noteToDeleteId,
    isDeletingNote,
    requestDeleteNote,
    cancelDeleteNote,
    confirmDeleteNote, // Expose confirmation trigger
    finishDeleteNote,  // Expose cleanup function
    // We don't expose setIsDeletingNote directly, use confirm/finish
  };
}
