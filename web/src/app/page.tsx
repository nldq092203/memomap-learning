"use client"

import Image from "next/image"
import Link from "next/link"
import {
  BookOpen,
  GraduationCap,
  Headphones,
  MapPin,
  Mic,
  PenLine,
} from "lucide-react"
import { useAuth } from "@/lib/contexts/auth-context"
import { cn } from "@/lib/utils"

type MapSection = {
  id: string
  title: string
  href: string
  image: string
  icon: React.ComponentType<{ className?: string }>
  position: string
  mobilePosition: string
}

const assetCacheVersion = "20260627-6"

function versionedBackgroundAsset(path: string) {
  return `${path}?v=${assetCacheVersion}`
}

const mapSections: MapSection[] = [
  {
    id: "vocab",
    title: "Vocabulaire",
    href: "/learning/review-hub",
    image: "/UI/arc-de-triomphe.webp",
    icon: BookOpen,
    position: "left-[20%] top-[24%]",
    mobilePosition: "left-[16%] top-[22%]",
  },
  {
    id: "co",
    title: "Compréhension Orale",
    href: "/learning/co",
    image: "/UI/northe-dame.webp",
    icon: Headphones,
    position: "left-[52%] top-[17%]",
    mobilePosition: "left-[56%] top-[17%]",
  },
  {
    id: "ce",
    title: "Compréhension Écrite",
    href: "/learning/ce",
    image: "/UI/louvre.webp",
    icon: BookOpen,
    position: "left-[44%] top-[42%]",
    mobilePosition: "left-[42%] top-[41%]",
  },
  {
    id: "pe",
    title: "Production Écrite",
    href: "/learning/pe",
    image: "/UI/patheon.webp",
    icon: PenLine,
    position: "left-[15%] top-[58%]",
    mobilePosition: "left-[13%] top-[58%]",
  },
  {
    id: "po",
    title: "Production Orale",
    href: "/learning/speaking-practice",
    image: "/UI/patheon.webp",
    icon: Mic,
    position: "left-[55%] top-[63%]",
    mobilePosition: "left-[55%] top-[65%]",
  },
  {
    id: "delf",
    title: "DELF Simulation",
    href: "/learning/delf-simulation",
    image: "/UI/effiel.webp",
    icon: GraduationCap,
    position: "left-[78%] top-[45%]",
    mobilePosition: "left-[70%] top-[79%]",
  },
]

export default function HomePage() {
  const { user } = useAuth()
  const displayName = user?.name?.trim() || user?.email?.split("@")[0] || "vous"

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5eee5] text-[var(--vintage-ink)]">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[length:min(1220px,88vw)_auto] bg-[center_58%] bg-no-repeat opacity-55"
        style={{
          backgroundImage: `url('${versionedBackgroundAsset("/UI/map.webp")}')`,
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_52%,rgba(245,238,229,0.28),rgba(245,238,229,0.86)_66%,rgba(245,238,229,0.96)_100%)]" />

      <div className="relative mx-auto min-h-screen w-full max-w-[1540px] px-5 py-8 sm:px-8 lg:px-12">
        <section className="relative min-h-[720px] lg:min-h-[840px]">
          <div className="relative z-20 max-w-[620px] pt-4 sm:pt-8 lg:pt-0">
            <p className="text-sm font-medium text-[var(--vintage-muted-ink)]">
              Bonjour, {displayName} ! 👋
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-normal text-[var(--vintage-ink)] sm:text-5xl lg:text-6xl">
              Bienvenue dans votre{" "}
              <span className="text-[var(--vintage-desert-rock)]">
                voyage en français.
              </span>
            </h1>
          </div>

          <div className="absolute inset-x-[-2%] bottom-0 top-[118px] hidden lg:block">
            {mapSections.map((section, index) => (
              <MapLandmark
                key={section.id}
                section={section}
                index={index + 1}
              />
            ))}
          </div>

          <div className="relative mt-8 min-h-[620px] overflow-hidden rounded-[28px] lg:hidden">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-70"
              style={{
                backgroundImage: `url('${versionedBackgroundAsset("/UI/map-mobile.webp")}')`,
              }}
            />
            {mapSections.map((section, index) => (
              <MapLandmark
                key={section.id}
                section={section}
                index={index + 1}
                mobile
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function MapLandmark({
  section,
  index,
  mobile = false,
}: {
  section: MapSection
  index: number
  mobile?: boolean
}) {
  const Icon = section.icon

  return (
    <Link
      href={section.href}
      className={cn(
        "group absolute w-[142px] -translate-x-1/2 rounded-[14px] bg-[var(--vintage-feather-white)]/88 p-2 shadow-[0_16px_28px_rgba(74,51,35,0.18)] backdrop-blur-sm transition duration-200 hover:-translate-y-1 hover:shadow-[0_20px_36px_rgba(74,51,35,0.22)]",
        mobile ? section.mobilePosition : section.position,
        mobile && "w-[122px] p-1.5",
      )}
    >
      <div
        className={cn(
          "absolute left-1/2 z-0 flex -translate-x-1/2 items-center justify-center rounded-full border border-[var(--vintage-soft-sandstone)] bg-[var(--vintage-feather-white)]/72 text-[var(--vintage-desert-rock)] shadow-[0_8px_18px_rgba(74,51,35,0.14)] backdrop-blur-[1px]",
          mobile ? "-bottom-6 h-8 w-8" : "-bottom-8 h-10 w-10",
        )}
        aria-hidden="true"
      >
        <MapPin className={cn("fill-current", mobile ? "h-4 w-4" : "h-5 w-5")} />
      </div>
      <div className="absolute -left-2 -top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--vintage-feather-white)] bg-[var(--vintage-desert-rock)] text-xs font-bold text-white shadow-sm">
        {index}
      </div>
      <div
        className={cn(
          "relative h-[96px] w-full overflow-hidden rounded-[10px] bg-[var(--vintage-cream)]/45",
          mobile && "h-[78px]",
        )}
      >
        <Image
          src={section.image}
          alt=""
          fill
          sizes={mobile ? "122px" : "142px"}
          className="object-contain transition duration-300 group-hover:scale-[1.04]"
        />
      </div>
      <div
        className={cn(
          "flex items-center justify-center gap-1.5 px-1 pb-1 pt-2 text-center font-bold uppercase leading-[1.15] text-[var(--vintage-desert-rock)]",
          mobile ? "text-[9px]" : "text-[10px]",
        )}
      >
        <Icon className={cn("shrink-0", mobile ? "h-3 w-3" : "h-3.5 w-3.5")} />
        <span>{section.title}</span>
      </div>
    </Link>
  )
}
