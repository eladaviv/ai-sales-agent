"use client";

import { useState } from "react";
import type { PaymentTrigger } from "@/types";
import { PLAN_FEATURES } from "@/constants";
import { Tag } from "@/components/shared/Atoms";

interface PaymentCardProps {
  trigger: PaymentTrigger;
}

export function PaymentCard({ trigger }: PaymentCardProps) {
  const [sent, setSent] = useState(false);

  const features = PLAN_FEATURES[trigger.plan] ?? [];

  function handleSend() {
    setSent(true);
    // In production this is already fired by the API route via n8n.
    // This button is just a visual confirm for the demo.
  }

  return (
    <div className="payment-card">
      {/* Top row: plan name + price */}
      <div className="payment-card__top">
        <div>
          <div className="payment-card__plan-label">Recommended Plan</div>
          <div className="payment-card__plan-name">
            {trigger.plan}{" "}
            <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 400 }}>
              plan
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            {trigger.seats} seats · {trigger.company}
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          {trigger.monthlyTotal ? (
            <>
              <div className="payment-card__price">${trigger.monthlyTotal}</div>
              <div className="payment-card__price-sub">per month</div>
            </>
          ) : (
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--blue)" }}>
              Custom pricing
            </div>
          )}
        </div>
      </div>

      {/* Feature tags */}
      <div className="payment-card__features">
        {features.map((f) => (
          <Tag key={f} variant="blue">{f}</Tag>
        ))}
      </div>

      {/* CTA */}
      {sent ? (
        <div className="payment-card__sent">
          ✓ Payment link sent to {trigger.email}
          <span>n8n → Stripe → SendGrid</span>
        </div>
      ) : (
        <button className="payment-card__send-btn" onClick={handleSend}>
          Send payment link to {trigger.email} →
        </button>
      )}
    </div>
  );
}
