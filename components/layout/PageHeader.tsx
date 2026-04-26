interface Props {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}
export default function PageHeader({ title, subtitle, children }: Props) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold text-ink-100 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-ink-300 mt-1">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}
