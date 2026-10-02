"use client";

import { useSyncExternalStore } from "react";

import { DEMOS, type DemoId } from "@/lib/demos";

import { DemoModal } from "./demo-modal";
import { IframeDemo } from "./iframe-demo";

const PHONE = "(max-width: 767px)";

function subscribePhone(onChange: () => void) {
  const query = window.matchMedia(PHONE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * `id` stays set after closing, so the product keeps rendering while the
 * modal animates out. `onClose` must be stable (useCallback).
 */
export function ProductDemo({
  id,
  open,
  onClose,
}: {
  id: DemoId;
  open: boolean;
  onClose: () => void;
}) {
  const demo = DEMOS[id];
  const phone = useSyncExternalStore(
    subscribePhone,
    () => window.matchMedia(PHONE).matches,
    () => false,
  );

  return (
    <DemoModal
      open={open}
      onClose={onClose}
      name={demo.name}
      tagline={demo.tagline}
      url={demo.url}
      accent={demo.accent}
      design={demo.design}
      shell={demo.shell}
      brief={demo.brief}
      compact={phone}
    >
      {/* A phone gets the product's own mobile layout, full width and
          unscaled; everything larger gets the design viewport, fitted. */}
      <IframeDemo
        key={`${id}-${phone ? "phone" : "desk"}`}
        src={phone && "phoneSrc" in demo ? demo.phoneSrc : demo.src}
        title={`${demo.name} interactive demo`}
        design={phone ? undefined : demo.design}
        background={demo.background}
      />
    </DemoModal>
  );
}
