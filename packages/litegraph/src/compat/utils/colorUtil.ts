export interface ColorAdjustOptions {
  amount?: number
}

function clamp(channel: number) {
  return Math.max(0, Math.min(255, channel))
}

export function adjustColor(
  color: string,
  { amount = 0 }: ColorAdjustOptions = {}
) {
  const normalized = color.replace('#', '')
  if (!/^[\da-fA-F]{6}$/.test(normalized)) return color

  const channels = normalized.match(/../g)
  if (!channels) return color

  const [red, green, blue] = channels.map((channel) =>
    clamp(parseInt(channel, 16) + amount)
  )

  return `#${[red, green, blue]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')}`
}
