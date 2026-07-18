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
  roundingMode?: "half-up";
  locale?: string;
  hooks?: PricingHooks;
}

const DEFAULT_VAT_RATE = 0.2;
const SUPPORTED_CURRENCIES: readonly Currency[] = ["GBP", "EUR", "USD"];

function subtotalOf(order: Order): number {
  return order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

function applyBulkDiscount(order: Order, amount: number): number {
  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
  return totalQuantity >= 10 ? amount * 0.9 : amount;
}

function applyMultiLineDiscount(order: Order, amount: number): number {
  const distinctNames = new Set(order.items.map((item) => item.name)).size;
  return distinctNames >= 3 ? amount * 0.98 : amount;
}

function applyLoyaltyDiscount(order: Order, amount: number): number {
  return order.loyaltyMember ? amount * 0.95 : amount;
}

function applyDiscounts(order: Order, subtotal: number): number {
  let amount = subtotal;
  amount = applyBulkDiscount(order, amount);
  amount = applyMultiLineDiscount(order, amount);
  amount = applyLoyaltyDiscount(order, amount);
  return amount;
}

function round(amount: number, currency: Currency): number {
  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    throw new Error(`no rounding policy for currency: ${currency}`);
  }
  return Math.round(amount * 100) / 100;
}

function runPipeline(order: Order, options: PricingOptions): number {
  const hooks = options.hooks ?? {};
  const vatRate = options.vatRate ?? DEFAULT_VAT_RATE;
  let running = 0;
  const runStage = (name: string, compute: () => number) => {
    hooks.beforeStage?.(name);
    running = compute();
    hooks.afterStage?.(name, running);
  };
  runStage("subtotal", () => subtotalOf(order));
  runStage("discount", () => applyDiscounts(order, running));
  runStage("tax", () => running * (1 + vatRate));
  runStage("rounding", () => round(running, order.currency));
  return running;
}

export class PricingFacade {
  private readonly options: PricingOptions;
  constructor(options?: PricingOptions) {
    this.options = options ?? {};
  }
  price(order: Order): number {
    return runPipeline(order, this.options);
  }
}

export function computePrice(order: Order, options?: PricingOptions): number {
  return new PricingFacade(options).price(order);
}
