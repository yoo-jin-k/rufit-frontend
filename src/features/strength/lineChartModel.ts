export type ChartPoint = {date: string; value: number};
// 점의 간격은 기록 날짜의 실제 간격에 비례한다. 체중은 축 범위를 좁혀 작은 변화를 읽기 쉽게 한다.
export function lineGeometry(points: ChartPoint[], width: number, height = 160, zeroBaseline = true) {
  const maxValue = points.reduce((max, p) => Math.max(max, p.value), 0);
  const step = maxValue <= 100 ? 10 : maxValue <= 300 ? 25 : 100;
  const floor = zeroBaseline || !points.length ? 0 : Math.max(0, Math.floor(Math.min(...points.map(p => p.value)) / 5) * 5 - 5);
  const ceiling = Math.max(step, Math.ceil(maxValue / step) * step);
  const start = points.length ? Date.parse(points[0].date) : 0;
  const end = points.length ? Date.parse(points[points.length - 1].date) : 0;
  const coordinates = points.map(p => ({...p, x: end === start ? width / 2 : 24 + (Date.parse(p.date) - start) / (end - start) * (width - 48), y: height - (p.value - floor) / (ceiling - floor) * height}));
  const segments = coordinates.slice(1).map((point, i) => {
    const previous = coordinates[i];
    const dx = point.x - previous.x, dy = point.y - previous.y;
    return {x: (previous.x + point.x) / 2, y: (previous.y + point.y) / 2, length: Math.hypot(dx, dy), angle: Math.atan2(dy, dx) * 180 / Math.PI};
  });
  return {floor, ceiling, coordinates, segments};
}
