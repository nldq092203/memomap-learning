"use client"

import { useEffect, useId, useState } from "react"

let mermaidInitialized = false

type MermaidDiagramProps = {
  chart: string
  className?: string
}

export function MermaidDiagram({
  chart,
  className,
}: MermaidDiagramProps) {
  const id = useId()
  const [svg, setSvg] = useState("")
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    let isMounted = true

    const renderChart = async () => {
      try {
        const mermaid = (await import("mermaid")).default

        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            securityLevel: "strict",
            theme: "neutral",
            fontFamily: "inherit",
          })
          mermaidInitialized = true
        }

        const { svg: nextSvg } = await mermaid.render(`mermaid-${id}`, chart)

        if (!isMounted) return
        setSvg(nextSvg)
        setHasError(false)
      } catch (error) {
        console.error("Failed to render Mermaid chart", error)
        if (!isMounted) return
        setHasError(true)
      }
    }

    void renderChart()

    return () => {
      isMounted = false
    }
  }, [chart, id])

  if (hasError) {
    return (
      <pre
        className={className}
      >
        <code>{chart}</code>
      </pre>
    )
  }

  if (!svg) {
    return (
      <div
        className={className}
      >
        Chargement du schéma…
      </div>
    )
  }

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
