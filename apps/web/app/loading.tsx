export default function GlobalLoading(): JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg">
      <div className="flex w-full max-w-2xl flex-col gap-4 px-6">
        <div className="shimmer h-6 w-[60%] rounded-md" />
        <div className="shimmer h-6 w-[40%] rounded-md" />
        <div className="shimmer h-6 w-[80%] rounded-md" />
      </div>
    </main>
  )
}
