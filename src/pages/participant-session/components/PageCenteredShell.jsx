export function PageCenteredShell({ children, maxWidth = 'max-w-lg' }) {
  return (
    <main className="grid min-h-screen place-items-center bg-linear-to-br from-sky-50 via-white to-indigo-50 p-6">
      <div
        className={`w-full ${maxWidth} rounded-2xl border border-blue-200/70 bg-white p-8 text-center shadow-sm`}
      >
        {children}
      </div>
    </main>
  )
}
