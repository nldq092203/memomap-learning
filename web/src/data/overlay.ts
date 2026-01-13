export const seaLabels = {
  type: "FeatureCollection" as const,
  features: [
    // Hoàng Sa
    {
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [112.3, 16.5] as [number, number] },
      properties: { kind: "island", name: "Hoàng Sa" }
    },
    // Trường Sa
    {
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [114.0, 10.0] as [number, number] },
      properties: { kind: "island", name: "Trường Sa" }
    },
    // Biển Đông
    {
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [113.5, 13.5] as [number, number] },
      properties: { kind: "sea", name: "Biển Đông" }
    }
  ]
}
