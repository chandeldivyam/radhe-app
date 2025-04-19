import {schema} from './schema.js';
import {assertIsLoggedIn, AuthData} from './auth.js';

import type {Transaction, CustomMutatorDefs, UpdateValue} from '@rocicorp/zero';

export type UpdateUserArgs = {
    userId: string;
    isActive: boolean;
}

export type CreateNoteArgs = {
    noteId: string;
    title: string;
    content: string;
    parentId: string | null;
    sortKey: string;
    createdAt: number;
    updatedAt: number;
}

export type UpdateNoteArgs = {
    noteId: string;
    title?: string | null;
    content?: string;
    parentId?: string | null;
    sortKey?: string;
    updatedAt?: number;
}

export function createMutators(auth: AuthData | undefined) {
    return {
        user: {
            async update(tx: Transaction<typeof schema, unknown>, {userId, isActive}: UpdateUserArgs) {
                assertIsLoggedIn(auth);
                const prev = await tx.query.user.where('userId', userId).one().run();
                if (prev?.organizationId !== auth.organizationId) {
                    throw new Error('User does not belong to this organization');
                }
                await tx.mutate.user.update({userId, isActive});
            }
        },
        note: {
            async insert(tx: Transaction<typeof schema, unknown>, {noteId, title, content, parentId, sortKey, createdAt, updatedAt}: CreateNoteArgs) {
                assertIsLoggedIn(auth);
                const userId = auth.sub;
                const organizationId = auth.organizationId;
                const newNote = { noteId, title, content, parentId, sortKey, organizationId, createdBy: userId, createdAt, updatedAt };
                await tx.mutate.note.insert(newNote);
            },
            async update(tx: Transaction<typeof schema, unknown>, changes: UpdateNoteArgs) {
                assertIsLoggedIn(auth);

                // 1. Fetch the note to verify ownership (important for security)
                const existingNote = await tx.query.note.where('noteId', changes.noteId).one().run();
                if (!existingNote || existingNote.organizationId !== auth.organizationId) {
                    throw new Error('Note not found or permission denied.');
                }

                // 2. Prepare the update payload, always including updatedAt
                const updatePayload: UpdateValue<typeof schema.tables.note> = {
                    ...changes, // Spread the provided changes (noteId, title, content, parentId, sortKey)
                    updatedAt: Date.now(), // Always update the timestamp
                };

                // 3. Apply the update
                await tx.mutate.note.update(updatePayload);
            },
            async delete(tx: Transaction<typeof schema, unknown>, {noteId}: {noteId: string}) {
                assertIsLoggedIn(auth);
                await tx.mutate.note.delete({noteId});
            }
        }
    } as const satisfies CustomMutatorDefs<typeof schema>;
}

export type Mutators = ReturnType<typeof createMutators>;
