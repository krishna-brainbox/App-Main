import {
  OrderDiscountSelectionStrategy,
  ProductDiscountSelectionStrategy,
  DiscountClass,
} from "../generated/api";

export function cartLinesDiscountsGenerateRun(input) {
  console.error("Input:", JSON.stringify(input, null, 2));

  if (!input.cart.lines.length) {
    throw new Error("No cart lines found");
  }

  const {
    cartLinePercentage,
    orderPercentage,
    collectionIds,
    applyToCheapestLineOnly,
    minimumQuantity,
    quantityToDiscount,
  } = parseMetafield(input.discount.metafield);

  console.error("Parsed configuration:", {
    cartLinePercentage,
    orderPercentage,
    collectionIds,
    applyToCheapestLineOnly,
    minimumQuantity,
    quantityToDiscount,
  });

  const hasOrderDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Order,
  );
  const hasProductDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Product,
  );

  console.error("Classes:", {
    hasOrderDiscountClass,
    hasProductDiscountClass,
    classes: input.discount.discountClasses,
  });

  if (!hasOrderDiscountClass && !hasProductDiscountClass) {
    return { operations: [] };
  }

  const operations = [];
  // Add product discounts first if available and allowed
  if (hasProductDiscountClass && cartLinePercentage > 0) {
    let cartLineTargets = input.cart.lines.reduce((targets, line) => {
      const inAnyCollection = line.merchandise.product?.inAnyCollection;
      const isProduct = "product" in line.merchandise;

      console.error(
        `Line ${line.id}: isProduct=${isProduct}, inAnyCollection=${inAnyCollection}, collectionIdsLen=${collectionIds.length}`,
      );

      if (isProduct && (inAnyCollection || collectionIds.length === 0)) {
        // Check minimum quantity requirement
        if (minimumQuantity > 0 && line.quantity < minimumQuantity) {
          return targets;
        }

        targets.push({
          cartLine: {
            id: line.id,
          },
          cost: parseFloat(
            line.cost.amountPerQuantity?.amount ||
            line.cost.subtotalAmount.amount,
          ),
          quantity: line.quantity,
        });
      }
      return targets;
    }, []);

    if (applyToCheapestLineOnly && cartLineTargets.length > 0) {
      // Sort by cost ascending
      cartLineTargets.sort((a, b) => a.cost - b.cost);
      console.error(
        "Sorted targets for cheapest strategy:",
        JSON.stringify(cartLineTargets),
      );
      // Keep only the first (cheapest)
      cartLineTargets = [cartLineTargets[0]];
    }

    // Clean up targets and determine discount value
    const finalTargets = cartLineTargets.map((t) => ({
      cartLine: t.cartLine,
    }));

    console.error("Targets found:", finalTargets.length);

    if (finalTargets.length > 0) {
      if (quantityToDiscount > 0) {
        // Apply fixed amount discount based on quantityToDiscount
        const candidates = cartLineTargets.map(target => {
          const price = target.cost;
          // Discount amount = Price * QtyToDiscount * (Percentage / 100)
          const amountToDiscount = price * quantityToDiscount * (cartLinePercentage / 100);

          return {
            message: `${cartLinePercentage}% OFF ${quantityToDiscount} UNIT(S)`,
            targets: [{ cartLine: target.cartLine }],
            value: {
              fixedAmount: {
                amount: amountToDiscount.toFixed(2),
              }
            }
          };
        });

        operations.push({
          productDiscountsAdd: {
            candidates: candidates,
            selectionStrategy: ProductDiscountSelectionStrategy.First,
          },
        });

      } else {
        operations.push({
          productDiscountsAdd: {
            candidates: [
              {
                message: `${cartLinePercentage}% OFF PRODUCT`,
                targets: finalTargets,
                value: {
                  percentage: {
                    value: cartLinePercentage,
                  },
                },
              },
            ],
            selectionStrategy: ProductDiscountSelectionStrategy.First,
          },
        });
      }
    }
  }

  // Then add order discounts if available and allowed
  if (hasOrderDiscountClass && orderPercentage > 0) {
    operations.push({
      orderDiscountsAdd: {
        candidates: [
          {
            message: `${orderPercentage}% OFF ORDER`,
            targets: [
              {
                orderSubtotal: {
                  excludedCartLineIds: [],
                },
              },
            ],
            value: {
              percentage: {
                value: orderPercentage,
              },
            },
          },
        ],
        selectionStrategy: OrderDiscountSelectionStrategy.First,
      },
    });
  }

  console.error("Operations:", JSON.stringify(operations, null, 2));
  return { operations };
}

function parseMetafield(metafield) {
  try {
    const value = JSON.parse(metafield.value);
    return {
      cartLinePercentage: value.cartLinePercentage || 0,
      orderPercentage: value.orderPercentage || 0,
      collectionIds: value.collectionIds || [],
      applyToCheapestLineOnly: value.applyToCheapestLineOnly || false,
      minimumQuantity: value.minimumQuantity || 0,
      quantityToDiscount: value.quantityToDiscount || 0,
    };
  } catch (error) {
    console.error("Error parsing metafield", error);
    return {
      cartLinePercentage: 0,
      orderPercentage: 0,
      collectionIds: [],
      applyToCheapestLineOnly: false,
      minimumQuantity: 0,
      quantityToDiscount: 0,
    };
  }
}
