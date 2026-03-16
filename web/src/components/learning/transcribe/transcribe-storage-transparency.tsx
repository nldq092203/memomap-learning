import { Folder, FolderOpen, ShieldCheck } from "lucide-react"
import { GoogleDriveIcon } from "./google-drive-icon"

export function TranscribeStorageTransparency() {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <GoogleDriveIcon className="h-4 w-4" />
            <h3 className="text-sm font-semibold tracking-wide text-slate-700">
              Storage Transparency
            </h3>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-500">
            Quand vous enregistrez une session, l’application crée un espace dédié dans votre
            Google Drive pour ranger l’audio et sa transcription.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700">
          <ShieldCheck className="h-3.5 w-3.5" />
          Stockage privé dans votre Drive
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm">
              <GoogleDriveIcon className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Votre audio et la transcription enregistrée seront stockés dans un dossier MemoMap
                simple et dédié, séparé de vos autres fichiers.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4">
          <div className="mb-3 flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-slate-500" />
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Dossier créé dans Drive
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
                    <p>audio.*</p>
                    <p>transcript.json</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
