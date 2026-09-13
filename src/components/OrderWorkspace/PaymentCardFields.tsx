import { useMemo, useState } from "react";

type CardBrand = "Visa" | "Mastercard" | "American Express" | "Discover";

export function detectCardBrand(value: string): CardBrand | null {
  const digits = value.replace(/\D/g, "");
  if (/^4/.test(digits)) return "Visa";
  if (/^3[47]/.test(digits)) return "American Express";
  if (/^(6011|65|64[4-9])/.test(digits)) return "Discover";

  const firstTwo = Number(digits.slice(0, 2));
  const firstFour = Number(digits.slice(0, 4));
  if (
    (digits.length >= 2 && firstTwo >= 51 && firstTwo <= 55) ||
    (digits.length >= 4 && firstFour >= 2221 && firstFour <= 2720)
  ) {
    return "Mastercard";
  }
  return null;
}

function formatCardNumber(value: string, brand: CardBrand | null) {
  const maxLength = brand === "American Express" ? 15 : 16;
  const digits = value.replace(/\D/g, "").slice(0, maxLength);

  if (brand === "American Express") {
    return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)]
      .filter(Boolean)
      .join(" ");
  }
  return digits.match(/.{1,4}/g)?.join(" ") ?? "";
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)} / ${digits.slice(2)}` : digits;
}

export function PaymentCardFields() {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const brand = useMemo(() => detectCardBrand(cardNumber), [cardNumber]);
  const digits = cardNumber.replace(/\D/g, "");
  const lastFour = digits.length >= 4 ? digits.slice(-4) : "••••";

  return (
    <div className="payment-card-entry">
      <div className={`payment-card-preview ${brand ? "has-brand" : ""}`}>
        <div>
          <span className="card-chip" aria-hidden="true" />
          <span className="detected-card-brand" aria-live="polite">
            {brand ?? "Card type"}
          </span>
        </div>
        <strong>•••• •••• •••• {lastFour}</strong>
        <small>{brand ? `${brand} detected` : "Appears as you type"}</small>
      </div>

      <div className="payment-details" aria-label="Payment card details">
        <div className="payment-card-number-field">
          <label htmlFor="payment-card-number">Card number</label>
          <div className="card-number-control">
            <input
              id="payment-card-number"
              value={cardNumber}
              inputMode="numeric"
              autoComplete="off"
              placeholder="1234 5678 9012 3456"
              aria-describedby="card-brand-status"
              onChange={(event) => {
                const nextBrand = detectCardBrand(event.target.value);
                setCardNumber(formatCardNumber(event.target.value, nextBrand));
              }}
            />
            <span id="card-brand-status">{brand ?? "Card"}</span>
          </div>
        </div>
        <label>
          Expiry
          <input
            value={expiry}
            inputMode="numeric"
            autoComplete="off"
            placeholder="MM / YY"
            onChange={(event) => setExpiry(formatExpiry(event.target.value))}
          />
        </label>
        <label>
          CVC
          <input
            value={cvc}
            inputMode="numeric"
            autoComplete="off"
            placeholder="CVC"
            maxLength={4}
            onChange={(event) => setCvc(event.target.value.replace(/\D/g, ""))}
          />
        </label>
      </div>
      <p className="payment-local-note">
        Demo only. Card details stay in this page and are never submitted.
      </p>
    </div>
  );
}
