export function hasWidgetNode(
  value: unknown
): value is { node: { id: string | number }; name: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'node' in value &&
    'name' in value
  )
}
