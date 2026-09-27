import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["client", "booster", "admin"]);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  role: userRoleEnum("role").notNull().default("client"),
  riskDisclosureAcceptedAt: timestamp("risk_disclosure_accepted_at"),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const orderStatusEnum = pgEnum("order_status", [
  "draft",
  "awaiting_payment",
  "paid",
  "offered",
  "assigned",
  "in_progress",
  "delivered",
  "completed",
  "released",
  "paid_out",
  "disputed",
  "refunded",
  "cancelled",
  "expired_offer",
]);

export const ledgerEntryTypeEnum = pgEnum("ledger_entry_type", [
  "escrow_held",
  "booster_payable",
  "released",
  "paid_out",
  "refunded",
]);

export const offerStatusEnum = pgEnum("offer_status", [
  "pending",
  "accepted",
  "expired",
  "declined",
]);

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientUserId: text("client_user_id")
    .notNull()
    .references(() => user.id),
  boosterUserId: text("booster_user_id").references(() => user.id),
  status: orderStatusEnum("status").notNull().default("draft"),
  game: text("game").notNull(),
  serviceType: text("service_type").notNull(),
  skuSlug: text("sku_slug").notNull().default("lol_rank"),
  skuPayload: jsonb("sku_payload").$type<Record<string, unknown>>().notNull().default({}),
  startRankKey: text("start_rank_key").notNull(),
  endRankKey: text("end_rank_key").notNull(),
  server: text("server").notNull(),
  queue: text("queue").notNull(),
  currentLpBand: text("current_lp_band"),
  lpGainBand: text("lp_gain_band"),
  addOnKeys: jsonb("add_on_keys").$type<string[]>().notNull().default([]),
  amountUsdCents: integer("amount_usd_cents").notNull().default(0),
  amountEurCents: integer("amount_eur_cents").notNull().default(0),
  contractorShareUsdCents: integer("contractor_share_usd_cents").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  divisions: integer("divisions").notNull().default(0),
  riskDisclosureAcceptedAt: timestamp("risk_disclosure_accepted_at"),
  paidAt: timestamp("paid_at"),
  offeredAt: timestamp("offered_at"),
  assignedAt: timestamp("assigned_at"),
  startedAt: timestamp("started_at"),
  deliveredAt: timestamp("delivered_at"),
  /** Set when client did not confirm within deadline — admins notified. */
  confirmEscalatedAt: timestamp("confirm_escalated_at"),
  completedAt: timestamp("completed_at"),
  releaseAt: timestamp("release_at"),
  releasedAt: timestamp("released_at"),
  offerExpiresAt: timestamp("offer_expires_at"),
  provider: text("provider"),
  providerPaymentId: text("provider_payment_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const ledgerEntries = pgTable("ledger_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  type: ledgerEntryTypeEnum("type").notNull(),
  amountUsdCents: integer("amount_usd_cents").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderOffers = pgTable("order_offers", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  boosterUserId: text("booster_user_id")
    .notNull()
    .references(() => user.id),
  status: offerStatusEnum("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  respondedAt: timestamp("responded_at"),
});

export const paymentEvents = pgTable("payment_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  provider: text("provider").notNull(),
  providerEventId: text("provider_event_id").notNull().unique(),
  orderId: uuid("order_id").references(() => orders.id),
  type: text("type").notNull(),
  payloadJson: text("payload_json").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Solo credential vault — AES-GCM ciphertext only; never plaintext at rest. */
export const orderCredentials = pgTable("order_credentials", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .unique()
    .references(() => orders.id, { onDelete: "cascade" }),
  ciphertext: text("ciphertext").notNull(),
  iv: text("iv").notNull(),
  authTag: text("auth_tag").notNull(),
  label: text("label"),
  wipedAt: timestamp("wiped_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const vaultAccessActionEnum = pgEnum("vault_access_action", [
  "deposit",
  "reveal",
  "wipe",
]);

export const vaultAccessLogs = pgTable("vault_access_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  /** Null = automated retention wipe */
  userId: text("user_id").references(() => user.id),
  action: vaultAccessActionEnum("action").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderMessages = pgTable("order_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  senderUserId: text("sender_user_id")
    .notNull()
    .references(() => user.id),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Client or Booster in-game identity (Riot Name#Tag, etc.). */
export const gameAccounts = pgTable("game_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  game: text("game").notNull(),
  riotName: text("riot_name").notNull(),
  riotTag: text("riot_tag").notNull(),
  server: text("server").notNull(),
  profileUrl: text("profile_url"),
  note: text("note"),
  isPrimary: boolean("is_primary").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const boosterVerificationStatusEnum = pgEnum(
  "booster_verification_status",
  ["pending", "awaiting_review", "approved", "rejected"],
);

/** Booster trust state — must be approved to receive offers. */
export const boosterProfiles = pgTable("booster_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  status: boosterVerificationStatusEnum("status").notNull().default("pending"),
  /** When false, booster is excluded from new pool offers. */
  queueOnline: boolean("queue_online").notNull().default(true),
  games: jsonb("games").$type<string[]>().notNull().default([]),
  reviewNote: text("review_note"),
  reviewedByUserId: text("reviewed_by_user_id").references(() => user.id),
  reviewedAt: timestamp("reviewed_at"),
  invitedByCode: text("invited_by_code"),
  /** ID document gate before first payout */
  idStatus: text("id_status").notNull().default("none"),
  idImagePath: text("id_image_path"),
  idSubmittedAt: timestamp("id_submitted_at"),
  idReviewNote: text("id_review_note"),
  idReviewedByUserId: text("id_reviewed_by_user_id").references(() => user.id),
  idReviewedAt: timestamp("id_reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const rankProofStatusEnum = pgEnum("rank_proof_status", [
  "pending",
  "approved",
  "rejected",
]);

export const rankProofs = pgTable("rank_proofs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  game: text("game").notNull(),
  claimedRankKey: text("claimed_rank_key").notNull(),
  server: text("server").notNull(),
  /** Public path e.g. /uploads/rank-proofs/... */
  imagePath: text("image_path").notNull(),
  profileUrl: text("profile_url"),
  status: rankProofStatusEnum("status").notNull().default("pending"),
  reviewNote: text("review_note"),
  reviewedByUserId: text("reviewed_by_user_id").references(() => user.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const boosterInvites = pgTable("booster_invites", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  createdByUserId: text("created_by_user_id")
    .notNull()
    .references(() => user.id),
  usedByUserId: text("used_by_user_id").references(() => user.id),
  note: text("note"),
  expiresAt: timestamp("expires_at"),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Closed-beta client invites (Phase 6). */
export const clientInvites = pgTable("client_invites", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  createdByUserId: text("created_by_user_id")
    .notNull()
    .references(() => user.id),
  usedByUserId: text("used_by_user_id").references(() => user.id),
  note: text("note"),
  expiresAt: timestamp("expires_at"),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const payoutMethodEnum = pgEnum("payout_method", ["payoneer", "wise"]);

export const payoutStatusEnum = pgEnum("payout_status", [
  "pending",
  "paid",
  "rejected",
  "cancelled",
]);

/** Booster cash-out request for a released Order (Payoneer / Wise). */
export const payoutRequests = pgTable("payout_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .unique()
    .references(() => orders.id, { onDelete: "cascade" }),
  boosterUserId: text("booster_user_id")
    .notNull()
    .references(() => user.id),
  amountUsdCents: integer("amount_usd_cents").notNull(),
  method: payoutMethodEnum("method").notNull(),
  destination: text("destination").notNull(),
  status: payoutStatusEnum("status").notNull().default("pending"),
  reviewNote: text("review_note"),
  reviewedByUserId: text("reviewed_by_user_id").references(() => user.id),
  reviewedAt: timestamp("reviewed_at"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const listingStatusEnum = pgEnum("listing_status", [
  "draft",
  "listed",
  "reserved",
  "sold",
  "removed",
]);

export const accountSaleStatusEnum = pgEnum("account_sale_status", [
  "awaiting_payment",
  "held",
  "delivered",
  "completed",
  "released",
  "disputed",
  "refunded",
  "cancelled",
]);

/** KYC + payout rails for account sellers (may also be boosters). */
export const sellerProfiles = pgTable("seller_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  payoutMethod: payoutMethodEnum("payout_method"),
  payoutDestination: text("payout_destination"),
  idStatus: text("id_status").notNull().default("none"),
  idImagePath: text("id_image_path"),
  reviewNote: text("review_note"),
  reviewedByUserId: text("reviewed_by_user_id").references(() => user.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const accountListings = pgTable("account_listings", {
  id: uuid("id").defaultRandom().primaryKey(),
  sellerUserId: text("seller_user_id")
    .notNull()
    .references(() => user.id),
  game: text("game").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  rankLabel: text("rank_label"),
  skinsSummary: text("skins_summary"),
  server: text("server").notNull(),
  priceUsdCents: integer("price_usd_cents").notNull(),
  status: listingStatusEnum("status").notNull().default("draft"),
  featured: boolean("featured").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const accountSales = pgTable("account_sales", {
  id: uuid("id").defaultRandom().primaryKey(),
  listingId: uuid("listing_id")
    .notNull()
    .references(() => accountListings.id),
  buyerUserId: text("buyer_user_id")
    .notNull()
    .references(() => user.id),
  sellerUserId: text("seller_user_id")
    .notNull()
    .references(() => user.id),
  status: accountSaleStatusEnum("status").notNull().default("awaiting_payment"),
  amountUsdCents: integer("amount_usd_cents").notNull(),
  sellerShareUsdCents: integer("seller_share_usd_cents").notNull(),
  provider: text("provider"),
  providerPaymentId: text("provider_payment_id"),
  paidAt: timestamp("paid_at"),
  deliveredAt: timestamp("delivered_at"),
  completedAt: timestamp("completed_at"),
  releasedAt: timestamp("released_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** Credential handoff for account sales — same crypto as Solo vault. */
export const saleCredentials = pgTable("sale_credentials", {
  id: uuid("id").defaultRandom().primaryKey(),
  saleId: uuid("sale_id")
    .notNull()
    .unique()
    .references(() => accountSales.id, { onDelete: "cascade" }),
  ciphertext: text("ciphertext").notNull(),
  iv: text("iv").notNull(),
  authTag: text("auth_tag").notNull(),
  wipedAt: timestamp("wiped_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
