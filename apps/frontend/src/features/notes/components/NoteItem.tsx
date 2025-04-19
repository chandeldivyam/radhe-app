// ./apps/frontend/src/features/notes/components/NoteItem.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronDown, Plus, Loader2, GripVertical, Trash2 } from 'lucide-react'; // Added Trash2
import { cn } from '../../../lib/utils'; // Corrected path
import { Button } from '../../../components/ui/button'; // Corrected path
import { toast } from 'sonner';
import { useZero } from '../../sync/use-zero'; // Corrected path
import { v4 as uuidv4 } from 'uuid';
import { getSortKeyForNewItem } from '../utils/note-tree';
import type { NoteWithChildren, NoteTreeData } from '../utils/note-tree';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Shadcn UI Imports ---
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "../../../components/ui/context-menu"; // Corrected path
// --- End Shadcn UI Imports ---

interface NoteItemProps {
  note: NoteWithChildren;
  level: number;
  expandedNoteIds: Record<string, boolean>;
  onToggleExpand: (noteId: string) => void;
  activeNoteId?: string;
  notesById: NoteTreeData['notesById'];
  childrenByParentId: NoteTreeData['childrenByParentId'];
  // --- New Props ---
  onRequestDelete: (noteId: string) => void; // Function to initiate delete confirmation
  isDeleting: boolean; // Is this specific note currently being deleted?
}

