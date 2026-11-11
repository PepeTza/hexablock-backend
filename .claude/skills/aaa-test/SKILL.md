---
name: aaa-test
description: Write tests the way HexaBlock Suite requires: should_<result>_when_<condition> names, Arrange / Act / Assert, fakes for ports and a fixed seed. Use whenever you propose or write a test, in gate 1 (the list of cases) and in gate 2 (the code).
---

# AAA tests

Rules from `CONTRIBUTING.md` §5 and `AGENTS.md` §4.

## Propose before writing

In the gate 1 plan, list every case as
`should_<expected result>_when_<condition>` with one plain-language line saying
what it protects. The team approves the list before you write the tests.

## Where the test goes

- Client: `*.test.ts` next to the file it tests
  (`src/domain/engine/geometry/hex-geometry.ts` →
  `src/domain/engine/geometry/hex-geometry.test.ts`).
- Backend: `*.spec.ts` next to the file it tests.

## Shape of a test

One behaviour per test, with the three blocks separated by a blank line and
named in comments:

```ts
describe('HexGeometry', () => {
  it('should_return_six_neighbours_when_the_cell_is_inside_the_board', () => {
    // Arrange
    const geometry = new HexGeometry();
    const centre = new Coord(0, 0);

    // Act
    const neighbours = geometry.neighbours(centre);

    // Assert
    expect(neighbours).toHaveLength(6);
  });
});
```

## Isolation

- Domain and use-case tests run **without UI, network or database**.
- Replace every port (`IProgressRepository`, `ILevelRepository`, ...) with a
  small hand-written fake in the test, not with the real adapter.
- Anything random takes a **fixed seed** through the injected random source,
  so the test gives the same result every run.

## Coverage and bugs

- Domain and use cases must stay at **≥ 80 %**; CI fails below that.
- A bug fix includes a test that fails without the fix.
- Never delete, skip or weaken an existing test to make CI pass; ask first.
