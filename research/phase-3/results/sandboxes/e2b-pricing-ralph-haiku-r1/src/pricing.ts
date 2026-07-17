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

const DEFAULT_OPTIONS = {
  vatRate: 0.2,
  roundingMode: "half-up" as const,
  locale: "en-GB",
};

function resolveOptions(options?: PricingOptions) {
  return {
    ...DEFAULT_OPTIONS,
    ...options,
    hooks: options?.hooks ?? {},
  };
}

const DISCOUNTS = [
  {
    name: "bulk",
    applies: (order: Order) => order.items.reduce((sum, item) => sum + item.quantity, 0) >= 10,
    apply: (amount: number) => amount * 0.9,
  },
  {
    name: "multi-line",
    applies: (order: Order) => new Set(order.items.map(item => item.name)).size >= 3,
    apply: (amount: number) => amount * 0.98,
  },
  {
    name: "loyalty",
    applies: (order: Order) => order.loyaltyMember,
    apply: (amount: number) => amount * 0.95,
  },
];

export class PricingFacade {
  private readonly options: ReturnType<typeof resolveOptions>;

  constructor(options?: PricingOptions) {
    this.options = resolveOptions(options);
  }

  price(order: Order): number {
    let amount = 0;

    const stage = (name: string, fn: () => void) => {
      this.options.hooks.beforeStage?.(name);
      fn();
      this.options.hooks.afterStage?.(name, amount);
    };

    // Subtotal
    stage("subtotal", () => {
      for (const item of order.items) {
        amount += item.unitPrice * item.quantity;
      }
    });

    // Discounts
    stage("discount", () => {
      for (const discount of DISCOUNTS) {
        if (discount.applies(order)) {
          amount = discount.apply(amount);
        }
      }
    });

    // Tax
    stage("tax", () => {
      amount *= 1 + this.options.vatRate;
    });

    // Rounding
    stage("rounding", () => {
      amount = Math.round(amount * 100) / 100;
    });

    return amount;
  }
}

export function computePrice(order: Order, options?: PricingOptions): number {
  return new PricingFacade(options).price(order);
}
