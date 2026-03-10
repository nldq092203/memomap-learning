import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import type { DelfTestPaperDetailResponse, MatchingAnswer } from "@/lib/types/api/delf"
import { learningDelfApi } from "@/lib/services/learning-delf-api"
import { ExerciseView } from "@/components/learning/delf/exercise-view"
import { MatchingExerciseView } from "@/components/learning/delf/matching-exercise-view"
import { ExtraTranscriptView } from "@/components/learning/delf/extra-transcript-view"
import { DocumentComprehensionView } from "@/components/learning/delf/document-comprehension-view"
import { MultipleChoiceSetView } from "@/components/learning/delf/multiple-choice-set-view"
import { Play, Pause, RotateCcw, AlertCircle } from "lucide-react"

interface TestPlayerProps {
  test: DelfTestPaperDetailResponse
  userAnswers: { exerciseId: string; selectedOption: number }[]
  matchingAnswers: MatchingAnswer[]
  subQuestionAnswers: Record<string, any>
  showResults: boolean
  score: { correct: number; total: number; percentage: number } | null
  onAnswer: (exerciseId: string, optionIndex: number) => void
  onMatchAnswer: (exerciseId: string, docId: string, personLabel: string) => void
  onAnswerSubQuestion: (questionId: string, value: any) => void
  onSubmit: () => void
  onRestartTest: () => void
  onBack: () => void
}

