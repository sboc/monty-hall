import { useState, useEffect } from 'react'
import './App.css'

type Phase = 'picking' | 'deciding' | 'result'

interface GameState {
  numDoors: number
  carDoor: number
  playerPick: number | null
  revealedDoors: number[]
  finalPick: number | null
  switched: boolean | null
  phase: Phase
}

interface Stats {
  stayWins: number
  stayTotal: number
  switchWins: number
  switchTotal: number
}

function freshGame(numDoors: number): GameState {
  return {
    numDoors,
    carDoor: Math.floor(Math.random() * numDoors),
    playerPick: null,
    revealedDoors: [],
    finalPick: null,
    switched: null,
    phase: 'picking',
  }
}

function hostRevealDoors(numDoors: number, car: number, pick: number): number[] {
  const goats = Array.from({ length: numDoors }, (_, d) => d).filter(d => d !== car && d !== pick)
  const shuffled = [...goats].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, numDoors - 2)
}

function simulateGames(numDoors: number, n: number) {
  let swW = 0, swT = 0, stW = 0, stT = 0
  for (let g = 0; g < n; g++) {
    const car = Math.floor(Math.random() * numDoors)
    const pick = Math.floor(Math.random() * numDoors)
    const revealed = hostRevealDoors(numDoors, car, pick)
    const doSwitch = Math.random() < 0.5
    const remaining = Array.from({ length: numDoors }, (_, d) => d)
      .find(d => d !== pick && !revealed.includes(d))!
    const final = doSwitch ? remaining : pick
    const won = final === car
    if (doSwitch) { swT++; if (won) swW++ }
    else { stT++; if (won) stW++ }
  }
  return { stayWins: stW, stayTotal: stT, switchWins: swW, switchTotal: swT }
}

function pct(wins: number, total: number): string {
  return total === 0 ? '—' : `${Math.round((wins / total) * 100)}%`
}

function WinBar({ wins, total }: { wins: number; total: number }) {
  const p = total === 0 ? 0 : (wins / total) * 100
  return (
    <div className="win-bar">
      <div className="win-bar__fill" style={{ width: `${p}%` }} />
    </div>
  )
}

function TheoryBar({ numerator, denominator }: { numerator: number; denominator: number }) {
  const p = (numerator / denominator) * 100
  return (
    <div className="win-bar">
      <div className="win-bar__fill" style={{ width: `${p}%` }} />
    </div>
  )
}

