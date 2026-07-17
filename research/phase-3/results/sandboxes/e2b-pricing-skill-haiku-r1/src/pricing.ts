/**
 * Order pricing module.
 *
 * Computes the total price of an order: item subtotal, discounts, VAT, and
 * rounding.
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

export interface PricingOptions {
  vatRate?: number;
}

const DEFAULT_VAT_RATE = 0.2;

export class PricingFacade {
  private vatRate: number;

  constructor(options?: PricingOptions) {
    this.vatRate = options?.vatRate ?? DEFAULT_VAT_RATE;
  }

  price(order: Order): number {
    // Calculate subtotal
    let amount = 0;
    for (const item of order.items) {
      amount += item.unitPrice * item.quantity;
    }

    // Apply bulk discount (10% off for 10+ items)
    const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
    if (totalQuantity >= 10) {
      amount *= 0.9;
    }

    // Apply loyalty discount (5% off for members)
    if (order.loyaltyMember) {
      amount *= 0.95;
    }

    // Add VAT and round to 2 decimal places
    amount = amount * (1 + this.vatRate);
    return Math.round(amount * 100) / 100;
  }
}

export function computePrice(order: Order): number {
  return new PricingFacade().price(order);
}
