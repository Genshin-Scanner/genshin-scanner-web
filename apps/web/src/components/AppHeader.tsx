export function AppHeader() {
  return (
    <header className="flex min-h-18 items-center justify-between gap-3 border-b border-stone-300 bg-stone-50 px-6 text-stone-600 sm:px-[6vw]">
      <div className="font-bold tracking-tight text-emerald-950">
        <span
          aria-hidden="true"
          className="mr-2 align-middle text-3xl text-amber-700"
        >
          ✧
        </span>{" "}
        Inventory Scanner
      </div>
      <span>Genshin Impact</span>
    </header>
  );
}
