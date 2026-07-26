export default function Loading({ text = 'LOADING...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[40vh]" role="status" aria-live="polite">
      <div className="border-[3px] border-border px-8 py-6 bg-surface shadow-brutal flex flex-col items-center gap-4">
        {/* Accent-colored spinner using CSS variable via border-accent */}
        <div className="w-8 h-8 border-[4px] border-border border-t-accent rounded-full animate-spin" aria-hidden="true" />
        <span className="font-bold text-lg">{text}</span>
      </div>
    </div>
  )
}
