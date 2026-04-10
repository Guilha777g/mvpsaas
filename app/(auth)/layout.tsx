export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex items-center justify-center bg-bg">
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-10">
          <div className="label-mono text-gold mb-1">CRM</div>
          <h1 className="title-serif text-3xl text-fg">
            Elyon <em className="italic text-gold-light">Nexus</em>
          </h1>
        </div>
        {children}
      </div>
    </div>
  )
}
