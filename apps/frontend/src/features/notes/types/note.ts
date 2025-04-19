export interface Note {
    noteId: string;
    title: string | null;
    content: string;
    suggestionContent: string | null;
    parentId: string | null;
    position: number | null;
    path: string | null;
    depth: number | null;
    createdAt: number;
    updatedAt: number;
}