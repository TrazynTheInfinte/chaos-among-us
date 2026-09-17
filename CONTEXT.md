# Context

## Glossary

**Site** — the single physical location (map) a match takes place in. V1 has exactly one Site.

**Site Scientist** — the crewmate-equivalent role. Has a personal list of assigned Tasks (a subset of all Task stations); moves around the Site completing them. Wins when every living Site Scientist has completed their own full personal Task list, or when all Chaos Insurgents have been voted out.

**Chaos Insurgent** — the impostor-equivalent role. Has a fake personal Task list, visually identical to a Site Scientist's, that never records real progress (walking into a station just plays the station's animation as a no-op). Can kill Site Scientists (subject to Kill Cooldown and range) and trigger Sabotage. Wins the instant living Site Scientists ≤ living Chaos Insurgents. Count: exactly 1 in a 4-player Lobby; randomly 1 or 2 in a 5-6 player Lobby.

**Kill Cooldown** — the 25s delay a Chaos Insurgent must wait between kills. A kill also requires the target be within roughly one tile of the Insurgent; both are Host-validated.

**Lobby** — a joinable, not-yet-started game instance identified by a Room Code. Created by a Host.

**Room Code** — short code used by other players to join a specific Lobby.

**Host** — the player who created the Lobby. In v1, the Host's own client is the sole authority for game logic (role assignment, kill validation, task-completion validation, win-condition checks). Other players' clients send requests; only the Host's client writes authoritative state. If the Host disconnects, the match ends immediately for everyone (detected via Firebase `onDisconnect()`; no host migration in v1). See [docs/adr/0001-host-authoritative-game-logic.md](docs/adr/0001-host-authoritative-game-logic.md).

**Task** — a small in-Site action performed at a fixed station, assigned to each Site Scientist as part of their personal list (see Site Scientist). V1 has 5 reusable Task types: Calibrate Containment Field (slider-to-target), File Incident Report (ordered click sequence), Restock D-Class Rations (carry item between stations), Run Diagnostics (stationary timed wait), and Site Badge Swipe (the classic Among Us card-swipe-at-correct-speed task).

**Sabotage** — a Host-validated disruptive action only a Chaos Insurgent can trigger. V1 has exactly one Sabotage type, Lights: shrinks every Site Scientist's vision radius until any single Site Scientist fixes it at a fixed panel (walk up, hold ~2s). Non-lethal — no loss-timer, no game-ending consequence if never fixed.

**Meeting** — the voting phase, triggered by reporting a body or calling an Emergency Meeting, during which players discuss and vote to eject a suspected Chaos Insurgent. Both trigger types are in v1. Each Site Scientist may call one Emergency Meeting per game; Chaos Insurgents cannot call one. Meetings have in-Lobby text chat (built-in; not reliant on external voice chat).

**Role secrecy** — a player's own `role` field in Realtime Database is readable only by that player's `auth.uid` and by the Host (who needs all roles for game-logic validation), enforced via Security Rules — distinct from the ADR 0001 tampering risk, since reading others' roles requires no effort and would trivially spoil the game.
