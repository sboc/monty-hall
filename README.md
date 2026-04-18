# Monty Hall

An interactive Monty Hall problem simulator built with React, TypeScript, and Vite.

## What is the Monty Hall problem?

You're on a game show. There are N doors — one hides a car, the rest hide goats. You pick a door. The host (who knows what's behind every door) then opens N−2 of the remaining doors, always revealing goats. You're now offered a choice: stay with your original pick, or switch to the one remaining unopened door.

Should you switch?

**Yes.** The math:

| Strategy | Win probability |
|----------|----------------|
| Stay     | 1 / N          |
| Switch   | (N−1) / N      |

With 3 doors: staying wins 33% of the time, switching wins 67%. The counterintuitive result holds for any N ≥ 3, and the gap widens as N increases.

**Why?** When you first pick, you have a 1/N chance of being right. The host's reveal carries no new information about your door — it only concentrates the remaining (N−1)/N probability onto the one door left standing. Switching captures that entire probability mass.

## Running locally

```bash
npm install
npm run dev
```

Other commands:

```bash
npm run build      # type-check + bundle
npm run preview    # serve the built output
npm run lint       # ESLint
npm run test       # run unit tests (Vitest)
npm run test:watch # run tests in watch mode
```

## Implementation

Game logic is split across two files:

- `src/lib.ts` — pure functions with no React dependency (game state, host reveal, simulation, formatting)
- `src/App.tsx` — single React component that wires state and UI; imports everything from `lib.ts`

There are no external state management libraries.

### State

```ts
// src/lib.ts
interface GameState {
  carDoor: number        // index of the door hiding the car
  playerPick: number | null
  revealedDoors: number[]
  finalPick: number | null
  switched: boolean | null
  phase: 'picking' | 'deciding' | 'result'
}

interface Stats {
  stayWins: number
  stayTotal: number
  switchWins: number
  switchTotal: number
}
```

`GameState` captures a single round. `Stats` accumulates across all rounds — both manual plays and simulations share the same counters.

### Game phases

```
picking → deciding → result
                         ↓
                    (play again) → picking
```

- **picking**: all doors closed, player clicks one
- **deciding**: host has revealed goats, player chooses stay or switch
- **result**: final door opened, outcome shown, stats updated

### Host reveal — `hostRevealDoors`

```ts
function hostRevealDoors(numDoors: number, car: number, pick: number): number[]
```

Collects all doors that are neither the car nor the player's pick (i.e., guaranteed goats), shuffles them with Fisher-Yates, then returns the first `numDoors − 2` of them. This leaves exactly two doors closed: the player's pick and one other.

Fisher-Yates produces a uniform random permutation. The naive `array.sort(() => Math.random() - 0.5)` does not — it introduces bias because comparison-based sorts call the comparator a variable number of times.

### Simulation — `simulateGames`

```ts
function simulateGames(numDoors: number, n: number): Stats
```

Runs `n` independent games in a tight loop. Each game:
1. Places the car randomly
2. Makes a random initial pick
3. Calls `hostRevealDoors` to get the revealed doors
4. Randomly decides to stay or switch (50/50)
5. Finds the one remaining non-pick non-revealed door as the switch target
6. Records win/loss for the chosen strategy

The switch target is always unambiguous: after the host reveals `numDoors − 2` goat doors, exactly one non-pick door remains.

Simulations run in two modes:

- **Batch**: `runSim(n)` executes synchronously on the main thread. Fast enough for n ≤ 1000 (single-digit milliseconds).
- **Continuous**: a `setInterval` fires every 50 ms, adding 50 games per tick. Runs until stopped or the door count changes.

### Door count changes

Changing the slider resets the game, stops the simulation, and clears all stats. Stats accumulated at one door count are not comparable to stats at another (the theoretical win rates differ), so clearing is the correct behavior.

### Accessibility

- Every door `<button>` has a dynamic `aria-label` describing its state (`"Door 3, revealed goat"`, `"Door 1, has a car, your final pick"`, etc.)
- The controls section carries `aria-live="polite"` so screen readers announce phase transitions (Monty's reveal, the result) without interrupting ongoing speech
- The doors slider `<label>` is linked to its `<input>` via `htmlFor`/`id`

### Theming

Colors are defined as CSS custom properties in `src/index.css`. Dark mode overrides live in a `@media (prefers-color-scheme: dark)` block. Win/danger colors have separate light and dark values to meet contrast requirements:

| Token | Light | Dark |
|-------|-------|------|
| `--color-win` | `#22c55e` | `#4ade80` |
| `--color-danger` | `#ef4444` | `#f87171` |

## Tests

Unit tests cover all pure functions in `src/lib.ts` (`src/lib.test.ts`):

| Function | What's tested |
|----------|---------------|
| `freshGame` | correct initial phase, carDoor in range, all fields null/empty |
| `hostRevealDoors` | exact reveal count (car=pick and car≠pick paths), never exposes car or player pick, no duplicates, valid indices, Fisher-Yates uniformity |
| `simulateGames` | total game count, stay/switch win rates converge to `1/N` and `(N-1)/N` at N=3/5/10, switching beats staying |
| `pct` | zero total, 0%, 100%, rounding, wins-with-zero-total edge case |

The React component (`App.tsx`) is not tested — its logic is thin wiring; the interesting behavior is fully covered by the pure function tests.

## Stack

| Tool | Version |
|------|---------|
| React | 19 |
| TypeScript | 6 |
| Vite | 8 |
| Vitest | 4 |
| React Compiler | enabled |
