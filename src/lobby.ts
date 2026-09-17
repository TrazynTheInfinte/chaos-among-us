import { get, onDisconnect, onValue, ref, serverTimestamp, set, update, type Unsubscribe } from 'firebase/database'
import { db, ensureSignedIn } from './firebase'
import type { Lobby, LobbyPlayer, LobbyStatus } from './types'

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

  // The database rules deliberately grant no .read on lobbies/$lobbyCode itself (only on
  // specific children), so a role assigned later stays hidden from non-owners (see ADR /
  // CONTEXT.md role secrecy). That means existence has to be checked via a granted child
  // path, never the whole lobby node.
  const existing = await get(ref(db, `lobbies/${code}/hostUid`))
  if (existing.exists()) {
    return createLobby(name) // extremely unlikely collision; regenerate
  }

  // hostUid must be written and durably committed before anything else: the status/
  // createdAt/players rules all check root.child(...).hostUid, and a security rule
  // evaluating one path in a multi-location update can't see another path's value
  // from that same atomic write -- only pre-update state. So hostUid has to land first.
  await set(ref(db, `lobbies/${code}/hostUid`), uid)

  await update(ref(db), {
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

  const hostUidSnapshot = await get(ref(db, `lobbies/${code}/hostUid`))
  if (!hostUidSnapshot.exists()) {
    throw new Error('No lobby found with that room code.')
  }

  const statusSnapshot = await get(ref(db, `lobbies/${code}/status`))
  if (statusSnapshot.val() !== 'waiting') {
    throw new Error('That lobby has already started or ended.')
  }

  const playersSnapshot = await get(ref(db, `lobbies/${code}/players`))
  if (Object.keys((playersSnapshot.val() as Record<string, LobbyPlayer> | null) ?? {}).length >= 6) {
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

/**
 * Assembles a Lobby view from separately-readable child paths (see createLobby's comment
 * on why lobbies/$lobbyCode itself can't be read directly).
 */
export function subscribeToLobby(code: string, callback: (lobby: Lobby | null) => void): Unsubscribe {
  let hostUid: string | undefined
  let status: LobbyStatus | undefined
  let createdAt: number | undefined
  let players: Record<string, LobbyPlayer> | undefined
  let hostUidLoaded = false

  const emit = () => {
    if (!hostUidLoaded) return
    if (!hostUid) {
      callback(null)
      return
    }
    callback({
      hostUid,
      status: status ?? 'waiting',
      createdAt: createdAt ?? 0,
      players: players ?? {},
    })
  }

  const unsubscribers = [
    onValue(ref(db, `lobbies/${code}/hostUid`), (snapshot) => {
      hostUid = (snapshot.val() as string | null) ?? undefined
      hostUidLoaded = true
      emit()
    }),
    onValue(ref(db, `lobbies/${code}/status`), (snapshot) => {
      status = (snapshot.val() as LobbyStatus | null) ?? undefined
      emit()
    }),
    onValue(ref(db, `lobbies/${code}/createdAt`), (snapshot) => {
      createdAt = (snapshot.val() as number | null) ?? undefined
      emit()
    }),
    onValue(ref(db, `lobbies/${code}/players`), (snapshot) => {
      players = (snapshot.val() as Record<string, LobbyPlayer> | null) ?? {}
      emit()
    }),
  ]

  return () => {
    for (const unsubscribe of unsubscribers) unsubscribe()
  }
}

export async function startLobby(code: string): Promise<void> {
  await update(ref(db), {
    [`lobbies/${code}/status`]: 'in-progress',
  })
}
