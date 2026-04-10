export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex items-center justify-center bg-bg relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold/[.04] rounded-full blur-[120px]" />
        <div className="absolute top-1/4 left-1/3 w-[300px] h-[300px] bg-gold/[.03] rounded-full blur-[80px]" />
      </div>

      {/* Card */}
      <div className="relative w-full max-w-md px-6">
        <div className="text-center mb-8">
          <div className="label-mono text-gold mb-1.5">CRM</div>
          <h1 className="title-serif text-3xl text-fg">
            Elyon <em className="italic text-gold-light">Nexus</em>
          </h1>
          <p className="text-xs text-dim font-light mt-2">CRM inteligente com agentes de IA</p>
        </div>

        <div className="bg-surface-2/80 backdrop-blur-xl border border-white/[.06] rounded-xl p-8 shadow-[0_32px_80px_rgba(0,0,0,.5)]">
          {children}
        </div>

        <div className="text-center mt-6">
          <span className="font-mono text-[9px] tracking-[.16em] text-gold/20 uppercase">
            Powered by Elyon Nexus
          </span>
        </div>
      </div>
    </div>
  )
}
