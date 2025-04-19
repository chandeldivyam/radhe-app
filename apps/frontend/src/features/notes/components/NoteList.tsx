// ./apps/frontend/src/features/notes/components/NoteList.tsx
import { useState, useMemo, useCallback } from "react";
import { useZero } from "@/features/sync/use-zero";
import { useQuery } from "@rocicorp/zero/react";
import { useParams } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddNoteButton } from "./AddNoteButton";
import { NoteItem } from "./NoteItem";
import { buildNoteTree, getSortKeyForNewItem } from "../utils/note-tree"; // Import helpers
import type { NoteTreeData } from "../utils/note-tree";

export function NoteList() {
  const z = useZero();
  const params = useParams<{ noteId?: string }>();
  const activeNoteId = params.noteId;

  const notesQuery = z?.query.note; // .orderBy('sortKey', 'asc') - Add if useful/performant
  const notesQueryResult = useQuery(notesQuery); // Fetch all notes
  const allNotes = notesQueryResult?.[0]; // Flat list, potentially unsorted or backend-sorted

  // State to track expanded note IDs
  const [expandedNoteIds, setExpandedNoteIds] = useState<Record<string, boolean>>({});

  // Process the flat list into a sorted tree structure
  const noteTreeData: NoteTreeData = useMemo(() => {
    return buildNoteTree(allNotes);
  }, [allNotes]);

  const { tree: rootNotes, childrenByParentId, notesById } = noteTreeData;

  // Function to toggle expansion state
  const handleToggleExpand = useCallback((noteId: string) => {
    console.log(`Toggling expand for: ${noteId}`);
    setExpandedNoteIds(prev => {
        const newState = { ...prev, [noteId]: !prev[noteId] };
        console.log(`New expanded state for ${noteId}: ${newState[noteId]}`, newState);
        return newState;
    });
  }, []);

  const getNextTopLevelSortKey = useCallback(() => {
    // Use the helper with parentId=null and the current children map
    return getSortKeyForNewItem(null, childrenByParentId);
  }, [childrenByParentId]); // Depends on the current state of siblings

  return (
    <div className="flex h-full flex-col overflow-hidden border-r bg-muted/40 dark:bg-zinc-900/40">
      {/* Header/Actions Area */}
      <div className="flex h-[60px] items-center justify-end border-b px-4">
        {/* Pass the function to calculate the next key */}
        <AddNoteButton getNextSortKey={getNextTopLevelSortKey}/>
      </div>

      {/* Note List Area */}
      <ScrollArea className="flex-1 min-h-0 p-2">
        {rootNotes.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No notes yet. Create one!
          </div>
        ) : (
          <nav className="space-y-1">
            {/* Render root notes, sorted by buildNoteTree */}
            {rootNotes.map((note) => (
              <NoteItem
                key={note.noteId}
                note={note}
                level={0}
                expandedNoteIds={expandedNoteIds}
                onToggleExpand={handleToggleExpand}
                activeNoteId={activeNoteId}
                notesById={notesById}
                childrenByParentId={childrenByParentId}
              />
            ))}
          </nav>
        )}
      </ScrollArea>
    </div>
  );
}