import { useMemo } from "react";
import { useZero } from "@/features/sync/use-zero";
import { useQuery } from "@rocicorp/zero/react";
import { buildNoteTree } from "../utils/note-tree";
import type { NoteTreeData } from "../utils/note-tree";
import type { Note } from "../types/note";

export function useNoteTreeData() {
  const z = useZero();
  const notesQuery = z?.query.note;
  const notesQueryResult = useQuery(notesQuery);
  const allNotes: Note[] | undefined = notesQueryResult?.[0];

  // Process the flat list into a sorted tree structure
  const noteTreeData: NoteTreeData = useMemo(() => {
    return buildNoteTree(allNotes);
  }, [allNotes]);

  const isLoading = !notesQueryResult && !allNotes; // Determine loading state

  return {
    ...noteTreeData, // Includes tree, notesById, childrenByParentId
    allNotes, // Return the raw notes as well, might be useful
    isLoading,
    z // Return z client for convenience in other hooks/components
  };
}
