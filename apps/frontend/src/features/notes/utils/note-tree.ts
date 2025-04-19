// ./apps/frontend/src/features/notes/utils/note-tree.ts
import type { Note } from "@/features/notes/types/note";
import * as FractionalIndexing from 'fractional-indexing';

// --- Types ---
// NoteWithChildren now explicitly includes the potential children array
export type NoteWithChildren = Note & {
    children: NoteWithChildren[];
};

// NoteTreeData structure remains the same
export type NoteTreeData = {
    tree: NoteWithChildren[]; // Root level notes, sorted
    notesById: Map<string, NoteWithChildren>; // Map for quick lookup
    childrenByParentId: Map<string | null, NoteWithChildren[]>; // Map of parentId -> sorted children list
};

// --- Fractional Indexing Helper ---
export function generateSortKey(before: string | null, after: string | null): string {
    try {
        // Ensure integer check passes if needed (often not necessary with default usage)
        // FractionalIndexing.validateInteger = () => {};
        return FractionalIndexing.generateKeyBetween(before, after);
    } catch (e) {
        console.error("Error generating fractional index key between:", before, "and", after, e);
        // In extremely rare cases (many keys generated between the same two points without rebalancing),
        // this could fail. A robust system might need rebalancing logic.
        // For now, throw to indicate a critical failure.
        throw new Error("Could not generate sort key. Possible index exhaustion.");
    }
}

// --- Tree Building ---
export function buildNoteTree(notes: Note[] | undefined | null): NoteTreeData {
    const notesById = new Map<string, NoteWithChildren>();
    const childrenByParentId = new Map<string | null, NoteWithChildren[]>();
    const tree: NoteWithChildren[] = []; // Root notes

    if (!notes || notes.length === 0) {
        console.log("buildNoteTree: No notes provided.");
        return { tree, notesById, childrenByParentId };
    }

    // Pass 1: Create map and initialize children arrays, validating sortKey
    for (const note of notes) {
        // CRITICAL: Ensure sortKey exists. If not, the sorting logic breaks.
        if (note.sortKey === null || note.sortKey === undefined || note.sortKey === '') {
            console.error(`Note ${note.noteId} ("${note.title}") has invalid sortKey: "${note.sortKey}". This WILL cause sorting/DND issues. Assigning fallback WILL likely break order.`);
            // Assigning a fallback here is dangerous as it breaks intended order.
            // It's better to ensure data integrity upstream or filter out such notes.
            // For robustness in rendering *something*, we might proceed, but expect problems.
            // const fallbackSortKey = `ERR_${Date.now()}_${Math.random()}`; // Highly unstable
            // note = { ...note, sortKey: fallbackSortKey }; // Mutating input is bad, create copy if needed
        }
        const noteWithChildren: NoteWithChildren = { ...note, children: [] };
        notesById.set(note.noteId, noteWithChildren);
        // Initialize children array for *every* note, even if it won't have children,
        // simplifies lookup later (though map default is undefined)
         if (!childrenByParentId.has(note.noteId)) {
             childrenByParentId.set(note.noteId, []);
         }
    }
     // Initialize for root notes explicitly
     if (!childrenByParentId.has(null)) {
         childrenByParentId.set(null, []);
     }


    // Pass 2: Populate children arrays based on parentId
    for (const note of notesById.values()) {
        const parentId = note.parentId ?? null; // Use null for root explicitly

        const childrenList = childrenByParentId.get(parentId);
        if (childrenList) {
            // Should always find the list due to initialization in Pass 1 / explicit root init
            childrenList.push(note);
        } else {
             // This case should ideally not happen if initialized correctly
             console.warn(`Could not find children list for parentId: ${parentId} while processing note ${note.noteId}. Initializing now.`);
             childrenByParentId.set(parentId, [note]);
        }
    }

    // Pass 3: Sort all children arrays (including the root list) by sortKey
    const sortNodes = (a: NoteWithChildren, b: NoteWithChildren): number => {
        // Handle potential invalid sortKeys defensively during sort, though errors logged earlier
        const keyA = a.sortKey ?? '';
        const keyB = b.sortKey ?? '';
        if (keyA < keyB) return -1;
        if (keyA > keyB) return 1;
        // Fallback sort for identical keys (should be rare with fractional indexing)
        // Use createdAt for stability if sortKeys are identical or invalid
        return (a.createdAt ?? 0) - (b.createdAt ?? 0);
    };

    for (const [parentId, childrenList] of childrenByParentId.entries()) {
        childrenList.sort(sortNodes);
        // console.log(`Sorted children for parent ${parentId === null ? 'root' : parentId}:`, childrenList.map(n => ({id: n.noteId, key: n.sortKey})));
    }

    // Pass 4: Build the final tree structure by assigning sorted children to parents
    // and identify the root nodes.
    for (const note of notesById.values()) {
        const sortedChildren = childrenByParentId.get(note.noteId) ?? [];
        note.children = sortedChildren; // Assign the sorted children list back to the note object

        if (note.parentId === null) {
            // This note is a root note, add it to the main tree list
            // But the root list itself is already sorted in childrenByParentId.get(null)
            // So, just retrieve the already sorted root list at the end.
        }
    }

    // The final root tree is the sorted list associated with the null parentId
    const sortedRootTree = childrenByParentId.get(null) ?? [];
    console.log(`buildNoteTree: Built tree with ${sortedRootTree.length} root nodes.`);


    return { tree: sortedRootTree, notesById, childrenByParentId };
}


