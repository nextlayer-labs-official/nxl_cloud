"use client";

import { useState } from "react";
import { FilterPill } from "@/components/common/filter-pill";
import { FormField } from "@/components/common/form-field";
import { CONTACT_INTENTS, DEFAULT_CONTACT_INTENT_ID } from "@/constants/contact";

export function ContactForm() {
  const [intentId, setIntentId] = useState(DEFAULT_CONTACT_INTENT_ID);
  const [submitted, setSubmitted] = useState(false);
  const intent = CONTACT_INTENTS.find((i) => i.id === intentId)!;

  return (
    <>
      <div className="mb-10 flex flex-wrap justify-center gap-2">
        {CONTACT_INTENTS.map((i) => (
          <FilterPill
            key={i.id}
            active={intentId === i.id}
            onClick={() => setIntentId(i.id)}
            className="px-5 py-2.5"
          >
            {i.label}
          </FilterPill>
        ))}
      </div>

      {submitted ? (
        <div className="border-success-border bg-success-bg rounded-xl border p-8 text-center">
          <div className="mb-2 text-[17px] font-semibold">Message sent</div>
          <div className="text-ink-600 text-sm">We&apos;ll respond within 1 business day.</div>
        </div>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
        >
          {intent.showCompany && <FormField id="c-company" label="Company" />}
          <FormField id="c-name" label="Name" />
          <FormField id="c-email" label={intent.emailLabel} type="email" />
          <FormField id="c-message" label={intent.messageLabel} as="textarea" rows={5} />
          <button
            type="submit"
            className="bg-primary text-primary-foreground mt-2 rounded-lg p-3.5 text-[15px] font-semibold"
          >
            Send message
          </button>
          {intent.altContact && (
            <div className="text-ink-550 mt-2 text-center text-[13px]">{intent.altContact}</div>
          )}
        </form>
      )}
    </>
  );
}
