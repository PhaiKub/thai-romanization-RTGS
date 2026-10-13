# thai-rtgs

## Code comments

Write code comments in English.

## README and release notes

Write README, CHANGELOG entries and GitHub release notes in Thai. `README.md` is the Thai README (npm shows it); `README.en.md` is the English translation and must be kept in step with it.

## Benchmark

`test/benchmark/districts.json` is split into `dev` and `test`. Only look at `dev` misses (`npm run eval -- --dev`) when improving the rules; never print or inspect `test` misses, or its accuracy stops meaning anything.
