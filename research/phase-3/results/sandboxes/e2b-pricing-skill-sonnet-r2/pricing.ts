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

function assertSupportedCurrency(currency: Currency): void {
  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    throw new Error(`Unsupported currency: ${currency}`);
  }
}

interface DiscountStrategy {
  applies(order: Order): boolean;
  apply(subtotal: number): number;
}

const discountStrategies: DiscountStrategy[] = [
  {
    applies: (order) => order.items.reduce((sum, item) => sum + item.quantity, 0) >= 10,
    apply: (subtotal) => subtotal * 0.9,
  },
  {
    applies: (order) => new Set(order.items.map((item) => item.name)).size >= 3,
    apply: (subtotal) => subtotal * 0.98,
  },
  {
    applies: (order) => order.loyaltyMember,
    apply: (subtotal) => subtotal * 0.95,
  },
];

function round(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function runPipeline(order: Order, options: PricingOptions): number {
  assertSupportedCurrency(order.currency);

  const hooks = options.hooks ?? {};
  const vatRate = options.vatRate ?? DEFAULT_VAT_RATE;
  let running = 0;

  const stage = (name: string, compute: () => number) => {
    hooks.beforeStage?.(name);
    running = compute();
    hooks.afterStage?.(name, running);
  };

  stage("subtotal", () =>
    order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
  );

  stage("discount", () =>
    discountStrategies.reduce(
      (subtotal, strategy) => (strategy.applies(order) ? strategy.apply(subtotal) : subtotal),
      running,
    ),
  );

  stage("tax", () => running * (1 + vatRate));

  stage("rounding", () => round(running));

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
