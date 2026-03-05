export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40">
      <div className="w-full max-w-md p-8 bg-background rounded-xl shadow-lg border">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">FitStudio</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gym Studio Management
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
