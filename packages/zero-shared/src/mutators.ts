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
    position: number;
    path: string | null;
    depth: number;
    createdAt: number;
    updatedAt: number;
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
            async insert(tx: Transaction<typeof schema, unknown>, {noteId, title, content, parentId, position, path, depth, createdAt, updatedAt}: CreateNoteArgs) {
                assertIsLoggedIn(auth);
                const userId = auth.sub;
                const organizationId = auth.organizationId;
                const newNote = { noteId, title, content, parentId, position, path, depth, organizationId, createdBy: userId, createdAt, updatedAt };
                await tx.mutate.note.insert(newNote);
            },
            async update(tx: Transaction<typeof schema, unknown>, change: UpdateValue<typeof schema.tables.note> & {modified: number}) {
                assertIsLoggedIn(auth);
                await tx.mutate.note.update(change);
            },
            async delete(tx: Transaction<typeof schema, unknown>, {noteId}: {noteId: string}) {
                assertIsLoggedIn(auth);
                await tx.mutate.note.delete({noteId});
            }
        }
    } as const satisfies CustomMutatorDefs<typeof schema>;
}

export type Mutators = ReturnType<typeof createMutators>;
