// Fixed seed keeps the decorative sky identical during SSR and hydration.
let seed = 271828;
const next = () => (seed = seed * 16807 % 2147483647) / 2147483647;
const stars = Array.from({length: 140}, (_, id) => ({
  id, x: next() * 1600, y: next() * 1000,
  radius: .55 + next() * .65, opacity: .2 + next() * .45
}));

export default function Starfield() {
  return <svg className="starfield" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    {stars.map(star => <circle key={star.id} cx={star.x} cy={star.y} r={star.radius} fill="#fff" opacity={star.opacity}/>)}
  </svg>;
}
