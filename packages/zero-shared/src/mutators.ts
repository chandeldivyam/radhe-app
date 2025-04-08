import {schema} from './schema.js';
import {assertIsLoggedIn, AuthData} from './auth.js';

import type {Transaction, CustomMutatorDefs} from '@rocicorp/zero';

export type UpdateUserArgs = {
    userId: string;
    isActive: boolean;
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
        }
    } as const satisfies CustomMutatorDefs<typeof schema>;
}

export type Mutators = ReturnType<typeof createMutators>;
