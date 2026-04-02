import { relations } from "drizzle-orm";
import {
  AnyPgTable,
  boolean,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// Define the Role enum
export const Role = pgEnum("Role", ["ADMIN", "EDITOR", "VIEWER"]);

type TableInfo = {
  name: string;
  table: AnyPgTable;
};

enum TableInfos {
  "events" = "events",
  "rooms" = "rooms",
  "users" = "users",
  "licences" = "licences",
  "societies" = "societies",
  "sub_tags" = "sub_tags",
  "tags" = "tags",
}
// Create an array of table information

export const Rooms = pgTable(TableInfos.rooms, {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color"),
  tag_id: integer("tag_id"),
});

// User model
export const User = pgTable(TableInfos.users, {
  id: serial("id").primaryKey(),
  givenName: text("given_name").notNull(),
  surname: text("surname").notNull(),
  microsoft_id: text("microsoft_id").unique().notNull(),
  email: text("email").unique().notNull(),
  picture: text("picture"),
  role: Role("role").default("VIEWER"),
  society_id: integer("society_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Licences model
export const Licences = pgTable(TableInfos.licences, {
  id: serial("id").primaryKey(),
  price: integer("price").notNull(),
  maxAdmins: integer("max_admins").notNull(),
  maxEditors: integer("max_editors").notNull(),
  maxViewers: integer("max_viewers").notNull(),
  urlShare: boolean("url_share").notNull(),
  active: boolean("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Societies model
export const Societies = pgTable(TableInfos.societies, {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  logo: text("logo"),
  urlShare: text("url_share"),
  licence_id: integer("licence_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tags model
export const Tags = pgTable(TableInfos.tags, {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  color: text("color").notNull(),
  society_id: integer("society_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// SubTags model
export const SubTags = pgTable(TableInfos.sub_tags, {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  color: text("color").notNull(),
  tag_id: integer("tag_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Events model
export const Events = pgTable(TableInfos.events, {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  dateStart: timestamp("date_start", { mode: "string" }).notNull(),
  dateEnd: timestamp("date_end", { mode: "string" }).notNull(),
  subTag_id: integer("sub_tag_id").notNull(),
  microsoft_id: text("microsoft_id").notNull(),
  society_id: integer("society_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type Event = typeof Events.$inferSelect;
export type NewEvent = typeof Events.$inferInsert;

// Define relations
export const SocietiesRelations = relations(Societies, ({ one, many }) => ({
  licence: one(Licences, {
    fields: [Societies.licence_id],
    references: [Licences.id],
  }),
  tags: many(Tags),
  users: many(User),
}));

export const LicencesRelations = relations(Licences, ({ many }) => ({
  societies: many(Societies),
}));

export const TagsRelations = relations(Tags, ({ one, many }) => ({
  society: one(Societies, {
    fields: [Tags.society_id],
    references: [Societies.id],
  }),
  subTags: many(SubTags),
}));

export const SubTagsRelations = relations(SubTags, ({ one, many }) => ({
  tag: one(Tags, {
    fields: [SubTags.tag_id],
    references: [Tags.id],
  }),
  events: many(Events),
}));

export const EventsRelations = relations(Events, ({ one }) => ({
  subTag: one(SubTags, {
    fields: [Events.subTag_id],
    references: [SubTags.id],
  }),
  user: one(User, {
    fields: [Events.microsoft_id],
    references: [User.microsoft_id],
  }),
}));

export const UserRelations = relations(User, ({ one, many }) => ({
  events: many(Events),
  society: one(Societies, {
    fields: [User.society_id],
    references: [Societies.id],
  }),
}));

export const AllTables: TableInfo[] = [
  { name: TableInfos.events, table: Events },
  { name: TableInfos.rooms, table: Rooms },
  { name: TableInfos.users, table: User },
  { name: TableInfos.licences, table: Licences },
  { name: TableInfos.societies, table: Societies },
  { name: TableInfos.sub_tags, table: SubTags },
  { name: TableInfos.tags, table: Tags },
];
