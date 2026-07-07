/** Puro Soul brand wordmark (from purosoul.in) with an optional app caption. */
export default function Logo({ size = 32, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/purosoul-logo.png"
        alt="Puro Soul"
        style={{ height: size }}
        className="w-auto dark:brightness-0 dark:invert"
      />
      {withText && (
        <span className="border-l border-gray-200 pl-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Scheme
          <br />
          Tracker
        </span>
      )}
    </div>
  );
}
