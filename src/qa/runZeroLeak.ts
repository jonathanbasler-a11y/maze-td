import { checkAllZeroLeak } from './zeroLeak';

const results = checkAllZeroLeak();
for (const r of results) {
  console.log(
    `${r.levelId} ok=${r.ok} phase=${r.phase} lives=${r.lives}/${r.startLives} leaks=${r.leaks} towers=${r.towers} path=${r.pathLen}`,
  );
}
const pass = results.filter((r) => r.ok).length;
console.log(`PASS ${pass}/${results.length}`);
if (pass !== results.length) {
  throw new Error(`zero-leak failed: ${pass}/${results.length}`);
}
