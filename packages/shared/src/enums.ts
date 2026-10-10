export const UserRoles = ['client', 'booster', 'admin'] as const;
export type UserRole = (typeof UserRoles)[number];

/** MVP order lifecycle — see docs/IMPLEMENTATION-PLAN.md */
export const OrderStatuses = [
  'draft',
  'awaiting_payment',
  'paid',
  'offered',
  'assigned',
  'in_progress',
  'delivered',
  'completed',
  'released',
  'paid_out',
  'disputed',
  'refunded',
  'cancelled',
  'expired_offer',
] as const;
export type OrderStatus = (typeof OrderStatuses)[number];

export const ServiceTypes = ['solo', 'duo'] as const;
export type ServiceType = (typeof ServiceTypes)[number];

export const GameSlugs = [
  'lol',
  'valorant',
  'overwatch',
  'marvel_rivals',
  'apex',
] as const;
export type GameSlug = (typeof GameSlugs)[number];

export const SkuKinds = [
  'rank_climb',
  'unit_farm',
  'progress_band',
  'fixed_package',
] as const;
export type SkuKind = (typeof SkuKinds)[number];

/** Basis points: 7500 = 75% to booster on matched-pool orders */
export const CONTRACTOR_SHARE_BPS = 7500;
/** Basis points: 8000 = 80% to seller on account sales */
export const SELLER_SHARE_BPS = 8000;

export const PaymentProviders = ['polar', 'stripe', 'manual'] as const;
export type PaymentProvider = (typeof PaymentProviders)[number];

export const PaymentStatuses = [
  'pending',
  'succeeded',
  'failed',
  'refunded',
  'disputed',
] as const;
export type PaymentStatus = (typeof PaymentStatuses)[number];

export const LedgerEntryTypes = [
  'escrow_held',
  'booster_payable',
  'released',
  'paid_out',
  'refunded',
] as const;
export type LedgerEntryType = (typeof LedgerEntryTypes)[number];

export const PayoutMethods = ['payoneer', 'wise', 'usdt'] as const;
export type PayoutMethod = (typeof PayoutMethods)[number];

export const PayoutStatuses = ['pending', 'paid', 'failed', 'cancelled'] as const;
export type PayoutStatus = (typeof PayoutStatuses)[number];

export const VerificationStatuses = [
  'pending',
  'rank_proof_submitted',
  'active',
  'id_verified',
  'suspended',
  'rejected',
] as const;
export type VerificationStatus = (typeof VerificationStatuses)[number];

export const ListingStatuses = [
  'draft',
  'listed',
  'reserved',
  'sold',
  'removed',
] as const;
export type ListingStatus = (typeof ListingStatuses)[number];

export const AccountSaleStatuses = [
  'awaiting_payment',
  'held',
  'delivered',
  'completed',
  'released',
  'disputed',
  'refunded',
  'cancelled',
] as const;
export type AccountSaleStatus = (typeof AccountSaleStatuses)[number];

/** Seller marketplace categories (G2G-style). Matched-pool HardStuck Boost is separate. */
export const MarketplaceCategories = [
  'boosting',
  'account',
  'coins',
  'items',
  'top_up',
  'gift_card',
  'coaching',
] as const;
export type MarketplaceCategory = (typeof MarketplaceCategories)[number];

export const SupportTicketStatuses = [
  'open',
  'pending',
  'resolved',
] as const;
export type SupportTicketStatus = (typeof SupportTicketStatuses)[number];

export const SupportTicketPriorities = [
  'low',
  'normal',
  'high',
  'urgent',
] as const;
export type SupportTicketPriority = (typeof SupportTicketPriorities)[number];
