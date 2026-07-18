/**
 * Order pricing module.
 *
 * Computes the total price of an order: item subtotal, discounts, VAT, and
 * currency-aware rounding. The public surface is `computePrice`, the
 * `PricingFacade`, and the option/type exports; everything else is internal
 * machinery.
 */

export interface OrderItem {
  name: string;
  unitPrice: number;
  quantity: number;
}

export type Currency = "GBP" | "EUR" | "USD";

export interface Order {
  items: OrderItem[];
  currency: Currency;
  loyaltyMember: boolean;
}

export interface PricingHooks {
  beforeStage?(stageName: string): void;
  afterStage?(stageName: string, runningTotal: number): void;
}

export interface PricingOptions {
  vatRate?: number;
  /** Only half-up rounding is implemented; the enum anticipates bankers'. */
  roundingMode?: "half-up";
  /** Reserved for localised price formatting. */
  locale?: string;
  /** Observability hooks invoked around every pipeline stage. */
  hooks?: PricingHooks;
}

const DEFAULT_VAT_RATE = 0.2;

const BULK_QUANTITY_THRESHOLD = 10;
const BULK_DISCOUNT_MULTIPLIER = 0.9;

const MULTI_LINE_ITEM_THRESHOLD = 3;
const MULTI_LINE_DISCOUNT_MULTIPLIER = 0.98;

const LOYALTY_DISCOUNT_MULTIPLIER = 0.95;

function computeSubtotal(order: Order): number {
  return order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

function totalQuantity(order: Order): number {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}

function distinctItemCount(order: Order): number {
  return new Set(order.items.map((item) => item.name)).size;
}

/** Applies bulk, then multi-line, then loyalty discounts, in that order. */
function applyDiscounts(order: Order, subtotal: number): number {
  let total = subtotal;

  if (totalQuantity(order) >= BULK_QUANTITY_THRESHOLD) {
    total *= BULK_DISCOUNT_MULTIPLIER;
  }
  if (distinctItemCount(order) >= MULTI_LINE_ITEM_THRESHOLD) {
    total *= MULTI_LINE_DISCOUNT_MULTIPLIER;
  }
  if (order.loyaltyMember) {
    total *= LOYALTY_DISCOUNT_MULTIPLIER;
  }

  return total;
}

function applyVat(amount: number, vatRate: number): number {
  return amount * (1 + vatRate);
}

function roundToCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export class PricingFacade {
  private readonly vatRate: number;
  private readonly hooks: PricingHooks;

  constructor(options?: PricingOptions) {
    this.vatRate = options?.vatRate ?? DEFAULT_VAT_RATE;
    this.hooks = options?.hooks ?? {};
  }

  price(order: Order): number {
    const subtotal = this.runStage("subtotal", () => computeSubtotal(order));
    const discounted = this.runStage("discount", () => applyDiscounts(order, subtotal));
    const taxed = this.runStage("tax", () => applyVat(discounted, this.vatRate));
    return this.runStage("rounding", () => roundToCents(taxed));
  }

  /** Runs a pricing stage, firing `beforeStage`/`afterStage` hooks around it. */
  private runStage(name: string, run: () => number): number {
    this.hooks.beforeStage?.(name);
    const result = run();
    this.hooks.afterStage?.(name, result);
    return result;
  }
}

export function computePrice(order: Order, options?: PricingOptions): number {
  return new PricingFacade(options).price(order);
}
