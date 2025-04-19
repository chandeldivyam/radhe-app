import { table, string, boolean, number, relationships, createSchema, definePermissions } from '@rocicorp/zero';
import type { ExpressionBuilder } from '@rocicorp/zero';
import { AuthData } from './auth.js';

export const organization = table('organization')
  .columns({
    organizationId: string().from('organization_id'),
    name: string(),
    createdAt: number().from('created_at'),
    updatedAt: number().from('updated_at'),
    isActive: boolean().from('is_active')
  })
  .primaryKey('organizationId');

export const user = table('user')
  .columns({
    userId: string().from('user_id'),
    email: string(),
    isActive: boolean().from('is_active'),
    organizationId: string().from('organization_id'),
    createdAt: number().from('created_at'),
    updatedAt: number().from('updated_at')
  })
  .primaryKey('userId');

export const note = table('note')
  .columns({
    // Basic Info
    noteId: string().from('note_id'), // PK
    title: string().optional(), // Nullable text
    content: string(), // Not null text
    suggestionContent: string().from('suggestion_content').optional(), // Nullable text

    // Hierarchical structure
    parentId: string().from('parent_id').optional(), // Nullable UUID (foreign key)
    path: string().optional(), // Nullable text
    depth: number().optional(), // Nullable integer (default 0)
    childrenCount: number().from('children_count').optional(), // Nullable integer (default 0)
    position: number(), // Not null integer (default 0)

    // Metadata & Foreign Keys
    organizationId: string().from('organization_id'), // Not null UUID (foreign key)
    createdBy: string().from('created_by'), // Not null UUID (foreign key)
    createdAt: number().from('created_at'), // Not null timestamp (default now)
    updatedAt: number().from('updated_at'), // Not null timestamp (default now, on update)
  })
  .primaryKey('noteId');

export const userRelationships = relationships(user, ({ one, many }: { one: (config: any) => any, many: (config: any) => any }) => ({
  organization: one({
    sourceField: ['organizationId'],
    destSchema: organization,
    destField: ['organizationId']
  }),
  notes: many({
    sourceField: ['userId'],
    destSchema: note,
    destField: ['createdBy'],
  }),
}));

export const organizationRelationships = relationships(organization, ({ many }: { many: (config: any) => any }) => ({
  users: many({
    sourceField: ['organizationId'],
    destSchema: user,
    destField: ['organizationId']
  }),
  notes: many({
    sourceField: ['organizationId'],
    destSchema: note,
    destField: ['organizationId'],
  })
}));

export const notesRelationships = relationships(note, ({ one, many }) => ({
  organization: one({
    sourceField: ['organizationId'],
    destSchema: organization,
    destField: ['organizationId'],
  }),

  creator: one({
    sourceField: ['createdBy'],
    destSchema: user,
    destField: ['userId'],
  }),

  parent: one({
    sourceField: ['parentId'],
    destSchema: note,
    destField: ['noteId'],
  }),

  children: many({
    sourceField: ['noteId'],
    destSchema: note,
    destField: ['parentId'],
  }),
}));

export const schema = createSchema({
  tables: [organization, user, note],
  relationships: [userRelationships, organizationRelationships, notesRelationships]
});

export type Schema = typeof schema;

export const permissions = definePermissions<AuthData, Schema>(schema, () => {
  const userIsLoggedIn = (
    authData: AuthData,
    { cmpLit }: ExpressionBuilder<Schema, keyof Schema['tables']>
  ) => cmpLit(authData.sub, 'IS NOT', null);
  
  const userSameOrg = (
    authData: AuthData,
    eb: ExpressionBuilder<Schema, 'user'>
  ) => {
    return eb.cmp('organizationId', '=', authData.organizationId ?? "");
  };

  const canSeeUsers = (
    authData: AuthData,
    eb: ExpressionBuilder<Schema, 'user'>
  ) => {
    return eb.and(userIsLoggedIn(authData, eb), userSameOrg(authData, eb));
  };

  const canAccessNote = (
    authData: AuthData,
    eb: ExpressionBuilder<Schema, 'note'>
  ) => {
    return eb.and(userIsLoggedIn(authData, eb), userSameOrg(authData, eb));
  }
  return {
    user: {
      row: {
        select: [canSeeUsers],
        update: {
          preMutation: [canSeeUsers],
          postMutation: [canSeeUsers]
        }
      }
    },
    note: {
      row: {
        select: [canAccessNote],
        update: {
          preMutation: [canAccessNote],
          postMutation: [canAccessNote]
        },
        insert: [canAccessNote],
        delete: [canAccessNote]
      },
    }
  };
});
