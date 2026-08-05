export const UserRoles = ['client', 'booster', 'mod', 'admin'] as const;
export type UserRole = (typeof UserRoles)[number];

export const VerificationStatuses = [
  'pending',
  'verified_tier1',
  'verified_tier2',
  'verified',
  'suspended',
  'rejected',
] as const;
export type VerificationStatus = (typeof VerificationStatuses)[number];

export const OrderStatuses = [
  'draft',
  'submitted',
  'in_queue',
  'in_progress',
  'completed',
  'cancelled',
  'disputed',
] as const;
export type OrderStatus = (typeof OrderStatuses)[number];

export const PaymentStatuses = [
  'pending',
  'succeeded',
  'failed',
  'refunded',
  'disputed',
] as const;
export type PaymentStatus = (typeof PaymentStatuses)[number];

export const PayoutMethods = ['bank_transfer', 'card', 'paymob'] as const;
export type PayoutMethod = (typeof PayoutMethods)[number];

export const PayoutStatuses = ['pending', 'paid', 'failed', 'cancelled'] as const;
export type PayoutStatus = (typeof PayoutStatuses)[number];

export const TransactionStatuses = ['succeeded', 'failed', 'pending'] as const;
export type TransactionStatus = (typeof TransactionStatuses)[number];

export const QueueStatuses = ['waiting', 'assigned', 'removed'] as const;
export type QueueStatus = (typeof QueueStatuses)[number];

export const TicketStatuses = ['open', 'in_progress', 'resolved', 'closed'] as const;
export type TicketStatus = (typeof TicketStatuses)[number];

export const TicketPriorities = ['low', 'normal', 'high', 'urgent'] as const;
export type TicketPriority = (typeof TicketPriorities)[number];

export const IssueTypes = [
  'account_access',
  'refund_request',
  'quality_dispute',
  'technical_issue',
  'other',
] as const;
export type IssueType = (typeof IssueTypes)[number];

export const NotificationTypes = [
  'order_status',
  'message',
  'payout',
  'warning',
  'support',
  'promo',
  'verification',
] as const;
export type NotificationType = (typeof NotificationTypes)[number];

export const SubscriptionStatuses = [
  'active',
  'cancelled',
  'expired',
  'past_due',
] as const;
export type SubscriptionStatus = (typeof SubscriptionStatuses)[number];

export const FraudFlagTypes = [
  'chargeback',
  'multiple_disputes',
  'unusual_activity',
  'account_verification_failed',
  'vpn_detected',
] as const;
export type FraudFlagType = (typeof FraudFlagTypes)[number];

export const FraudSeverities = ['low', 'medium', 'high', 'critical'] as const;
export type FraudSeverity = (typeof FraudSeverities)[number];

/** Default and supported currencies (Paymob multi-currency). */
export const DEFAULT_CURRENCY = 'USD' as const;

export const SupportedCurrencies = [
  'USD',
  'EGP',
  'AED',
  'SAR',
  'EUR',
  'GBP',
] as const;
export type CurrencyCode = (typeof SupportedCurrencies)[number];

export const PLATFORM_COMMISSION_RATE = 0.3;
export const BOOSTER_EARNINGS_RATE = 0.7;
export const PLUS_MEMBERSHIP_MONTHLY_USD = 9.99;
export const MIN_PAYOUT_THRESHOLD = 50;
export const PAYOUT_HOLD_HOURS = 48;
