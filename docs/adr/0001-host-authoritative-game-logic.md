# 1. Host-authoritative game logic on the free Firebase tier

## Status

Accepted

## Context

Firebase's free Spark plan has no Cloud Functions (those require the paid Blaze plan), so there is no neutral server available to validate game actions — kills, task completion, sabotage, win conditions. Two models were available:

- **Host-authoritative**: the Lobby creator's client is the sole authority. Other clients send requests (move, kill, vote); only the Host's client computes results and writes authoritative state to Firebase Realtime Database.
- **Fully distributed**: no single host; Firebase Security Rules alone enforce what each client may write (e.g. "you may only flip your own alive flag under condition X"). Expressing something like "you may only kill if you're the Chaos Insurgent and within range of the target" declaratively in Security Rules is complex and rigid.

## Decision

Use the host-authoritative model. The Host's client runs all game logic; other clients are read-mostly and only ever write requests, never results.

## Consequences

- Dramatically simpler to build and reason about than distributed security-rule enforcement.
- A technically savvy player could tamper with their own client's requests, but for a casual friend-group game this is an accepted risk, not a threat model we're defending against.
- Single point of failure: if the Host disconnects, there is no one left to validate anything. Mitigated by detecting Host disconnect via Firebase's `onDisconnect()` and ending the match immediately for all players — no host migration in v1.
- Revisiting this later (e.g. to support larger/public lobbies where the trust assumption doesn't hold) would mean rebuilding game-logic validation as Security Rules or upgrading to Blaze for Cloud Functions — a substantial rework, not a tweak.
