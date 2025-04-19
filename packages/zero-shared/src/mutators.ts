// ./packages/zero-shared/src/mutators.ts
import {schema} from './schema.js';
import {assertIsLoggedIn, AuthData} from './auth.js';

import type {Transaction, CustomMutatorDefs, UpdateValue} from '@rocicorp/zero';

// --- Keep existing types ---
// Assuming these types are defined elsewhere or implicitly understood
// If they were in this file originally, they should be kept.
// Example placeholder types if they were needed:
type UpdateUserArgs = { userId: string; [key: string]: any };
type CreateNoteArgs = {
    noteId: string;
    title: string;
    content: string;
    parentId: string | null;
    sortKey: string;
    createdAt: number;
    updatedAt: number;
};
type UpdateNoteArgs = {
    noteId: string;
    title?: string;
    content?: string;
    parentId?: string | null;
    sortKey?: string;
    updatedAt?: number; // Optional here, will be defaulted in mutator
};
// --- End Placeholder Types ---


export function createMutators(auth: AuthData | undefined) {
    return {
        user: {
           // Assuming user mutators exist and should remain
           // Example placeholder:
           async update(tx: Transaction<typeof schema, unknown>, args: UpdateUserArgs) {
                assertIsLoggedIn(auth);
                if (args.userId !== auth.sub) {
                    throw new Error("Permission denied to update user.");
                }
                console.log(`Mutator: Updating user ${args.userId}`);
                await tx.mutate.user.update(args);
           }
           // ... other user mutators ...
        },
        note: {
            async insert(tx: Transaction<typeof schema, unknown>, {noteId, title, content, parentId, sortKey, createdAt, updatedAt}: CreateNoteArgs) {
                assertIsLoggedIn(auth);
                const userId = auth.sub;
                const organizationId = auth.organizationId;
                const newNote = { noteId, title, content, parentId, sortKey, organizationId, createdBy: userId, createdAt, updatedAt };
                console.log(`Mutator: Inserting note ${noteId} for org ${organizationId}`);
                await tx.mutate.note.insert(newNote);
            },
            async update(tx: Transaction<typeof schema, unknown>, changes: UpdateNoteArgs) {
                assertIsLoggedIn(auth);
                const noteId = changes.noteId;
                const organizationId = auth.organizationId; // Get orgId from auth

                // 1. Fetch the note to verify ownership
                const existingNote = await tx.query.note.where('noteId', noteId).one().run();
                if (!existingNote || existingNote.organizationId !== organizationId) {
                    console.warn(`Mutator: Update permission denied or note ${noteId} not found for org ${organizationId}`);
                    throw new Error('Note not found or permission denied.');
                }

                // 2. Prepare the update payload, always including updatedAt
                const updatePayload: UpdateValue<typeof schema.tables.note> = {
                    ...changes,
                    updatedAt: changes.updatedAt ?? Date.now(), // Use provided updatedAt or default to now
                };
                console.log(`Mutator: Updating note ${noteId} with payload:`, updatePayload);

                // 3. Apply the update
                await tx.mutate.note.update(updatePayload);
            },
            // --- Updated Delete Mutator ---
            async delete(tx: Transaction<typeof schema, unknown>, {noteId}: {noteId: string}) {
                assertIsLoggedIn(auth);
                const organizationId = auth.organizationId;

                // 1. Find the note to verify initial ownership
                const rootNoteToDelete = await tx.query.note.where('noteId', noteId).one().run();
                if (!rootNoteToDelete || rootNoteToDelete.organizationId !== organizationId) {
                    console.warn(`Mutator: Delete permission denied or note ${noteId} not found for org ${organizationId}`);
                    throw new Error('Note not found or permission denied.');
                }

                // 2. Recursively find all descendant notes belonging to the same organization
                const notesToDeleteIds = new Set<string>();
                const queue: string[] = [noteId]; // Start with the initial note

                console.log(`Mutator: Starting recursive delete for note ${noteId} in org ${organizationId}`);

                while (queue.length > 0) {
                    const currentId = queue.shift();
                    if (!currentId || notesToDeleteIds.has(currentId)) {
                        continue; // Skip if already processed or undefined
                    }

                    // Check if note actually exists and belongs to the org before adding children
                    // (handles potential inconsistencies if a child's parentId points to a non-existent/wrong-org note)
                    const currentNote = await tx.query.note.where('noteId', currentId).one().run();
                    if (!currentNote || currentNote.organizationId !== organizationId) {
                        console.warn(`Mutator: Skipping note ${currentId} during delete cascade - not found or wrong org.`);
                        continue;
                    }

                    notesToDeleteIds.add(currentId);

                    // Find direct children within the same organization
                    const children = await tx.query.note
                        .where('parentId', currentId)
                        // Ensure we only queue children from the correct org
                        .where('organizationId', organizationId) // Chain where instead of andWhere
                        .run();

                    for (const child of children) {
                        if (!notesToDeleteIds.has(child.noteId)) {
                            queue.push(child.noteId);
                        }
                    }
                }

                console.log(`Mutator: Identified notes for deletion: ${Array.from(notesToDeleteIds).join(', ')}`);

                // 3. Delete all identified notes
                const orderedIdsToDelete = Array.from(notesToDeleteIds); // Can sort if needed, but not necessary here
                for (const idToDelete of orderedIdsToDelete.reverse()) {
                     console.log(`Mutator: Deleting note ${idToDelete}`);
                     // We've already verified ownership implicitly by starting from an owned root
                     // and only traversing within the organization.
                    await tx.mutate.note.delete({ noteId: idToDelete });
                }
                 console.log(`Mutator: Successfully deleted ${notesToDeleteIds.size} notes.`);
            }
        }
    } as const satisfies CustomMutatorDefs<typeof schema>;
}

export type Mutators = ReturnType<typeof createMutators>;
