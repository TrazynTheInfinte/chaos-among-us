import Phaser from 'phaser'
import './style.css'
import { auth } from './firebase'
import { createLobby, joinLobby, startLobby, subscribeToLobby } from './lobby'
import { SiteScene } from './game/scenes/SiteScene'
import type { Lobby } from './types'

const menuEl = document.querySelector<HTMLDivElement>('#menu')!
const lobbyEl = document.querySelector<HTMLDivElement>('#lobby')!
const gameEl = document.querySelector<HTMLDivElement>('#game')!
const errorEl = document.querySelector<HTMLParagraphElement>('#menu-error')!
const lobbyCodeEl = document.querySelector<HTMLSpanElement>('#lobby-code')!
const lobbyPlayersEl = document.querySelector<HTMLUListElement>('#lobby-players')!
const startButtonEl = document.querySelector<HTMLButtonElement>('#start-game')!

const createForm = document.querySelector<HTMLFormElement>('#create-form')!
const joinForm = document.querySelector<HTMLFormElement>('#join-form')!

let currentCode: string | null = null
let game: Phaser.Game | null = null

function showError(message: string): void {
  errorEl.textContent = message
}

function enterLobby(code: string): void {
  currentCode = code
  menuEl.hidden = true
  lobbyEl.hidden = false
  lobbyCodeEl.textContent = code

  subscribeToLobby(code, (lobby) => {
    if (!lobby || lobby.status === 'ended') {
      alert(lobby ? 'The host left. Lobby ended.' : 'Lobby no longer exists.')
      returnToMenu()
      return
    }
    if (lobby.status === 'in-progress') {
      enterGame()
    }
    renderLobby(lobby)
  })
}

function renderLobby(lobby: Lobby): void {
  const players = Object.entries(lobby.players ?? {})
  lobbyPlayersEl.innerHTML = ''
  for (const [uid, player] of players) {
    const li = document.createElement('li')
    li.textContent = `${player.name}${player.isHost ? ' (Host)' : ''}${player.connected ? '' : ' (disconnected)'}`
    li.dataset.uid = uid
    lobbyPlayersEl.appendChild(li)
  }

  const isHost = auth.currentUser?.uid === lobby.hostUid
  const canStart = isHost && lobby.status === 'waiting' && players.length >= 4 && players.length <= 6
  startButtonEl.hidden = !isHost
  startButtonEl.disabled = !canStart
  startButtonEl.textContent = canStart
    ? 'Start Game'
    : `Start Game (need 4-6 players, have ${players.length})`
}

function enterGame(): void {
  lobbyEl.hidden = true
  gameEl.hidden = false
  if (!game) {
    game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game',
      width: 800,
      height: 600,
      scene: [SiteScene],
    })
  }
}

function returnToMenu(): void {
  currentCode = null
  lobbyEl.hidden = true
  gameEl.hidden = true
  menuEl.hidden = false
}

createForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  showError('')
  const name = (document.querySelector<HTMLInputElement>('#create-name')!).value.trim()
  try {
    const code = await createLobby(name)
    enterLobby(code)
  } catch (error) {
    showError(error instanceof Error ? error.message : 'Failed to create lobby.')
  }
})

joinForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  showError('')
  const name = (document.querySelector<HTMLInputElement>('#join-name')!).value.trim()
  const code = (document.querySelector<HTMLInputElement>('#join-code')!).value.trim()
  try {
    const joinedCode = await joinLobby(code, name)
    enterLobby(joinedCode)
  } catch (error) {
    showError(error instanceof Error ? error.message : 'Failed to join lobby.')
  }
})

startButtonEl.addEventListener('click', async () => {
  if (!currentCode) return
  try {
    await startLobby(currentCode)
  } catch (error) {
    showError(error instanceof Error ? error.message : 'Failed to start game.')
  }
})
