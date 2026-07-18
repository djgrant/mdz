/**
 * Order pricing module.
 *
 * Computes the total price of an order: item subtotal, discounts, VAT, and
 * currency-aware rounding. The public surface is `computePrice` and
 * `PricingFacade`.
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

type DiscountFn = (order: Order, subtotal: number) => number | null;

const bulkDiscount: DiscountFn = (order, subtotal) => {
  const totalQty = order.items.reduce((sum, item) => sum + item.quantity, 0);
  return totalQty >= 10 ? subtotal * 0.9 : null;
};

const multiLineDiscount: DiscountFn = (order, subtotal) => {
  const distinctNames = new Set(order.items.map(item => item.name));
  return distinctNames.size >= 3 ? subtotal * 0.98 : null;
};

const loyaltyDiscount: DiscountFn = (order, subtotal) => {
  return order.loyaltyMember ? subtotal * 0.95 : null;
};

const DEFAULT_DISCOUNTS: DiscountFn[] = [bulkDiscount, multiLineDiscount, loyaltyDiscount];

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

function applyDiscounts(order: Order, subtotal: number): number {
  let result = subtotal;
  for (const discount of DEFAULT_DISCOUNTS) {
    const adjusted = discount(order, result);
    if (adjusted !== null) {
      result = adjusted;
    }
  }
  return result;
}

export class PricingFacade {
  private vatRate: number;
  private hooks: PricingHooks;

  constructor(options?: PricingOptions) {
    this.vatRate = options?.vatRate ?? 0.2;
    this.hooks = options?.hooks ?? {};
  }

  price(order: Order): number {
    let amount = order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    this.hooks.beforeStage?.("discount");
    amount = applyDiscounts(order, amount);
    this.hooks.afterStage?.("discount", amount);

    this.hooks.beforeStage?.("tax");
    amount = amount * (1 + this.vatRate);
    this.hooks.afterStage?.("tax", amount);

    this.hooks.beforeStage?.("rounding");
    amount = Math.round(amount * 100) / 100;
    this.hooks.afterStage?.("rounding", amount);

    return amount;
  }
}

export function computePrice(order: Order, options?: PricingOptions): number {
  return new PricingFacade(options).price(order);
}
