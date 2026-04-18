export type Phase = 'picking' | 'deciding' | 'result'

export interface GameState {
  carDoor: number
  playerPick: number | null
  revealedDoors: number[]
  finalPick: number | null
  switched: boolean | null
  phase: Phase
}

export interface Stats {
  stayWins: number
  stayTotal: number
  switchWins: number
  switchTotal: number
}

export function freshGame(numDoors: number): GameState {
  return {
    carDoor: Math.floor(Math.random() * numDoors),
    playerPick: null,
    revealedDoors: [],
    finalPick: null,
    switched: null,
    phase: 'picking',
  }
}

export function hostRevealDoors(numDoors: number, car: number, pick: number): number[] {
  const goats = Array.from({ length: numDoors }, (_, d) => d).filter(d => d !== car && d !== pick)
  for (let i = goats.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [goats[i], goats[j]] = [goats[j], goats[i]]
  }
  return goats.slice(0, numDoors - 2)
}

export function simulateGames(numDoors: number, n: number): Stats {
  let switchWins = 0, switchTotal = 0, stayWins = 0, stayTotal = 0
  for (let g = 0; g < n; g++) {
    const car = Math.floor(Math.random() * numDoors)
    const pick = Math.floor(Math.random() * numDoors)
    const revealed = hostRevealDoors(numDoors, car, pick)
    const doSwitch = Math.random() < 0.5
    const remaining = Array.from({ length: numDoors }, (_, d) => d)
      .find(d => d !== pick && !revealed.includes(d))
    if (remaining === undefined) continue
    const final = doSwitch ? remaining : pick
    const won = final === car
    if (doSwitch) { switchTotal++; if (won) switchWins++ }
    else { stayTotal++; if (won) stayWins++ }
  }
  return { stayWins, stayTotal, switchWins, switchTotal }
}

export function pct(wins: number, total: number): string {
  return total === 0 ? '—' : `${Math.round((wins / total) * 100)}%`
}
