import { pgTable, text, boolean, timestamp, uuid, integer, index as pgIndex, foreignKey } from 'drizzle-orm/pg-core'; // Added integer and pgIndex
import { relations, sql } from 'drizzle-orm'; // Added sql if you plan db-level onUpdate

// Organization schema (Existing)
export const organizations = pgTable('organization', {
  organizationId: uuid('organization_id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// User schema (Existing)
export const users = pgTable('user', {
  userId: uuid('user_id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  hashedPassword: text('hashed_password').notNull(),
  isActive: boolean('is_active').default(true),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.organizationId),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// --- Note Schema ---
export const notes = pgTable('note', {
  // Basic Info
  noteId: uuid('note_id').primaryKey().defaultRandom(), // Matches String PK with default UUID
  title: text('title'), // Matches String, index defined below
  content: text('content').notNull(), // Matches Text, nullable by default
  suggestionContent: text('suggestion_content'), // Matches Text, nullable by default

  // Hierarchical structure
  parentId: uuid('parent_id'),
  path: text('path'), // Materialized path, index defined below
  depth: integer('depth').default(0), // Matches Integer with default
  childrenCount: integer('children_count').default(0), // Matches Integer with default
  position: integer('position').notNull().default(0), // Matches Integer, non-nullable with default

  // Metadata & Foreign Keys
  organizationId: uuid('organization_id')
    .notNull() // Assuming organization is required for a note
    .references(() => organizations.organizationId), // Index defined below
  createdBy: uuid('created_by')
    .notNull() // Assuming creator is required
    .references(() => users.userId),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(), // Matches DateTime with server default
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow() // Matches server default on creation
    .$onUpdate(() => sql`CURRENT_TIMESTAMP`), // Matches onupdate behavior using SQL function

}, (table) => {
  // Define Indexes explicitly requested in SQLAlchemy schema
  return {
    titleIdx: pgIndex('note_title_idx').on(table.title),
    pathIdx: pgIndex('note_path_idx').on(table.path),
    orgIdx: pgIndex('note_organization_id_idx').on(table.organizationId),
    parentReference: foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.noteId],
      name: 'note_parent_id_note_id_fkey'
    })
  };
});


// --- Define Relationships ---

// Update organizationsRelations to include notes
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  notes: many(notes), // An organization can have many notes
}));

// Update usersRelations to include notes created by the user
export const usersRelations = relations(users, ({ one, many }) => ({ // Add 'many'
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.organizationId],
  }),
  notes: many(notes), // A user can create many notes (references 'createdBy' field)
}));

// Define relationships for the new notes table
export const notesRelations = relations(notes, ({ one, many }) => ({
  // Relation to Organization (Many Notes belong to One Org)
  organization: one(organizations, {
    fields: [notes.organizationId],
    references: [organizations.organizationId],
  }),
  // Relation to User (Creator) (Many Notes created by One User)
  creator: one(users, { // Using 'creator' as the relation name
    fields: [notes.createdBy],
    references: [users.userId],
  }),
  // Self-referencing for Parent (One Note belongs to max One Parent)
  parent: one(notes, {
    fields: [notes.parentId],
    references: [notes.noteId],
    relationName: 'note_parent_children', // Explicit name needed for self-referencing pairs
  }),
  // Self-referencing for Children (One Note can have Many Children)
  children: many(notes, {
    relationName: 'note_parent_children', // Must match the 'one' side's relationName
  }),
}));