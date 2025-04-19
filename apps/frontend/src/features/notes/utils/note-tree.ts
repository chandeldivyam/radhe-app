// ./apps/frontend/src/features/notes/utils/note-tree.ts
import type { Note } from "@/features/notes/types/note";
import * as FractionalIndexing from 'fractional-indexing';

// --- Updated Type ---
export type NoteWithChildren = Omit<Note, 'position' | 'path' | 'depth'> & { // Use Omit for clarity
    children: NoteWithChildren[];
};

export type NoteTreeData = {
    tree: NoteWithChildren[]; // Root notes with nested children
    notesById: Map<string, NoteWithChildren>; // Quick lookup
    childrenByParentId: Map<string | null, NoteWithChildren[]>; // Quick child lookup, MUST BE SORTED BY sortKey
};

// --- Core Fractional Indexing Helper ---
// Generates a key between two existing keys (or null for endpoints)
export function generateSortKey(before: string | null, after: string | null): string {
    // Ensure integer check passes if needed (it usually does by default)
    try {
        return FractionalIndexing.generateKeyBetween(before, after);
    } catch (e) {
        // Handle potential errors, e.g., key space exhaustion (unlikely)
        console.error("Error generating fractional index key:", e);
        // Fallback or rebalancing might be needed in extreme cases
        // For now, let's throw to indicate a critical issue
        throw new Error("Could not generate sort key.");
    }
}

// --- Tree Building ---
export function buildNoteTree(notes: Note[] | undefined | null): NoteTreeData {
    const notesById = new Map<string, NoteWithChildren>();
    const childrenByParentId = new Map<string | null, NoteWithChildren[]>();
    const tree: NoteWithChildren[] = [];

    if (!notes) {
        return { tree, notesById, childrenByParentId };
    }

    // Pass 1: Create map and initialize children arrays (unsorted initially)
    for (const note of notes) {
        const noteWithChildren: NoteWithChildren = { ...note, children: [] };
        notesById.set(note.noteId, noteWithChildren);
        // Don't initialize map here, do it dynamically below
    }

    // Pass 2: Populate children arrays and identify roots
    for (const note of notesById.values()) {
        const parentId = note.parentId ?? null;

        if (!childrenByParentId.has(parentId)) {
            childrenByParentId.set(parentId, []);
        }
        childrenByParentId.get(parentId)!.push(note); // Add to parent's list

        if (parentId === null) {
            tree.push(note); // Add root notes
        }
    }

    // Pass 3: Sort all children arrays and the root tree by sortKey
    const sortNodes = (nodes: NoteWithChildren[]) => {
        nodes.sort((a, b) => {
            if (a.sortKey && b.sortKey && a.sortKey < b.sortKey) return -1;
            if (a.sortKey && b.sortKey && a.sortKey > b.sortKey) return 1;
            return 0;
        });
    };

    sortNodes(tree); // Sort root notes
    for (const childrenList of childrenByParentId.values()) {
        sortNodes(childrenList); // Sort children for each parent
        // Assign the sorted children back to the parent nodes in the notesById map
        if (childrenList.length > 0) {
            const parentId = childrenList[0].parentId;
            if (parentId) {
                const parentNode = notesById.get(parentId);
                if (parentNode) {
                    parentNode.children = childrenList; // Ensure parent node object has sorted children
                }
            }
        }
    }
    // Rebuild tree structure recursively now that children are sorted
    const assignSortedChildrenRecursive = (nodes: NoteWithChildren[]) => {
        for (const node of nodes) {
            const sortedChildren = childrenByParentId.get(node.noteId) ?? [];
            node.children = sortedChildren; // Assign the correctly sorted children
            if (node.children.length > 0) {
                assignSortedChildrenRecursive(node.children);
            }
        }
    };
    assignSortedChildrenRecursive(tree);


    return { tree, notesById, childrenByParentId };
}

export function getSortKeyForNewItem(
    parentId: string | null,
    childrenMap: Map<string | null, NoteWithChildren[]>
): string {
    const siblings = childrenMap.get(parentId ?? null) ?? [];
    const lastSibling = siblings.length > 0 ? siblings[siblings.length - 1] : null;
    const prevKey = lastSibling ? lastSibling.sortKey : null;
    const nextKey = null;

    return generateSortKey(prevKey, nextKey);
}

// Helper to get sort key between two items (needed for drag-and-drop later)
export function getSortKeyBetweenItems(
    prevNote: NoteWithChildren | null,
    nextNote: NoteWithChildren | null
): string {
    const prevKey = prevNote ? prevNote.sortKey : null;
    const nextKey = nextNote ? nextNote.sortKey : null;
    return generateSortKey(prevKey, nextKey);
}