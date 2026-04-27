interface Props {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}
export default function PageHeader({ title, subtitle, children }: Props) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6 md:mb-8">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-ink-100 tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs md:text-sm text-ink-300 mt-1">{subtitle}</p>}
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2 md:gap-3 flex-shrink-0">
          {children}
        </div>
      )}
    </div>
  );
}
