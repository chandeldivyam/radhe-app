import type { Note } from "@/features/notes/types/note";

export type NoteWithChildren = Note & {
    children: NoteWithChildren[];
};

export type NoteTreeData = {
    tree: NoteWithChildren[]; // Root notes with nested children
    notesById: Map<string, NoteWithChildren>; // Quick lookup
    childrenByParentId: Map<string | null, NoteWithChildren[]>; // Quick child lookup
};

export function buildNoteTree(notes: Note[] | undefined | null): NoteTreeData {
    const notesById = new Map<string, NoteWithChildren>();
    const childrenByParentId = new Map<string | null, NoteWithChildren[]>();
    const tree: NoteWithChildren[] = [];

    if (!notes) {
        return { tree, notesById, childrenByParentId };
    }

    // First pass: create map and initialize children arrays
    for (const note of notes) {
        const noteWithChildren: NoteWithChildren = { ...note, children: [] };
        notesById.set(note.noteId, noteWithChildren);
        if (!childrenByParentId.has(note.parentId ?? null)) {
            childrenByParentId.set(note.parentId ?? null, []);
        }
    }

    // Second pass: populate children arrays and build the tree
    for (const note of notesById.values()) {
        const parentId = note.parentId ?? null;
        const childrenList = childrenByParentId.get(parentId);

        if (childrenList) {
             // Add to parent's children list (ensure correct reference)
             childrenList.push(note);
        }

        if (parentId === null) {
            tree.push(note); // Add root notes to the main tree
        }
    }

     // Sort children within each level by position
     const sortChildrenRecursive = (nodes: NoteWithChildren[]) => {
        nodes.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        nodes.forEach(node => {
            if (node.children.length > 0) {
                sortChildrenRecursive(node.children);
            }
        });
     };

    sortChildrenRecursive(tree); // Sort top-level
    childrenByParentId.forEach(children => {
         children.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    });


    return { tree, notesById, childrenByParentId };
}

// Helper to calculate the next position for a new child
export function calculateNextPosition(parentId: string | null, childrenMap: Map<string | null, NoteWithChildren[]>): number {
    const siblings = childrenMap.get(parentId ?? null) ?? [];
    if (siblings.length === 0) {
        return 0; // First child
    }
    // Find the maximum position among siblings and add 1
    const maxPosition = Math.max(...siblings.map(n => n.position ?? 0));
    return maxPosition + 1;
}