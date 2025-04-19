// ./apps/frontend/src/features/notes/components/NoteViewer.tsx
import React, { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useZero } from '@/features/sync/use-zero';
import { useQuery } from '@rocicorp/zero/react';
import { CACHE_AWHILE } from '@/features/sync/query-cache-policy';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button"; // Import Button
import { toast } from "sonner";
import { Edit2, Save, X, Loader2 } from 'lucide-react'; // Icons

// Define state for the values being edited
type NoteEditState = {
  title: string;
  content: string;
};

export function NoteViewer() {
  const { noteId } = useParams<{ noteId: string }>();
  const z = useZero();

  // --- State ---
  const [isEditing, setIsEditing] = useState(false);
  const [editState, setEditState] = useState<NoteEditState | null>(null);
  const [isSaving, setIsSaving] = useState(false); // Track saving state

  // --- Fetch Note Data ---
  // Fetch related creator data directly
  const noteQuery = z.query.note
    .where('noteId', noteId ?? '')
    .related('creator') // Fetch the creator user object
    .one();

  const [note] = useQuery(noteQuery, CACHE_AWHILE);

  // --- Event Handlers ---
  const handleEditClick = useCallback(() => {
    if (!note) return;
    // Initialize edit state with current note values
    setEditState({
      title: note.title ?? '',
      content: note.content,
    });
    setIsEditing(true);
  }, [note]);

  const handleCancelClick = useCallback(() => {
    setIsEditing(false);
    setEditState(null); // Clear edit state
    setIsSaving(false); // Ensure saving indicator is off
  }, []);

  const handleSaveClick = useCallback(async () => {
    if (!note || !editState || isSaving) return;

    setIsSaving(true);

    // Construct payload with only changed values
    const payload: { noteId: string; title?: string; content?: string } = { noteId: note.noteId };
    let changed = false;
    if (editState.title !== (note.title ?? '')) {
        payload.title = editState.title;
        changed = true;
    }
    if (editState.content !== note.content) {
        payload.content = editState.content;
        changed = true;
    }

    if (!changed) {
        toast.info("No changes to save.");
        setIsEditing(false); // Exit editing mode even if no changes
        setIsSaving(false);
        return;
    }

    try {
      console.log('Executing z.mutate.note.update with payload:', payload);
      const mutation = z.mutate.note.update({...payload, updatedAt: Date.now()});
      await mutation;

      toast.success("Note saved successfully!");
      setIsEditing(false); // Exit editing mode on successful save
      setEditState(null);

    } catch (error: any) {
      console.error("Failed to save note:", error);
      toast.error(`Failed to save note: ${error.message || 'Unknown error'}`);
      // Keep editing mode active on error so user can retry or cancel
    } finally {
        setIsSaving(false); // Reset saving state regardless of outcome
    }
  }, [note, editState, z, isSaving]);

  // Handlers to update the temporary editState
  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isEditing || !editState) return;
    setEditState({ ...editState, title: event.target.value });
  };

  const handleContentChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
     if (!isEditing || !editState) return;
    setEditState({ ...editState, content: event.target.value });
  };

  // --- Render Logic ---

  if (!noteId) {
    return <div className="p-6 text-center text-muted-foreground">Select a note.</div>;
  }

  if (!note) {
     return (
      <div className="p-6 text-center text-muted-foreground">
        <span className="animate-blink font-mono text-lg">|</span>
      </div>
    );
  }

  // --- Render View or Edit Mode ---
  return (
    <div className="flex-1 overflow-auto p-6 flex flex-col h-full">
        {/* Header Area with Title and Actions */}
        <div className="flex justify-between items-start mb-4">
            {/* Title (Editable or Read-only) */}
            {isEditing && editState ? (
                 <Input
                    value={editState.title}
                    onChange={handleTitleChange}
                    placeholder="Untitled Note"
                    className="text-3xl font-bold tracking-tight border-none focus-visible:ring-0 shadow-none px-0 h-auto mr-4 flex-grow"
                    aria-label="Note Title"
                    disabled={isSaving}
                 />
            ) : (
                <h1 className="text-3xl font-bold tracking-tight mr-4 break-words flex-grow">
                    {note.title || 'Untitled Note'}
                </h1>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-2 flex-shrink-0">
                {isEditing ? (
                    <>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleCancelClick}
                            disabled={isSaving}
                            aria-label="Cancel edit"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                        <Button
                            variant="default" // Primary action
                            size="icon"
                            onClick={handleSaveClick}
                            disabled={!editState || isSaving} // Disable if no state or saving
                            aria-label="Save changes"
                        >
                            {isSaving ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <Save className="h-5 w-5" />
                            )}
                        </Button>
                    </>
                ) : (
                    // Show Edit button only if the user has permission
                    true && (
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleEditClick}
                            aria-label="Edit note"
                        >
                             <Edit2 className="h-5 w-5" />
                        </Button>
                    )
                )}
             </div>
        </div>



        {/* Content Area (Editable or Read-only) */}
        {isEditing && editState ? (
            <Textarea
                value={editState.content}
                onChange={handleContentChange}
                placeholder="Start writing your note..."
                className="flex-1 resize-none border-none focus-visible:ring-0 shadow-none px-0 text-base leading-relaxed"
                aria-label="Note Content"
                disabled={isSaving}
            />
        ) : (
             // Basic content display - enhance later with markdown if needed
            <div className="prose dark:prose-invert max-w-none flex-1">
                {/* Using whitespace-pre-wrap to respect line breaks and wrapping */}
                <p style={{ whiteSpace: 'pre-wrap' }}>
                    {note.content || (
                       <span className="italic text-muted-foreground">Empty note</span>
                    )}
                </p>
            </div>
        )}
    </div>
  );
}