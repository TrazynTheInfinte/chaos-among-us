/// <reference types="node" />
// A single bot "player". Run as its own OS process (via vite-node, see
// lobby.test.ts) rather than imported into a shared process, so each bot gets
// its own Firebase Auth identity -- src/firebase.ts is a singleton per
// process, exactly like a real player is a separate browser tab.
//
// Usage:
//   vite-node tests/bots/player.ts create <name>
//   vite-node tests/bots/player.ts join <code> <name>
//
// Prints one JSON line to stdout: {"ok":true,"code":"ABCDE"} or
// {"ok":false,"error":"..."}.
//
// After a successful "create", the process stays alive instead of exiting:
// createLobby registers an onDisconnect that ends the lobby for everyone
// once the host disconnects (see ADR 0001/lobby.ts) -- exactly what a real
// host's browser tab closing should do, but exiting immediately here would
// trigger that same disconnect before other bots get a chance to act. The
// test harness (lobby.test.ts) kills this process once it's done with the
// lobby, the bot equivalent of the host closing their tab.

import { createLobby, joinLobby } from '../../src/lobby'

interface BotResult {
  ok: boolean
  code?: string
  error?: string
}

async function run(): Promise<BotResult> {
  const [action, ...args] = process.argv.slice(2)

  if (action === 'create') {
    const [name] = args
    const code = await createLobby(name)
    return { ok: true, code }
  }

  if (action === 'join') {
    const [code, name] = args
    const joinedCode = await joinLobby(code, name)
    return { ok: true, code: joinedCode }
  }

  throw new Error(`Unknown bot action: ${action}`)
}

const action = process.argv[2]

run()
  .then((result) => {
    console.log(JSON.stringify(result))
    if (action === 'create' && result.ok) return // stay connected; see header comment
    process.exit(0)
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    console.log(JSON.stringify({ ok: false, error: message } satisfies BotResult))
    process.exit(0)
  })