export function TestPlayer({
  test,
  userAnswers,
  matchingAnswers,
  subQuestionAnswers,
  showResults,
  score,
  onAnswer,
  onMatchAnswer,
  onAnswerSubQuestion,
  onSubmit,
  onRestartTest,
  onBack,
}: TestPlayerProps) {
  const content = test.content
  const section = test.section
  
  // Calculate if all questions have been answered
  const allAnswered = content.exercises.every(ex => {
    if (ex.type === "matching") {
      // For matching: every document must have a selection
      const matchAnswer = matchingAnswers.find(a => a.exerciseId === ex.id)
      return ex.documents?.every(doc => matchAnswer?.selections[doc.id]) ?? false
    } else if (ex.type === "document_comprehension" || ex.type === "article_comprehension" || ex.type === "multi_document_comprehension" || ex.type === "multiple_choice_set") {
      // For nested: every sub-question must have an answer
      const questions = ex.questions || []
      return questions.every(q => {
         const ans = subQuestionAnswers[q.id]
         if (ans === undefined || ans === null) return false
         if (q.type === 'multiple_select_image') {
            return Array.isArray(ans) && ans.length > 0
         }
         if (q.type === 'label_matching') {
            const mapped = ans as Record<string, number>
            // Ideally we check if every required part has a value, but checking if there is at least one key is a safe minimum
            return Object.keys(mapped).length > 0 && Object.values(mapped).every(v => v !== undefined)
         }
         return true
      })
    }
    // For MCQ: must have a selected option
    return userAnswers.some(a => a.exerciseId === ex.id)
  })

  // --- Audio Player State ---
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const audioUrl = test.audio_url || (content.audio_filename 
    ? learningDelfApi.getAudioProxyUrl(test.level, test.variant, test.section, content.audio_filename) 
    : undefined)

  // Audio Event Handlers
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
      setProgress((audio.currentTime / audio.duration) * 100)
    }
    const handleLoadedMetadata = () => setDuration(audio.duration)
    const handleEnded = () => {
      setIsPlaying(false)
      setProgress(100)
    }

    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("loadedmetadata", handleLoadedMetadata)
    audio.addEventListener("ended", handleEnded)

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata)
      audio.removeEventListener("ended", handleEnded)
    }
  }, [audioUrl])

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        void audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleRestart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      setProgress(0)
      if (!isPlaying) {
        void audioRef.current.play()
        setIsPlaying(true)
      }
    }
  }

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00"
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  // --- Render ---
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header Info */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Test {test.test_id}</h2>
            <p className="text-muted-foreground mt-1">
              Variant: <span className="font-medium text-foreground">{test.variant}</span>
            </p>
          </div>
          
          {showResults && score && (
            <div className={`flex items-center gap-4 rounded-lg px-4 py-3 border ${
              score.percentage >= 50 
                ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950/30' 
                : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30'
            }`}>
              <div className="flex flex-col">
                <span className="text-xs font-semibold uppercase tracking-wider">Your Score</span>
                <span className="text-xl font-bold">
                  {score.correct} / {score.total} ({score.percentage}%)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* --- Audio Player (CO) --- */}
        {section === "CO" && audioUrl && (
          <div className="mt-6 rounded-lg bg-primary/5 p-4 border border-primary/20 flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Button
                size="icon"
                onClick={togglePlay}
                className="h-12 w-12 rounded-full shadow-sm shrink-0"
              >
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
              </Button>
              <div className="flex-1 space-y-2">
                <Progress value={progress} className="h-2" />
                <div className="flex justify-between text-xs font-medium text-muted-foreground">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRestart}
                className="shrink-0 h-10 w-10 text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-5 w-5" />
              </Button>
            </div>
            {/* Hidden native audio element */}
            <audio ref={audioRef} src={audioUrl} className="hidden" />
          </div>
        )}
      </div>

      {/* --- Reading Material (CE extra transcripts) --- */}
      {section === "CE" && content.extra_transcripts?.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            Reading Documents
          </h3>
          <ExtraTranscriptView transcripts={content.extra_transcripts} />
        </div>
      )}

      {/* --- Exercises List --- */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold px-1">Questions</h3>
        {content.exercises.map((exercise, index) => {
          if (exercise.type === "matching") {
            // Matching exercise
            const mA = matchingAnswers.find(a => a.exerciseId === exercise.id)
            return (
              <MatchingExerciseView
                key={exercise.id}
                exercise={exercise}
                index={index}
                selections={mA?.selections || {}}
                showResults={showResults}
                onSelectMatch={(docId, personLabel) => onMatchAnswer(exercise.id, docId, personLabel)}
              />
            )
          }
          
          if (exercise.type === "document_comprehension" || exercise.type === "article_comprehension" || exercise.type === "multi_document_comprehension") {
            return (
              <DocumentComprehensionView
                key={exercise.id}
                exercise={exercise}
                index={index}
                subQuestionAnswers={subQuestionAnswers}
                showResults={showResults}
                onAnswerSubQuestion={onAnswerSubQuestion}
                getAssetUrl={(filename) => 
                  learningDelfApi.getAssetUrl(test.level, test.variant, test.section, filename)
                }
              />
            )
          }

          if (exercise.type === "multiple_choice_set") {
            return (
              <MultipleChoiceSetView
                key={exercise.id}
                exercise={exercise}
                index={index}
                subQuestionAnswers={subQuestionAnswers}
                showResults={showResults}
                onAnswerSubQuestion={onAnswerSubQuestion}
                getAssetUrl={(filename) => 
                  learningDelfApi.getAssetUrl(test.level, test.variant, test.section, filename)
                }
              />
            )
          }

          // Legacy MCQ exercise
          const uA = userAnswers.find(a => a.exerciseId === exercise.id)
          const isCorrect = showResults ? uA?.selectedOption === exercise.correct_answer : null

          return (
            <ExerciseView
              key={exercise.id}
              exercise={exercise}
              index={index}
              selectedOption={uA?.selectedOption}
              isCorrect={isCorrect ?? null}
              showResults={showResults}
              onAnswer={(optIdx) => onAnswer(exercise.id, optIdx)}
              getAssetUrl={(filename) => 
                learningDelfApi.getAssetUrl(test.level, test.variant, test.section, filename)
              }
            />
          )
        })}
      </div>

      {/* --- Bottom Actions --- */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 pb-20 border-t">
        <Button variant="outline" onClick={onBack} className="w-full sm:w-auto">
          Exit Test
        </Button>
        
        {!showResults ? (
          <div className="w-full sm:w-auto flex flex-col items-center gap-2">
            <Button 
              onClick={onSubmit} 
              size="lg" 
              className="w-full sm:w-auto px-8 shadow-sm"
              disabled={!allAnswered}
            >
              Submit Test
            </Button>
            {!allAnswered && (
              <p className="text-xs text-muted-foreground">
                Please answer all questions to submit.
              </p>
            )}
          </div>
        ) : (
          <div className="w-full sm:w-auto flex justify-end">
            <Button onClick={onRestartTest} size="lg" className="w-full sm:w-auto px-8 shadow-sm">
              Restart Test
            </Button>
          </div>
        )}
      </div>

    </div>
  )
}
