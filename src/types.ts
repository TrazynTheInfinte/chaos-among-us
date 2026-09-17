export interface LobbyPlayer {
  name: string
  isHost: boolean
  connected: boolean
  joinedAt: number
}

export type LobbyStatus = 'waiting' | 'in-progress' | 'ended'

export interface Lobby {
  hostUid: string
  status: LobbyStatus
  createdAt: number
  players: Record<string, LobbyPlayer>
}
