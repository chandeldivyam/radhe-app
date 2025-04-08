declare module '@rocicorp/zero' {
  // Constants
  export const ANYONE_CAN: ["allow", true];
  export const NOBODY_CAN: ["allow", false];

  // Field builders
  export interface FieldBuilder<T> {
    from(serverName: string): FieldBuilder<T>;
    optional(): FieldBuilder<T>;
  }

  export function string(): FieldBuilder<string>;
  export function boolean(): FieldBuilder<boolean>;
  export function number(): FieldBuilder<number>;
  export function enumeration<T extends string>(): FieldBuilder<T>;

  // Table builders
  export interface TableBuilder<T = any> {
    columns<C extends Record<string, any>>(columns: C): TableBuilderWithColumns<T & { name: string; columns: C }>;
  }

  export interface TableBuilderWithColumns<T = any> {
    primaryKey(...keys: string[]): TableBuilderWithColumns<T & { primaryKey: string[] }>;
  }

  export function table(name: string): TableBuilder<{ name: string }>;

  // Relationships
  export interface RelationshipConfig {
    sourceField: string[];
    destField: string[];
    destSchema: any;
  }

  export interface RelationshipHelpers {
    one: (config: RelationshipConfig) => any;
    many: (...configs: RelationshipConfig[]) => any;
  }

  export function relationships(
    schema: any,
    fn: (helpers: RelationshipHelpers) => Record<string, any>
  ): { name: string; relationships: Record<string, any> };

  // Schema
  export interface SchemaConfig {
    tables: any[];
    relationships: any[];
  }

  export function createSchema(config: SchemaConfig): {
    tables: Record<string, any>;
    relationships: Record<string, Record<string, any>>;
  };

  // Row type helper
  export type Row<T> = any;

  // Permissions
  export type Condition = any;

  export interface ExpressionBuilder<S = any, T = any> {
    cmpLit(a: any, op: string, b: any): Condition;
    cmp(field: string, op: string, value: any): Condition;
    and(...conditions: Condition[]): Condition;
    or(...conditions: Condition[]): Condition;
    exists(relationship: string, queryFn: (queryBuilder: any) => any): Condition;
  }

  export function definePermissions<A, S>(
    schema: S,
    fn: () => Record<string, any>
  ): Promise<{
    tables: Record<string, {
      row?: {
        select?: ["allow", Condition][];
        insert?: ["allow", Condition][];
        update?: {
          preMutation?: ["allow", Condition][];
          postMutation?: ["allow", Condition][];
        };
        delete?: ["allow", Condition][];
      };
      cell?: Record<string, {
        select?: ["allow", Condition][];
        insert?: ["allow", Condition][];
        update?: {
          preMutation?: ["allow", Condition][];
          postMutation?: ["allow", Condition][];
        };
        delete?: ["allow", Condition][];
      }>;
    }>;
  }>;

  // Schema type with tables
  export interface SchemaType {
    tables: Record<string, any>;
  }

  // Transaction interface which handles queries and mutations
  export interface Transaction<S extends SchemaType, C = unknown> {
    query: {
      [K in keyof S['tables']]: {
        where(fieldName: string, value: any): {
          one(): {
            run(): Promise<Row<S['tables'][K]> | undefined>;
          };
        };
      };
    };
    mutate: {
      [K in keyof S['tables']]: {
        update(args: Partial<Row<S['tables'][K]>>): Promise<void>;
      };
    };
  }

  // CustomMutatorDefs type which defines the structure of custom mutators
  export type CustomMutatorDefs<S extends SchemaType> = {
    [namespace: string]: {
      [method: string]: (tx: Transaction<S, unknown>, args: any) => Promise<any>;
    };
  };
}
