export default function Loading({ text = 'LOADING...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[40vh]" role="status" aria-live="polite">
      <div className="border-[3px] border-border px-8 py-4 bg-surface animate-pulse">
        <span className="font-bold text-lg">{text}</span>
      </div>
    </div>
  )
}
