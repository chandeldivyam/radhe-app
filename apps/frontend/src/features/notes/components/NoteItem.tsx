// ./apps/frontend/src/features/notes/components/NoteItem.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronDown, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useZero } from '@/features/sync/use-zero';
import { v4 as uuidv4 } from 'uuid';
// Import the specific helper needed
import { getSortKeyForNewItem } from '../utils/note-tree';
import type { NoteWithChildren, NoteTreeData } from '../utils/note-tree';

// --- Updated Props ---
interface NoteItemProps {
  note: NoteWithChildren;
  level: number;
  expandedNoteIds: Record<string, boolean>;
  onToggleExpand: (noteId: string) => void;
  activeNoteId?: string;
  // Pass the full maps for accurate checks and key generation
  notesById: NoteTreeData['notesById'];
  childrenByParentId: NoteTreeData['childrenByParentId']; // This map MUST be sorted
  // Removed calculateNextPosition prop
}

export function NoteItem({
  note,
  level,
  expandedNoteIds,
  onToggleExpand,
  activeNoteId,
  notesById,        // Receive map
  childrenByParentId // Receive map
}: NoteItemProps) {
  const navigate = useNavigate();
  const z = useZero();
  const [isAddingChild, setIsAddingChild] = useState(false);

  const isExpanded = !!expandedNoteIds[note.noteId];
  const isActive = note.noteId === activeNoteId;

  // --- Use the passed, sorted map to check for children ---
  // The `note.children` array from buildNoteTree should also be reliable now
  const actualChildren = note.children ?? []; // Use pre-computed children if available
  // Or fallback to map lookup if note object might be stale (less likely now)
  // const actualChildren = childrenByParentId.get(note.noteId) ?? [];
  const hasChildren = actualChildren.length > 0;

  const handleNavigate = () => {
    navigate(`/notes/${note.noteId}`);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      onToggleExpand(note.noteId);
    }
  };

  const handleAddChild = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!z || isAddingChild) return;

    setIsAddingChild(true);
    try {
      const parentId = note.noteId;
      // --- Calculate next sort key using the helper ---
      const newSortKey = getSortKeyForNewItem(parentId, childrenByParentId);
      const newNoteId = uuidv4();

      console.log(`Adding child note under ${parentId} with sortKey: ${newSortKey}`);

      // --- Call updated mutator ---
      await z.mutate.note.insert({
        noteId: newNoteId,
        title: "Untitled Note", // Or ""
        content: "",
        parentId: parentId,
        sortKey: newSortKey,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      toast.success("Child note created");

      // Expand the parent if it wasn't already
      if (!isExpanded) {
         onToggleExpand(parentId);
      }

      // Navigate after a short delay
      setTimeout(() => navigate(`/notes/${newNoteId}`), 50);

    } catch (error: any) {
        console.error("Failed to add child note:", error);
        toast.error(`Failed to add child: ${error.message || 'Unknown error'}`);
    } finally {
      setIsAddingChild(false);
    }
  };

  return (
    <>
      {/* Note Row */}
      <div
        className={cn(
          "group flex items-center justify-between w-full text-left text-sm font-medium rounded-md cursor-pointer",
           "pr-1", // Add slight padding right for the button
          isActive
            ? "bg-primary text-primary-foreground"
            : "hover:bg-accent hover:text-accent-foreground",
        )}
        style={{ paddingLeft: `${level * 1.25 + 0.75}rem` }}
        onClick={handleNavigate}
      >
        {/* Expand/Collapse Toggle */}
        <Button
          onClick={handleToggle}
          variant="ghost" // Use ghost for consistency?
          size="icon"
          className={cn(
            "flex-shrink-0 mr-1 rounded-sm h-6 w-6 p-0", // Consistent size
            !hasChildren && "invisible opacity-0", // Hide if no children
            isActive ? "hover:bg-primary/80" : "hover:bg-muted"
          )}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
          aria-expanded={isExpanded}
          disabled={!hasChildren} // Disable only if no children
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
          ) : (
            <span className="inline-block h-4 w-4"></span> // Placeholder
          )}
        </Button>

        {/* Note Title */}
        <span className="truncate flex-grow py-1 mx-1"> {/* Adjust padding/margin */}
          {note.title || "Untitled Note"}
        </span>

        {/* Add Child Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleAddChild}
          className={cn(
            "flex-shrink-0 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity",
             isActive ? "text-primary-foreground hover:bg-primary/80" : "text-muted-foreground hover:bg-muted"
          )}
          disabled={isAddingChild || !z}
          aria-label="Add child note"
        >
          {isAddingChild ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>

      {/* Render Children Recursively */}
      {/* Children are now pre-sorted by buildNoteTree */}
      {hasChildren && isExpanded && (
        <div className="mt-1 space-y-1">
          {actualChildren.map((childNote) => (
              <NoteItem
                key={childNote.noteId}
                note={childNote}
                level={level + 1}
                expandedNoteIds={expandedNoteIds}
                onToggleExpand={onToggleExpand}
                activeNoteId={activeNoteId}
                // Pass the maps down for the next level
                notesById={notesById}
                childrenByParentId={childrenByParentId}
              />
            ))}
        </div>
      )}
    </>
  );
}