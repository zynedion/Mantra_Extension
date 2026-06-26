export function refineRegions(regions) {
  return regions.filter(r => r.bounds.width >= 10 && r.bounds.height >= 10);
}

export function sortReadingOrder(regions, sourceLang) {
  const isJapanese = sourceLang === 'ja';
  return [...regions].sort((a, b) => {
    const yDiff = a.bounds.y - b.bounds.y;
    const avgHeight = (a.bounds.height + b.bounds.height) / 2;
    if (Math.abs(yDiff) > avgHeight * 0.3) {
      return yDiff;
    }
    return isJapanese
      ? b.bounds.x - a.bounds.x
      : a.bounds.x - b.bounds.x;
  });
}
