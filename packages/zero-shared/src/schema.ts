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

export const userRelationships = relationships(user, ({ one }: { one: (config: any) => any }) => ({
  organization: one({
    sourceField: ['organizationId'],
    destSchema: organization,
    destField: ['organizationId']
  })
}));

export const organizationRelationships = relationships(organization, ({ many }: { many: (config: any) => any }) => ({
  users: many({
    sourceField: ['organizationId'],
    destSchema: user,
    destField: ['organizationId']
  })
}));

export const schema = createSchema({
  tables: [organization, user],
  relationships: [userRelationships, organizationRelationships]
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
  return {
    user: {
      row: {
        select: [canSeeUsers],
        update: {
          preMutation: [canSeeUsers],
          postMutation: [canSeeUsers]
        }
      }
    }
  };
});
