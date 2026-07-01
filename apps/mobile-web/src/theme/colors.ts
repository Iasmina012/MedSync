export function normalizeHex(value: string, fallback = '#FFFFFF') {

  const clean = value.trim();

  if (!clean)
    return fallback;

  return clean.startsWith('#') ? clean.toUpperCase() : `#${clean.toUpperCase()}`;

}

export function hexToRgb(hex: string) {

  const clean = hex.replace('#', '');
  const normalized =
    clean.length === 3
      ? clean.split('').map((char) => char + char).join('')
      : clean;
  const bigint = parseInt(normalized, 16);

  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255, };

}

export function rgbaFromHex(hex: string, alpha: number) {

  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;

}