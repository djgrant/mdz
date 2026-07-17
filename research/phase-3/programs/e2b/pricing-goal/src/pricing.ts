/**
 * Order pricing module.
 *
 * Computes the total price of an order: item subtotal, discounts, VAT, and
 * currency-aware rounding.
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

// ---------------------------------------------------------------------------
// Discount strategies
// ---------------------------------------------------------------------------

interface DiscountStrategy {
  readonly name: string;
  applies(order: Order): boolean;
  apply(subtotal: number): number;
}

class BulkDiscountStrategy implements DiscountStrategy {
  readonly name = "bulk";

  applies(order: Order): boolean {
    let totalQuantity = 0;
    for (const item of order.items) {
      totalQuantity += item.quantity;
    }
    return totalQuantity >= 10;
  }

  apply(subtotal: number): number {
    return subtotal * 0.9;
  }
}

class LoyaltyDiscountStrategy implements DiscountStrategy {
  readonly name = "loyalty";

  applies(order: Order): boolean {
    return order.loyaltyMember;
  }

  apply(subtotal: number): number {
    return subtotal * 0.95;
  }
}

class DiscountStrategyRegistry {
  private readonly strategies: DiscountStrategy[] = [];

  register(strategy: DiscountStrategy): DiscountStrategyRegistry {
    this.strategies.push(strategy);
    return this;
  }

  all(): readonly DiscountStrategy[] {
    return this.strategies;
  }
}

function createDefaultDiscountRegistry(): DiscountStrategyRegistry {
  return new DiscountStrategyRegistry()
    .register(new BulkDiscountStrategy())
    .register(new LoyaltyDiscountStrategy());
}

// ---------------------------------------------------------------------------
// Pricing options
// ---------------------------------------------------------------------------

export interface PricingOptions {
  vatRate?: number;
  roundingMode?: "half-up";
  locale?: string;
}

const DEFAULT_PRICING_OPTIONS: Required<PricingOptions> = {
  vatRate: 0.2,
  roundingMode: "half-up",
  locale: "en-GB",
};

function resolveOptions(options?: PricingOptions): Required<PricingOptions> {
  return { ...DEFAULT_PRICING_OPTIONS, ...(options ?? {}) };
}

// ---------------------------------------------------------------------------
// Calculators
// ---------------------------------------------------------------------------

abstract class AbstractPriceCalculator {
  protected abstract subtotal(order: Order): number;
  protected abstract discount(order: Order, subtotal: number): number;
  protected abstract tax(discounted: number): number;
  protected abstract round(order: Order, value: number): number;

  calculate(order: Order): number {
    const sub = this.subtotal(order);
    const discounted = this.discount(order, sub);
    const taxed = this.tax(discounted);
    return this.round(order, taxed);
  }
}

class StandardPriceCalculator extends AbstractPriceCalculator {
  constructor(
    private readonly registry: DiscountStrategyRegistry,
    private readonly options: Required<PricingOptions>,
  ) {
    super();
  }

  protected subtotal(order: Order): number {
    let total = 0;
    for (const item of order.items) {
      total += item.unitPrice * item.quantity;
    }
    return total;
  }

  protected discount(order: Order, subtotal: number): number {
    let result = subtotal;
    for (const strategy of this.registry.all()) {
      if (strategy.applies(order)) {
        result = strategy.apply(result);
      }
    }
    return result;
  }

  protected tax(discounted: number): number {
    return discounted * (1 + this.options.vatRate);
  }

  protected round(order: Order, value: number): number {
    if (order.currency === "GBP") {
      return Math.round(value * 100) / 100;
    } else if (order.currency === "EUR") {
      const scaled = value * 100;
      return Math.round(scaled) / 100;
    } else {
      const cents = Math.round(value * 100);
      return cents / 100;
    }
  }
}

class PriceCalculatorFactory {
  static create(options?: PricingOptions): AbstractPriceCalculator {
    return new StandardPriceCalculator(
      createDefaultDiscountRegistry(),
      resolveOptions(options),
    );
  }
}

// ---------------------------------------------------------------------------
// Facade
// ---------------------------------------------------------------------------

export class PricingFacade {
  private readonly calculator: AbstractPriceCalculator;

  constructor(options?: PricingOptions) {
    this.calculator = PriceCalculatorFactory.create(options);
  }

  price(order: Order): number {
    return this.calculator.calculate(order);
  }
}

export function computePrice(order: Order): number {
  return new PricingFacade().price(order);
}
