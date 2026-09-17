import { get, onDisconnect, onValue, ref, serverTimestamp, update, type Unsubscribe } from 'firebase/database'
import { db, ensureSignedIn } from './firebase'
import type { Lobby } from './types'

// Excludes visually ambiguous characters (0/O, 1/I).
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateRoomCode(): string {
  let code = ''
  for (let i = 0; i < 5; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return code
}

/**
 * Marks this player disconnected on ungraceful exit. If they're the host, also ends the
 * lobby for everyone, since v1 has no host migration (see ADR 0001).
 */
function attachDisconnectHandlers(code: string, uid: string, isHost: boolean): void {
  onDisconnect(ref(db, `lobbies/${code}/players/${uid}/connected`)).set(false)
  if (isHost) {
    onDisconnect(ref(db, `lobbies/${code}/status`)).set('ended')
  }
}

export async function createLobby(name: string): Promise<string> {
  const uid = await ensureSignedIn()
  const code = generateRoomCode()

  const existing = await get(ref(db, `lobbies/${code}`))
  if (existing.exists()) {
    return createLobby(name) // extremely unlikely collision; regenerate
  }

  await update(ref(db), {
    [`lobbies/${code}/hostUid`]: uid,
    [`lobbies/${code}/status`]: 'waiting',
    [`lobbies/${code}/createdAt`]: serverTimestamp(),
    [`lobbies/${code}/players/${uid}`]: {
      name,
      isHost: true,
      connected: true,
      joinedAt: serverTimestamp(),
    },
  })

  attachDisconnectHandlers(code, uid, true)
  return code
}

export async function joinLobby(rawCode: string, name: string): Promise<string> {
  const code = rawCode.trim().toUpperCase()
  const uid = await ensureSignedIn()
  const snapshot = await get(ref(db, `lobbies/${code}`))

  if (!snapshot.exists()) {
    throw new Error('No lobby found with that room code.')
  }

  const lobby = snapshot.val() as Lobby
  if (lobby.status !== 'waiting') {
    throw new Error('That lobby has already started or ended.')
  }
  if (Object.keys(lobby.players ?? {}).length >= 6) {
    throw new Error('That lobby is full (6 players max).')
  }

  await update(ref(db), {
    [`lobbies/${code}/players/${uid}`]: {
      name,
      isHost: false,
      connected: true,
      joinedAt: serverTimestamp(),
    },
  })

  attachDisconnectHandlers(code, uid, false)
  return code
}

export function subscribeToLobby(code: string, callback: (lobby: Lobby | null) => void): Unsubscribe {
  return onValue(ref(db, `lobbies/${code}`), (snapshot) => {
    callback(snapshot.exists() ? (snapshot.val() as Lobby) : null)
  })
}

export async function startLobby(code: string): Promise<void> {
  await update(ref(db), {
    [`lobbies/${code}/status`]: 'in-progress',
  })
}
