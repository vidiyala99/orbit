"use client";

import { animate, motion, useIsPresent, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { LinkedInIcon, XIcon } from "@/components/SocialIcons";
import { TIER_LABEL, fullName, titleLine, type BadgePerson } from "@/lib/badge";
import BadgeAvatar from "./BadgeAvatar";
import { FLIP_TRANSITION, SWIPE_DISTANCE_PX, SWIPE_VELOCITY_PX_S, keepFlashVariants, type MotionIntent } from "./badgeMotion";

/** Approximate advance of an uppercase Big Shoulders glyph, in ems. */
const NAME_GLYPH_EM = 0.56;

/** Largest size that still fits the badge column: capped by the design size, scaled by length. */
function firstNameSize(name: string): string {
  const chars = Math.max(name.length, 3);
  return `min(var(--bw-name-xl), ${(100 / (chars * NAME_GLYPH_EM)).toFixed(2)}cqi)`;
}

export function SocialButtons({ person, className = "" }: { person: BadgePerson; className?: string }) {
  const name = fullName(person);
  if (!person.linkedinUrl && !person.xUrl) return null;
  return (
    <div className={`bw-socials ${className}`}>
      {person.linkedinUrl ? (
        <a href={person.linkedinUrl} target="_blank" rel="noopener noreferrer" className="bw-social" aria-label={`${name} on LinkedIn`}>
          <span className="bw-li-glyph">
            <LinkedInIcon />
          </span>
          <span>LinkedIn</span>
        </a>
      ) : null}
      {person.xUrl ? (
        <a href={person.xUrl} target="_blank" rel="noopener noreferrer" className="bw-social" aria-label={`${name} on X`}>
          <XIcon />
          <span>X</span>
        </a>
      ) : null}
    </div>
  );
}

function PersonChips({ person }: { person: BadgePerson }) {
  if (!person.company && !person.signals.length) return null;
  return (
    <ul className="bw-chips" aria-label="About this person">
      {person.company ? (
        <li className="bw-chip bw-chip-company">
          <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3 w-3 shrink-0">
            <path fill="currentColor" d="M3 14V3.5L8.5 2v2.2L13 5.5V14h-3.2v-2.6H8.2V14H3Zm2-8h1.6V7.6H5V6Zm0 3h1.6v1.6H5V9Zm3.4-3H10v1.6H8.4V6Zm0 3H10v1.6H8.4V9Z" />
          </svg>
          <span className="sr-only">Works at </span>
          {person.company}
        </li>
      ) : null}
      {person.signals.map((signal) => (
        <li key={signal} className="bw-chip">
          {signal}
        </li>
      ))}
    </ul>
  );
}

/** Identity on every screen; on phones and tablets it also carries the opener and Why. */
function BadgeFront({ person }: { person: BadgePerson }) {
  const name = fullName(person);
  return (
    <div className="bw-face bw-front">
      <span aria-hidden="true" className="bw-slot" />
      <div className="bw-front-grid">
        <div className="bw-photo-frame">
          <BadgeAvatar src={person.avatarUrl} name={name} eager className="bw-photo" />
        </div>
        <div className="bw-identity">
          <div className="bw-identity-text">
            <p className="bw-first-name" style={{ fontSize: firstNameSize(person.firstName) }}>
              {person.firstName}
            </p>
            {person.lastName ? <p className="bw-last-name">{person.lastName}</p> : null}
            <hr className="bw-name-rule" />
            {person.title ? <p className="bw-job-title">{person.title}</p> : null}
            <PersonChips person={person} />
            <div className="bw-front-lead">
              <p className="bw-label">How to approach</p>
              <p className="bw-front-approach">{person.approach}</p>
            </div>
            {person.why ? (
              <p className="bw-front-why-text">
                <strong>Why:</strong> {person.why}
              </p>
            ) : null}
            {person.recent ? (
              <div className="bw-front-recent">
                <p className="bw-label">Recent</p>
                <p>{person.recent}</p>
              </div>
            ) : null}
            {person.company && person.companyBullets.length ? (
              <div className="bw-front-company">
                <p className="bw-front-company-name">{person.company}</p>
                <ul>
                  {person.companyBullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          <p className={`bw-tier bw-tier-${person.priority}`}>
            <svg viewBox="0 0 16 16" aria-hidden="true" className="h-[1em] w-[1em] shrink-0">
              <path fill="currentColor" d="m8 1.6 1.9 4 4.4.5-3.3 3 .9 4.3L8 11.2l-3.9 2.2.9-4.3-3.3-3 4.4-.5z" />
            </svg>
            {TIER_LABEL[person.priority]}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * All the context. On desktop this is the right-hand card and shows everything;
 * on phones (flip side) it skips the opener and Why already on the front, unless nothing else exists.
 */
function BadgeBack({ person }: { person: BadgePerson }) {
  const name = fullName(person);
  const researched = Boolean(person.recent || person.about || person.companyBullets.length);
  return (
    <div className={`bw-face bw-back ${researched ? "" : "bw-back-thin"}`}>
      <span aria-hidden="true" className="bw-slot" />
      <div className="bw-back-scroll">
        <div className="bw-back-identity">
          <BadgeAvatar src={person.avatarUrl} name={name} className="bw-back-photo" />
          <div className="min-w-0">
            <p className="bw-back-name">{name}</p>
            {titleLine(person) ? <p className="bw-back-title">{titleLine(person)}</p> : null}
          </div>
        </div>
        <section className="bw-back-section bw-back-approach-section">
          <h3 className="bw-back-heading">How to approach</h3>
          <p className="bw-back-text bw-back-approach">{person.approach}</p>
        </section>
        {person.why ? (
          <section className="bw-back-section bw-back-why-section">
            <h3 className="bw-back-heading">Why meet</h3>
            <p className="bw-back-text">{person.why}</p>
          </section>
        ) : null}
        {person.recent ? (
          <section className="bw-back-section">
            <h3 className="bw-back-heading">Recent</h3>
            <p className="bw-back-text">{person.recent}</p>
          </section>
        ) : null}
        {person.about ? (
          <section className="bw-back-section">
            <h3 className="bw-back-heading">Background</h3>
            <p className="bw-back-text">{person.about}</p>
          </section>
        ) : null}
        {person.company && person.companyBullets.length ? (
          <section className="bw-back-section">
            <h3 className="bw-back-heading">{person.company}</h3>
            <ul className="bw-back-bullets">
              {person.companyBullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
      <div className="bw-back-footer">
        <SocialButtons person={person} />
      </div>
    </div>
  );
}

/**
 * One badge, two sides. On phones the badge follows a horizontal drag (a far or fast release
 * browses, a short one springs back) and a tap flips it; on wide screens (`wide`) both sides
 * sit next to each other and nothing drags or flips.
 */
export default function BadgeCard({
  person,
  intent,
  flipped,
  wide,
  onFlip,
  onSwipe,
}: {
  person: BadgePerson;
  intent: MotionIntent;
  flipped: boolean;
  wide: boolean;
  onFlip: () => void;
  onSwipe: (direction: 1 | -1) => void;
}) {
  const name = fullName(person);
  const frontHidden = !wide && flipped;
  const backHidden = !wide && !flipped;
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 0, 240], [-7, 0, 7]);
  // A badge already animating out (after Keep, K, or a swipe) must not browse or flip again.
  const isPresent = useIsPresent();
  const reduceMotion = useReducedMotion();
  // 3D only while turning: at rest the visible side renders flat and sharp (see .bw-flip-rest).
  const [turning, setTurning] = useState(false);
  const lastFlipped = useRef(flipped);
  useEffect(() => {
    if (lastFlipped.current === flipped) return;
    lastFlipped.current = flipped;
    if (!reduceMotion) setTurning(true);
  }, [flipped, reduceMotion]);

  function onDragEnd(_: unknown, info: { offset: { x: number }; velocity: { x: number } }) {
    if (!isPresent) return;
    const { offset, velocity } = info;
    if (Math.abs(offset.x) >= SWIPE_DISTANCE_PX || Math.abs(velocity.x) >= SWIPE_VELOCITY_PX_S) {
      // Leave the badge where the finger let go; the deck carries it the rest of the way out.
      onSwipe((Math.abs(offset.x) >= SWIPE_DISTANCE_PX ? offset.x : velocity.x) < 0 ? 1 : -1);
      return;
    }
    // Standalone animate() ignores MotionConfig, so honor reduced motion here directly.
    if (reduceMotion) x.set(0);
    else animate(x, 0, { type: "spring", duration: 0.35, bounce: 0.25 });
  }

  function onTap(event: MouseEvent | TouchEvent | PointerEvent) {
    if (wide || !isPresent) return;
    if ((event.target as HTMLElement | null)?.closest("a, button")) return;
    onFlip();
  }

  return (
    <div className="bw-card-stage">
      <span aria-hidden="true" className="bw-clip" />
      <motion.div
        role="group"
        aria-roledescription="badge"
        aria-label={wide ? `${name}, badge and details` : `${name}, ${flipped ? "details" : "badge"}. Tap to flip, swipe to browse.`}
        className={`bw-card ${flipped ? "bw-flipped" : ""} ${turning ? "" : "bw-flip-rest"}`}
        style={wide ? undefined : { x, rotate }}
        drag={wide || !isPresent ? false : "x"}
        dragDirectionLock
        dragMomentum={false}
        onDragEnd={onDragEnd}
        onTap={onTap}
      >
        <motion.span aria-hidden="true" className="bw-keep-flash" custom={intent} variants={keepFlashVariants} />
        <motion.div
          className="bw-card-inner"
          initial={false}
          // Motion skips unchanged keyframe arrays, so each side gets its own array to replay the mid-flip lift.
          animate={{ rotateY: flipped ? 180 : 0, scale: flipped ? [1, 0.965, 1] : [1, 0.966, 1] }}
          transition={FLIP_TRANSITION}
          onAnimationComplete={() => setTurning(false)}
        >
          <div aria-hidden={frontHidden} inert={frontHidden}>
            <BadgeFront person={person} />
          </div>
          <div aria-hidden={backHidden} inert={backHidden}>
            <BadgeBack person={person} />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
