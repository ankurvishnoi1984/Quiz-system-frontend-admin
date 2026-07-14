import { BarChart3 } from 'lucide-react'
import { SurveySessionEndingPanel } from '../participant-session/components/SurveySessionEndingPanel'
import { PreviewHeader } from './PreviewShell'

export function PreviewSurveyEndingSlide({ sessionTitle, summary, isLoading }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PreviewHeader sessionTitle={sessionTitle} />

      <div className="mb-[clamp(0.75rem,2vh,1.25rem)] flex shrink-0 flex-col items-center justify-center gap-1">
        <div className="flex items-center justify-center gap-3">
          <BarChart3 className="size-[clamp(2rem,5vw,3rem)] text-sky-600" aria-hidden />
          <h2 className="text-[clamp(2rem,6vw,3.5rem)] font-bold text-navy-900">Survey results</h2>
        </div>
        <p className="text-[clamp(0.85rem,1.8vw,1rem)] font-medium text-slate-500">
          Aggregated responses from all participants
        </p>
      </div>

      <SurveySessionEndingPanel
        sessionTitle={sessionTitle}
        summary={summary}
        isLoading={isLoading}
        variant="present"
        showThankYou={false}
      />
    </div>
  )
}