// --- Key Generation Helpers ---

// Get sort key for adding a NEW item to the END of a list (siblings)
export function getSortKeyForNewItem(
    parentId: string | null,
    childrenMap: Map<string | null, NoteWithChildren[]> // Expects the map containing SORTED children lists
): string {
    const siblings = childrenMap.get(parentId ?? null) ?? []; // Default to empty array
    const lastSibling = siblings.length > 0 ? siblings[siblings.length - 1] : null;

    // Key of the last item, or null if list is empty/first item
    const prevKey = lastSibling ? lastSibling.sortKey : null;
    const nextKey = null; // No item after the new last item

    if (lastSibling && (prevKey === null || prevKey === undefined)) {
        console.warn(`getSortKeyForNewItem: Last sibling ${lastSibling.noteId} exists but has invalid sortKey "${prevKey}". Key generation might be inaccurate.`);
    }

    return generateSortKey(prevKey, nextKey);
}

// Get sort key for inserting an item BETWEEN two existing items (or at start/end)
export function getSortKeyBetweenItems(
    prevNote: NoteWithChildren | null | undefined, // Allow undefined for safety
    nextNote: NoteWithChildren | null | undefined
): string {
    const prevKey = prevNote ? prevNote.sortKey : null;
    const nextKey = nextNote ? nextNote.sortKey : null;

     if (prevNote && (prevKey === null || prevKey === undefined)) {
        console.warn(`getSortKeyBetweenItems: Previous note ${prevNote.noteId} has invalid sortKey "${prevKey}". Key generation might be inaccurate.`);
    }
     if (nextNote && (nextKey === null || nextKey === undefined)) {
         console.warn(`getSortKeyBetweenItems: Next note ${nextNote.noteId} has invalid sortKey "${nextKey}". Key generation might be inaccurate.`);
    }

    // Handle potential edge case where keys might be identical or invalid order
    // This should NOT happen if data is consistent and sorting is correct.
    if (prevKey !== null && nextKey !== null && prevKey >= nextKey) {
         console.error(`Cannot generate key: prevKey "${prevKey}" (Note ${prevNote?.noteId}) is not strictly less than nextKey "${nextKey}" (Note ${nextNote?.noteId}). This indicates a data inconsistency or sorting error.`);
         // Throwing is safer to indicate a state inconsistency.
         throw new Error("Invalid sort key order for generation. Cannot place item.");
    }

    return generateSortKey(prevKey, nextKey);
}

