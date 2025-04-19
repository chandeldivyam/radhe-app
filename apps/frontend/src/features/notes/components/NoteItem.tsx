// ./apps/frontend/src/features/notes/components/NoteItem.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronDown, Plus, Loader2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useZero } from '@/features/sync/use-zero';
import { v4 as uuidv4 } from 'uuid';
import { getSortKeyForNewItem } from '../utils/note-tree';
import type { NoteWithChildren, NoteTreeData } from '../utils/note-tree';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface NoteItemProps {
  note: NoteWithChildren;
  level: number;
  expandedNoteIds: Record<string, boolean>;
  onToggleExpand: (noteId: string) => void;
  activeNoteId?: string;
  notesById: NoteTreeData['notesById'];
  childrenByParentId: NoteTreeData['childrenByParentId'];
  // isOverlay?: boolean; // Optional prop if we need slightly different rendering in DragOverlay
}

export function NoteItem({
  note,
  level,
  expandedNoteIds,
  onToggleExpand,
  activeNoteId,
  notesById,
  childrenByParentId,
  // isOverlay = false, // Default value
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
    isDragging, // State from the hook indicating if *this* item is the one being dragged
  } = useSortable({ id: note.noteId, disabled: isAddingChild }); // Disable sorting if adding child

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition, // Apply transition only when not dragging for smooth drop
    // Opacity is handled below based on isDragging
    // zIndex: isDragging ? 10 : 'auto', // Ensure dragging item is visually on top if needed
  };

  const isExpanded = !!expandedNoteIds[note.noteId];
  const isActive = note.noteId === activeNoteId;
  const actualChildren = note.children ?? []; // Use the children from the NoteWithChildren prop
  const hasChildren = actualChildren.length > 0;

  const handleNavigate = (e: React.MouseEvent) => {
     // Prevent navigation if the click target is the drag handle or buttons
    if (isDragging || (e.target as HTMLElement).closest('[data-dnd-handle="true"]')) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    if (!isEditingDescendant(e.target as HTMLElement)) { // Prevent nav if clicking input/textarea
        navigate(`/notes/${note.noteId}`);
    }
  };

  // Helper to prevent navigation when clicking on interactive elements within the item
  const isEditingDescendant = (target: HTMLElement | null): boolean => {
    if (!target) return false;
    return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.closest('button') !== null;
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren && !isDragging) { // Prevent toggle while dragging
      onToggleExpand(note.noteId);
    }
  };

  const handleAddChild = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!z || isAddingChild || isDragging) return; // Prevent adding if dragging

    setIsAddingChild(true);
    try {
      const parentId = note.noteId;
      // Get the latest children list for the parent to calculate the correct sort key
      const currentChildren = childrenByParentId.get(parentId) ?? [];
      const tempMap = new Map<string | null, NoteWithChildren[]>().set(parentId, currentChildren);
      const newSortKey = getSortKeyForNewItem(parentId, tempMap); // Use helper with current state

      const newNoteId = uuidv4();

      console.log(`Adding child note under ${parentId} with sortKey: ${newSortKey}`);

      await z.mutate.note.insert({
        noteId: newNoteId,
        title: "Untitled Child",
        content: "",
        parentId: parentId,
        sortKey: newSortKey,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      toast.success("Child note created");

      // Ensure parent is expanded after adding a child
      if (!isExpanded) {
        onToggleExpand(parentId);
      }

      // Optional: Navigate after a short delay to allow state update
      setTimeout(() => navigate(`/notes/${newNoteId}`), 50);

    } catch (error: any) {
      console.error("Failed to add child note:", error);
      toast.error(`Failed to add child: ${error.message || 'Unknown error'}`);
    } finally {
      setIsAddingChild(false);
    }
  };

  return (
    // Note Row - Apply DND ref, style, and conditional classes
    <div
      ref={setNodeRef} // Connect DND ref
      style={{ ...style, paddingLeft: `${level * 1.25 + 0.75}rem` }} // Apply DND transform/transition & indent
      className={cn(
        "group flex items-center justify-between w-full text-left text-sm font-medium rounded-md cursor-pointer relative",
        "pr-1", // Padding for buttons on the right
        // Apply styles based on active state *only if not dragging*
        isActive && !isDragging ? "bg-primary text-primary-foreground" : "hover:bg-accent hover:text-accent-foreground",
        // Style for the placeholder left behind when dragging
        isDragging && "opacity-50 bg-muted",
        // isOverlay && "shadow-lg bg-background z-10", // Style for the item in DragOverlay if needed
      )}
      onClick={handleNavigate}
      // {...attributes} // Spread DND attributes only if the whole item is draggable (no handle)
      // {...listeners} // Spread DND listeners only if the whole item is draggable (no handle)
    >
      {/* Drag Handle */}
      <button
        {...attributes} // Apply attributes here for dragging
        {...listeners} // Apply listeners here to make the handle draggable
        data-dnd-handle="true" // Custom attribute to identify handle clicks
        className={cn(
          "flex-shrink-0 -ml-1 mr-1 p-1 cursor-grab touch-none rounded-sm",
          "opacity-0 group-hover:opacity-50 focus-visible:opacity-100", // Show handle on hover/focus
           isActive ? "text-primary-foreground/70 hover:text-primary-foreground" : "text-muted-foreground/70 hover:text-foreground",
           isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
        onClick={(e) => e.stopPropagation()} // Prevent navigation when clicking handle
        aria-label="Drag to reorder note"
        aria-pressed={isDragging} // Accessibility for drag state
        disabled={isAddingChild} // Disable handle if adding child
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
          !hasChildren && "invisible opacity-0 pointer-events-none", // Hide & disable if no children
          isActive ? "hover:bg-primary/80" : "hover:bg-muted"
        )}
        aria-label={isExpanded ? 'Collapse note children' : 'Expand note children'}
        aria-expanded={isExpanded}
        disabled={!hasChildren || isDragging || isAddingChild} // Disable interactions while dragging or adding
      >
        {hasChildren ? (
          isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
        ) : (
          <span className="inline-block h-4 w-4"></span> // Placeholder for alignment
        )}
      </Button>

      {/* Note Title */}
      <span className="truncate flex-grow py-1 mx-1">
        {note.title || "Untitled Note"}
      </span>

      {/* Add Child Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleAddChild}
        className={cn(
          "flex-shrink-0 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity",
          isActive ? "text-primary-foreground hover:bg-primary/80" : "text-muted-foreground hover:bg-muted"
        )}
        disabled={isAddingChild || !z || isDragging} // Disable interactions while dragging or already adding
        aria-label="Add child note"
      >
        {isAddingChild ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      </Button>
    </div>
  );
}