export default function App() {
  const [numDoors, setNumDoors] = useState(3)
  const [game, setGame] = useState<GameState>(() => freshGame(3))
  const [stats, setStats] = useState<Stats>({ stayWins: 0, stayTotal: 0, switchWins: 0, switchTotal: 0 })
  const [simRunning, setSimRunning] = useState(false)

  useEffect(() => {
    if (!simRunning) return
    const doors = numDoors
    const id = setInterval(() => {
      const r = simulateGames(doors, 50)
      setStats(s => ({
        stayWins: s.stayWins + r.stayWins,
        stayTotal: s.stayTotal + r.stayTotal,
        switchWins: s.switchWins + r.switchWins,
        switchTotal: s.switchTotal + r.switchTotal,
      }))
    }, 50)
    return () => clearInterval(id)
  }, [simRunning, numDoors])

  function updateNumDoors(n: number) {
    setNumDoors(n)
    setGame(freshGame(n))
    setSimRunning(false)
  }

  function pickDoor(i: number) {
    if (game.phase !== 'picking') return
    setGame(g => ({
      ...g,
      playerPick: i,
      revealedDoors: hostRevealDoors(g.numDoors, g.carDoor, i),
      phase: 'deciding',
    }))
  }

  function decide(sw: boolean) {
    if (game.phase !== 'deciding' || game.playerPick === null) return
    const remaining = Array.from({ length: game.numDoors }, (_, d) => d)
      .find(d => d !== game.playerPick && !game.revealedDoors.includes(d))!
    const finalPick = sw ? remaining : game.playerPick
    const won = finalPick === game.carDoor
    setGame(g => ({ ...g, finalPick, switched: sw, phase: 'result' }))
    setStats(s =>
      sw
        ? { ...s, switchWins: s.switchWins + (won ? 1 : 0), switchTotal: s.switchTotal + 1 }
        : { ...s, stayWins: s.stayWins + (won ? 1 : 0), stayTotal: s.stayTotal + 1 }
    )
  }

  function runSim(n: number) {
    const r = simulateGames(numDoors, n)
    setStats(s => ({
      stayWins: s.stayWins + r.stayWins,
      stayTotal: s.stayTotal + r.stayTotal,
      switchWins: s.switchWins + r.switchWins,
      switchTotal: s.switchTotal + r.switchTotal,
    }))
  }

  const { phase, carDoor, playerPick, revealedDoors, finalPick, switched } = game
  const won = phase === 'result' && finalPick === carDoor
  const stayTheoryPct = Math.round(100 / numDoors)
  const switchTheoryPct = Math.round(100 * (numDoors - 1) / numDoors)

  return (
    <div className="app">
      <div className="app__header">
        <h1>Monty Hall</h1>
        <p>{numDoors} doors. 1 car. {numDoors - 1} goats. Stay or switch?</p>
      </div>

      <div className="settings-section">
        <div className="setting">
          <label className="setting__label">Doors</label>
          <div className="setting__control">
            <input
              type="range"
              min={3}
              max={10}
              value={numDoors}
              onChange={e => updateNumDoors(Number(e.target.value))}
              className="slider"
            />
            <span className="setting__value">{numDoors}</span>
          </div>
        </div>
      </div>

      <div className="doors">
        {Array.from({ length: game.numDoors }, (_, i) => {
          let cls = 'door'
          let content = '?'

          if (phase === 'picking') {
            cls += ' door--closed'
          } else if (phase === 'deciding') {
            if (revealedDoors.includes(i)) {
              cls += ' door--open door--goat'
              content = '🐐'
            } else if (i === playerPick) {
              cls += ' door--closed door--selected'
            } else {
              cls += ' door--closed'
            }
          } else {
            const isCar = i === carDoor
            const isFinal = i === finalPick
            content = isCar ? '🚗' : '🐐'
            cls += ` door--open ${isCar ? 'door--car' : 'door--goat'}${isFinal ? ' door--final' : ''}`
          }

          return (
            <button
              key={i}
              className={cls}
              onClick={phase === 'picking' ? () => pickDoor(i) : undefined}
              disabled={phase !== 'picking'}
            >
              <span className="door__number">Door {i + 1}</span>
              <span className="door__content">{content}</span>
            </button>
          )
        })}
      </div>

      <div className="controls">
        {phase === 'picking' && <p>Pick a door to begin</p>}
        {phase === 'deciding' && (
          <>
            <p>
              {revealedDoors.length === 1
                ? `Monty reveals a goat behind door ${revealedDoors[0] + 1}.`
                : `Monty reveals goats behind doors ${revealedDoors.map(d => d + 1).join(', ')}.`}
            </p>
            <div className="btn-row">
              <button className="btn btn--secondary" onClick={() => decide(false)}>
                Stay with door {playerPick! + 1}
              </button>
              <button className="btn btn--primary" onClick={() => decide(true)}>
                Switch doors
              </button>
            </div>
          </>
        )}
        {phase === 'result' && (
          <>
            <p className={`result ${won ? 'result--win' : 'result--lose'}`}>
              {won ? '🎉 You win the car!' : '🐐 You got a goat.'}{' '}
              <span className="result__meta">You {switched ? 'switched' : 'stayed'}.</span>
            </p>
            <button className="btn btn--primary" onClick={() => setGame(freshGame(numDoors))}>
              Play again
            </button>
          </>
        )}
      </div>

      <div className="stats-section">
        <h2>Stats</h2>
        <div className="stats">
          <div className="stat">
            <div className="stat__label">Stay</div>
            <div className="stat__pct">{pct(stats.stayWins, stats.stayTotal)}</div>
            <WinBar wins={stats.stayWins} total={stats.stayTotal} />
            <div className="stat__detail">{stats.stayWins} / {stats.stayTotal}</div>
          </div>
          <div className="stat stat--theory">
            <div className="stat__label">Theory</div>
            <div className="stat__pct">{stayTheoryPct}%</div>
            <TheoryBar numerator={1} denominator={numDoors} />
            <div className="stat__detail">stay</div>
          </div>
          <div className="stat stat--theory">
            <div className="stat__label">Theory</div>
            <div className="stat__pct">{switchTheoryPct}%</div>
            <TheoryBar numerator={numDoors - 1} denominator={numDoors} />
            <div className="stat__detail">switch</div>
          </div>
          <div className="stat">
            <div className="stat__label">Switch</div>
            <div className="stat__pct">{pct(stats.switchWins, stats.switchTotal)}</div>
            <WinBar wins={stats.switchWins} total={stats.switchTotal} />
            <div className="stat__detail">{stats.switchWins} / {stats.switchTotal}</div>
          </div>
        </div>
        <div className="sim-row">
          <button
            className={`btn ${simRunning ? 'btn--stop' : 'btn--primary'}`}
            onClick={() => setSimRunning(r => !r)}
          >
            {simRunning ? 'Stop sim' : 'Start sim'}
          </button>
          <button className="btn btn--ghost" onClick={() => runSim(100)}>Simulate 100</button>
          <button className="btn btn--ghost" onClick={() => runSim(1000)}>Simulate 1000</button>
          <button
            className="btn btn--ghost btn--danger"
            onClick={() => setStats({ stayWins: 0, stayTotal: 0, switchWins: 0, switchTotal: 0 })}
          >
            Reset stats
          </button>
        </div>
      </div>
    </div>
  )
}
