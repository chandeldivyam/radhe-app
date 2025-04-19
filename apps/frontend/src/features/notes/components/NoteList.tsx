// ./apps/frontend/src/features/notes/components/NoteList.tsx
import React, { useState, useMemo, useCallback } from "react";
import { useZero } from "@/features/sync/use-zero";
import { useQuery } from "@rocicorp/zero/react";
import { useParams } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddNoteButton } from "./AddNoteButton"; // Keep this for top-level notes
import { NoteItem } from "./NoteItem"; // Import the new component
import { buildNoteTree, calculateNextPosition as calculateNextPositionHelper } from "../utils/note-tree"; // Import helpers
import type { NoteTreeData } from "../utils/note-tree";

export function NoteList() {
  const z = useZero();
  const params = useParams<{ noteId?: string }>();
  const activeNoteId = params.noteId;

  // Fetch ALL notes needed to build the tree
  const notesQueryResult = useQuery(z?.query.note.orderBy('position', 'asc'));
  const allNotes = notesQueryResult[0]; // Flat list

  // State to track expanded note IDs
  const [expandedNoteIds, setExpandedNoteIds] = useState<Record<string, boolean>>({});

  // Process the flat list into a tree structure using the helper
  const noteTreeData: NoteTreeData = useMemo(() => {
    console.log("Rebuilding note tree...", allNotes?.length); // Add length log
    return buildNoteTree(allNotes);
  }, [allNotes]);

  // Destructure maps needed by children
  const { tree: rootNotes, childrenByParentId, notesById } = noteTreeData;

  // Function to toggle expansion state
  const handleToggleExpand = useCallback((noteId: string) => {
    console.log(`Toggling expand for: ${noteId}`); // <<< Add Log
    setExpandedNoteIds(prev => {
      const newState = {
        ...prev,
        [noteId]: !prev[noteId],
      };
      console.log(`New expanded state for ${noteId}: ${newState[noteId]}`, newState); // <<< Add Log
      return newState;
    });
  }, []); // Dependency array is empty, which is correct here

  // Placeholder handler - assumes Zero handles reactivity or refetch needed elsewhere
  const handleNoteAdded = useCallback(() => {
    console.log("Note added, relying on Zero sync/refetch...");
    // Potentially add notesQueryResult[1].refetch() if needed
  }, [notesQueryResult]); // Add dependency if using refetch


  // Memoize the helper function to avoid passing a new function on every render
  const getNextPosition = useCallback((parentId: string | null) => {
      return calculateNextPositionHelper(parentId, childrenByParentId);
  }, [childrenByParentId]);


  // Handler for adding a TOP-LEVEL note
  const handleAddTopLevelNote = () => {
      return getNextPosition(null); // Use the helper for top-level position
  };


  return (
    <div className="flex h-full flex-col border-r bg-muted/40 dark:bg-zinc-900/40">
      {/* Header/Actions Area */}
      <div className="flex h-[60px] items-center justify-end border-b px-4">
        <div className="hover:scale-110 hover:bg-muted rounded-md">
          {/* Pass the calculated next top-level position */}
          <AddNoteButton position={handleAddTopLevelNote()} />
        </div>
      </div>

      {/* Note List Area */}
      <ScrollArea className="flex-1 overflow-y-auto p-2">
        {!allNotes ? ( // Show loading state based on the query result
          <div className="space-y-2 p-2 text-center text-sm text-muted-foreground">
            Loading notes...
          </div>
        ) : rootNotes.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No notes yet. Create one!
          </div>
        ) : (
          <nav className="space-y-1">
            {rootNotes.map((note) => {
              // Add log here to see props passed to top-level items
              // console.log("Rendering root NoteItem:", note.noteId, "Expanded Map:", expandedNoteIds, "Has Children:", (childrenByParentId.get(note.noteId) ?? []).length > 0);
              return (
                <NoteItem
                  key={note.noteId}
                  note={note}
                  level={0}
                  expandedNoteIds={expandedNoteIds} // Pass the map
                  onToggleExpand={handleToggleExpand} // Pass the handler
                  activeNoteId={activeNoteId}
                  onNoteAdded={handleNoteAdded} // Pass the new handler
                  calculateNextPosition={getNextPosition}
                  // Pass lookup maps for accurate child check
                  notesById={notesById}
                  childrenByParentId={childrenByParentId}
                />
              );
            })}
          </nav>
        )}
      </ScrollArea>
    </div>
  );
}
