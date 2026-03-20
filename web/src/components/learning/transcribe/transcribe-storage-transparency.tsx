import Link from "next/link"
import {
  ArrowRight,
  FileAudio,
  Folder,
  FolderOpen,
  Headphones,
  PenLine,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react"
import { MermaidDiagram } from "@/components/ui/mermaid-diagram"
import { GoogleDriveIcon } from "./google-drive-icon"

export function TranscribeStorageTransparency() {
  const workflowSource = `flowchart LR
    A[Upload audio] --> B{Choisir}
    B --> C[IA transcrit]
    B --> D[Vous ecrivez]
    C --> E[Enregistrer dans votre Drive]
    D --> E
    E --> F[MemoMap / AudioLessons / lesson_id]
    F --> G[Ouvrir en dictee]
    G --> H[Ecouter - ecrire - comparer]`

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
            <Sparkles className="h-3.5 w-3.5" />
            Workflow audio
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            Audio privé
          </span>
        </div>
        <h3 className="text-sm font-semibold tracking-wide text-slate-700">
          Que faire avec un audio ?
        </h3>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            icon: Upload,
            title: "1. Importez",
            description: "Ajoutez un MP3, WAV, M4A ou WEBM.",
            tone: "bg-blue-50 text-blue-700",
          },
          {
            icon: Sparkles,
            title: "2. IA ou vous",
            description: "Obtenez un brouillon ou faites la dictée vous-même.",
            tone: "bg-teal-50 text-teal-700",
          },
          {
            icon: FolderOpen,
            title: "3. Enregistrez",
            description: "MemoMap range l'audio et le texte dans votre Drive.",
            tone: "bg-amber-50 text-amber-700",
          },
          {
            icon: Headphones,
            title: "4. Réutilisez",
            description: "Ouvrez l'audio en dictée pour écouter, écrire, comparer.",
            tone: "bg-emerald-50 text-emerald-700",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4"
          >
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${item.tone}`}>
                <item.icon className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="rounded-[24px] border border-slate-200 bg-surface-gradient-transcribe-panel p-4">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-teal-600" />
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Schéma Mermaid
            </p>
          </div>

          <div className="rounded-[20px] border border-slate-200 bg-white p-3 shadow-inner">
            <div className="space-y-3">
              <MermaidDiagram
                chart={workflowSource}
                className="mermaid-diagram hidden overflow-x-auto rounded-[16px] bg-white text-slate-700 sm:block [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:min-w-[640px] [&_svg]:max-w-none [&_svg]:overflow-visible"
              />
              <ol className="space-y-2 text-sm text-slate-600 sm:hidden">
                <li className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">1. Importez un audio.</li>
                <li className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">2. Choisissez l&apos;IA ou la saisie manuelle.</li>
                <li className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">3. Enregistrez le tout dans Google Drive.</li>
                <li className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">4. Réouvrez l&apos;audio dans l&apos;éditeur de dictée.</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <GoogleDriveIcon className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Structure créée dans votre Drive
              </p>
            </div>

            <div className="space-y-2 text-sm text-slate-700">
              <div className="flex items-center gap-2">
                <GoogleDriveIcon className="h-4 w-4" />
                <span>Google Drive</span>
              </div>

              <div className="ml-2 border-l border-slate-200 pl-4">
                <div className="flex items-center gap-2">
                  <Folder className="h-4 w-4 text-emerald-600" />
                  <span>MemoMap</span>
                </div>

                <div className="ml-2 mt-2 border-l border-slate-200 pl-4">
                  <div className="flex items-center gap-2">
                    <Folder className="h-4 w-4 text-emerald-600" />
                    <span>AudioLessons</span>
                  </div>

                  <div className="ml-2 mt-2 border-l border-slate-200 pl-4">
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4 text-teal-600" />
                      <span>&lt;lesson_id&gt;</span>
                    </div>
                    <div className="mt-2 space-y-1.5 pl-6 text-xs text-slate-500">
                      <p className="flex items-center gap-2">
                        <FileAudio className="h-3.5 w-3.5" />
                        audio.*
                      </p>
                      <p className="flex items-center gap-2">
                        <PenLine className="h-3.5 w-3.5" />
                        transcript.json
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-surface-gradient-transcribe-accent p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <Headphones className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Puis, utilisez-le en dictée</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-600">
                  <span className="rounded-full bg-white px-2.5 py-1">Écouter</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  <span className="rounded-full bg-white px-2.5 py-1">Écrire</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  <span className="rounded-full bg-white px-2.5 py-1">Comparer</span>
                </div>
                <Link
                  href="/learning/workspace?open=editor"
                  className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50"
                >
                  {"Ouvrir l'éditeur de dictée"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
