/**
 * Логотип RamTech: бабочка с мотивами печатной платы.
 * Пока это векторная реплика по мотивам фирменного знака — когда в public/
 * появится настоящий файл, компонент подменит её на него.
 */
export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {/* Левое крыло */}
        <path d="M31 30C24 16 14 12 8 13c-1 7 1 18 9 24 5 4 11 3 14-1" />
        {/* Правое крыло */}
        <path d="M33 30c7-14 17-18 23-17 1 7-1 18-9 24-5 4-11 3-14-1" />
        {/* Тело */}
        <path d="M32 22v26" />
        {/* Усики */}
        <path d="M32 22l-4-7M32 22l4-7" />
        <circle cx="27.4" cy="14.2" r="1.8" fill="currentColor" />
        <circle cx="36.6" cy="14.2" r="1.8" fill="currentColor" />
        {/* Дорожки платы на крыльях */}
        <path d="M14 22h6l4 4h5" />
        <circle cx="12.6" cy="22" r="1.8" fill="currentColor" />
        <path d="M50 22h-6l-4 4h-5" />
        <circle cx="51.4" cy="22" r="1.8" fill="currentColor" />
        <path d="M18 38l4-4h6" />
        <circle cx="16.6" cy="38" r="1.8" fill="currentColor" />
        <path d="M46 38l-4-4h-6" />
        <circle cx="47.4" cy="38" r="1.8" fill="currentColor" />
      </g>
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark className="size-8 text-brand-light" />
      {!compact && (
        <span className="text-lg font-semibold tracking-tight text-white">
          RaM<span className="text-brand-light">Tech</span>
        </span>
      )}
    </div>
  );
}
