import { describe, it, expect } from 'vitest'
import { freshGame, hostRevealDoors, simulateGames, pct } from './lib'

describe('freshGame', () => {
  it('returns picking phase', () => {
    expect(freshGame(3).phase).toBe('picking')
  })

  it('carDoor is within range', () => {
    for (let n = 3; n <= 10; n++) {
      for (let trial = 0; trial < 50; trial++) {
        const { carDoor } = freshGame(n)
        expect(carDoor).toBeGreaterThanOrEqual(0)
        expect(carDoor).toBeLessThan(n)
      }
    }
  })

  it('playerPick, finalPick, switched are null', () => {
    const g = freshGame(5)
    expect(g.playerPick).toBeNull()
    expect(g.finalPick).toBeNull()
    expect(g.switched).toBeNull()
  })

  it('revealedDoors is empty', () => {
    expect(freshGame(3).revealedDoors).toHaveLength(0)
  })
})

describe('hostRevealDoors', () => {
  it('always reveals exactly numDoors - 2 doors', () => {
    for (let n = 3; n <= 10; n++) {
      // car !== pick
      expect(hostRevealDoors(n, 0, 1)).toHaveLength(n - 2)
      // car === pick (goats.length = numDoors-1, still reveal numDoors-2)
      expect(hostRevealDoors(n, 0, 0)).toHaveLength(n - 2)
    }
  })

  it('never reveals the car door', () => {
    for (let trial = 0; trial < 200; trial++) {
      const n = 3 + Math.floor(Math.random() * 8)
      const car = Math.floor(Math.random() * n)
      const pick = Math.floor(Math.random() * n)
      const revealed = hostRevealDoors(n, car, pick)
      expect(revealed).not.toContain(car)
    }
  })

  it('never reveals the player pick', () => {
    for (let trial = 0; trial < 200; trial++) {
      const n = 3 + Math.floor(Math.random() * 8)
      const car = Math.floor(Math.random() * n)
      const pick = Math.floor(Math.random() * n)
      const revealed = hostRevealDoors(n, car, pick)
      expect(revealed).not.toContain(pick)
    }
  })

  it('all revealed doors are valid door indices', () => {
    for (let trial = 0; trial < 100; trial++) {
      const n = 3 + Math.floor(Math.random() * 8)
      const revealed = hostRevealDoors(n, 0, 1)
      for (const d of revealed) {
        expect(d).toBeGreaterThanOrEqual(0)
        expect(d).toBeLessThan(n)
      }
    }
  })

  it('revealed doors contain no duplicates', () => {
    for (let trial = 0; trial < 100; trial++) {
      const n = 3 + Math.floor(Math.random() * 8)
      const car = Math.floor(Math.random() * n)
      const pick = Math.floor(Math.random() * n)
      const revealed = hostRevealDoors(n, car, pick)
      expect(new Set(revealed).size).toBe(revealed.length)
    }
  })

  it('produces uniform distribution across goat doors (Fisher-Yates)', () => {
    // When car === pick the player already has the car. The host has numDoors-1
    // goats but only reveals numDoors-2, leaving exactly one goat unrevealed.
    // That unrevealed goat should be chosen uniformly across all goat doors.
    // Setup: n=4, car=pick=0 → goats=[1,2,3], reveal 2, leave 1 unrevealed.
    // Each of [1,2,3] should be unrevealed ~33% of the time.
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0 }
    const trials = 10000
    for (let i = 0; i < trials; i++) {
      const revealed = hostRevealDoors(4, 0, 0)
      const unrevealed = [1, 2, 3].find(d => !revealed.includes(d))
      expect(unrevealed).toBeDefined()
      counts[unrevealed as number]++
    }
    for (const d of [1, 2, 3]) {
      expect(counts[d] / trials).toBeCloseTo(1 / 3, 1)
    }
  })
})

describe('simulateGames', () => {
  it('returns correct total game count', () => {
    const r = simulateGames(3, 1000)
    expect(r.stayTotal + r.switchTotal).toBe(1000)
  })

  it('switch win rate converges to (N-1)/N', () => {
    for (const n of [3, 5, 10]) {
      const r = simulateGames(n, 50000)
      const switchRate = r.switchWins / r.switchTotal
      const expected = (n - 1) / n
      expect(switchRate).toBeCloseTo(expected, 1)
    }
  })

  it('stay win rate converges to 1/N', () => {
    for (const n of [3, 5, 10]) {
      const r = simulateGames(n, 50000)
      const stayRate = r.stayWins / r.stayTotal
      expect(stayRate).toBeCloseTo(1 / n, 1)
    }
  })

  it('switching always beats staying', () => {
    const r = simulateGames(3, 10000)
    expect(r.switchWins / r.switchTotal).toBeGreaterThan(r.stayWins / r.stayTotal)
  })
})

describe('pct', () => {
  it('returns em dash when total is 0', () => {
    expect(pct(0, 0)).toBe('—')
  })

  it('formats 100% correctly', () => {
    expect(pct(3, 3)).toBe('100%')
  })

  it('formats 0% correctly', () => {
    expect(pct(0, 10)).toBe('0%')
  })

  it('rounds to nearest integer', () => {
    expect(pct(1, 3)).toBe('33%')
    expect(pct(2, 3)).toBe('67%')
  })

  it('handles non-zero wins with zero total gracefully', () => {
    // wins > 0 but total = 0 should still return em dash
    expect(pct(5, 0)).toBe('—')
  })
})