export function NoteItem({
  note,
  level,
  expandedNoteIds,
  onToggleExpand,
  activeNoteId,
  childrenByParentId,
  onRequestDelete, // Destructure new prop
  isDeleting,      // Destructure new prop
}: NoteItemProps) {
  const navigate = useNavigate();
  const z = useZero();
  const [isAddingChild, setIsAddingChild] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: note.noteId,
    // Disable sorting if adding child OR if this note is being deleted
    disabled: isAddingChild || isDeleting,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition,
    // Dim the item if it's being deleted
    opacity: isDeleting ? 0.5 : isDragging ? 0.5 : 1,
  };

  const isExpanded = !!expandedNoteIds[note.noteId];
  const isActive = note.noteId === activeNoteId;
  const actualChildren = note.children ?? [];
  const hasChildren = actualChildren.length > 0;

  const handleNavigate = (e: React.MouseEvent) => {
    // Prevent navigation if dragging, clicking handle, or deleting
    if (isDragging || (e.target as HTMLElement).closest('[data-dnd-handle="true"]') || isDeleting) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    // Prevent navigation if clicking interactive elements within the item
    if (!isEditingDescendant(e.target as HTMLElement)) {
      navigate(`/notes/${note.noteId}`);
    }
  };

  // Helper to check if click target is an input, textarea, or button
  const isEditingDescendant = (target: HTMLElement | null): boolean => {
    if (!target) return false;
    return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.closest('button') !== null;
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Prevent toggle while dragging or deleting
    if (hasChildren && !isDragging && !isDeleting) {
      onToggleExpand(note.noteId);
    }
  };

  const handleAddChild = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!z || isAddingChild || isDragging || isDeleting) return;

    setIsAddingChild(true);
    try {
      const parentId = note.noteId;
      const currentChildren = childrenByParentId.get(parentId) ?? [];
      const tempMap = new Map<string | null, NoteWithChildren[]>().set(parentId, currentChildren);
      const newSortKey = getSortKeyForNewItem(parentId, tempMap);

      const newNoteId = uuidv4();

      await z.mutate.note.insert({
        noteId: newNoteId, title: "Untitled Child", content: "", parentId: parentId,
        sortKey: newSortKey, createdAt: Date.now(), updatedAt: Date.now(),
      });

      toast.success("Child note created");
      if (!isExpanded) onToggleExpand(parentId);
      setTimeout(() => navigate(`/notes/${newNoteId}`), 50);

    } catch (error: any) {
      toast.error(`Failed to add child: ${error.message || 'Unknown error'}`);
    } finally {
      setIsAddingChild(false);
    }
  };

  // Called when "Delete Note" is selected from context menu
  const handleDeleteClick = (e: React.MouseEvent | Event) => {
      e.stopPropagation(); // Prevent triggering other actions like navigation
      if (isDeleting) return; // Don't allow re-triggering delete
      onRequestDelete(note.noteId); // Call prop to open confirmation dialog
  };

  return (
    // --- Context Menu Wrapper ---
    <ContextMenu>
      <ContextMenuTrigger
        ref={setNodeRef} // Connect DND ref to the trigger
        style={{ ...style, paddingLeft: `${level * 1.25 + 0.75}rem` }}
        className={cn(
          "group flex items-center justify-between w-full text-left text-sm font-medium rounded-md cursor-pointer relative",
          "pr-1",
          // Apply styles based on active state *only if not dragging/deleting*
          isActive && !isDragging && !isDeleting ? "bg-primary text-primary-foreground" : "hover:bg-accent hover:text-accent-foreground",
          // Style for placeholder when dragging is handled by opacity now
          // isDragging && "opacity-50 bg-muted", // Opacity handles dragging style
          // Disable interaction if deleting
          isDeleting && "cursor-wait pointer-events-none",
        )}
        onClick={handleNavigate}
        // Disable context menu trigger itself if deleting
        // The ContextMenu component might handle this, but explicit disable is safer
        disabled={isDeleting}
      >
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          data-dnd-handle="true"
          className={cn(
            "flex-shrink-0 -ml-1 mr-1 p-1 cursor-grab touch-none rounded-sm",
            "opacity-0 group-hover:opacity-50 focus-visible:opacity-100",
            isActive && !isDeleting ? "text-primary-foreground/70 hover:text-primary-foreground" : "text-muted-foreground/70 hover:text-foreground",
            isDragging ? "cursor-grabbing" : "cursor-grab",
             // Disable handle visually and functionally if deleting
            isDeleting && "opacity-25 cursor-not-allowed pointer-events-none",
          )}
          onClick={(e) => e.stopPropagation()} // Prevent navigation when clicking handle
          aria-label="Drag to reorder note"
          aria-pressed={isDragging}
          disabled={isAddingChild || isDeleting} // Disable handle if adding child or deleting
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Expand/Collapse Toggle */}
        <Button
          onClick={handleToggle}
          variant="ghost"
          size="icon"
          className={cn(
            "flex-shrink-0 mr-1 rounded-sm h-6 w-6 p-0",
            !hasChildren && "invisible opacity-0 pointer-events-none", // Hide if no children
            isActive && !isDeleting ? "hover:bg-primary/80" : "hover:bg-muted",
             // Disable toggle if deleting
            isDeleting && "opacity-25 cursor-not-allowed",
          )}
          aria-label={isExpanded ? 'Collapse note children' : 'Expand note children'}
          aria-expanded={isExpanded}
          disabled={!hasChildren || isDragging || isAddingChild || isDeleting}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
          ) : (
            <span className="inline-block h-4 w-4"></span> // Placeholder for alignment
          )}
        </Button>

        {/* Note Title */}
        <span className={cn(
            "truncate flex-grow py-1 mx-1",
             // Mute text if deleting
            isDeleting && "text-muted-foreground italic"
          )}>
          {note.title || "Untitled Note"}
           {isDeleting && " (deleting...)"} {/* Visual cue */}
        </span>

        {/* Add Child Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleAddChild}
          className={cn(
            "flex-shrink-0 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity",
            isActive && !isDeleting ? "text-primary-foreground hover:bg-primary/80" : "text-muted-foreground hover:bg-muted",
            // Disable add button if deleting
             isDeleting && "opacity-25 cursor-not-allowed",
          )}
          disabled={isAddingChild || !z || isDragging || isDeleting}
          aria-label="Add child note"
        >
          {isAddingChild ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>

      </ContextMenuTrigger>

      {/* --- Context Menu Content --- */}
      {/* Prevent clicks inside menu from propagating to the trigger (e.g., navigation) */}
      <ContextMenuContent className="w-48" onClick={(e) => e.stopPropagation()} >
        {/* Add other items later if needed (e.g., Rename, Duplicate) */}
        <ContextMenuItem
            onSelect={handleDeleteClick} // Use onSelect for menu items
            className="text-destructive focus:text-destructive focus:bg-destructive/10"
            disabled={isDeleting} // Disable item if already deleting
            aria-disabled={isDeleting}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Delete Note</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
