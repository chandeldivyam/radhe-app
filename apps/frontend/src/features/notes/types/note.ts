export interface Note {
    noteId: string;
    title: string | null;
    content: string;
    suggestionContent: string | null;
    parentId: string | null;
    sortKey: string | null;
    createdAt: number;
    updatedAt: number;
}