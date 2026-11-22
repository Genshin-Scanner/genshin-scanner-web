import { AppHeader } from "./components/AppHeader";
import { RecordingPicker } from "./components/RecordingPicker";
import { ReviewSummary } from "./components/ReviewSummary";
import { ArtifactList } from "./components/ArtifactList";
import { Editor } from "./Editor";
import { downloadArtifacts } from "./download";
import { edited } from "./review";
import { useRecordingScan } from "./useRecordingScan";

export function App() {
  const { rows, selected, select, changeSelected, skipped, ...scan } =
    useRecordingScan();
  const row = rows[selected];

  return (
    <>
      <AppHeader />
      <main className="mx-auto my-9 max-w-[1100px] px-4 pb-16 sm:my-16 sm:px-7">
        <h1 className="font-serif text-[clamp(2.5rem,6vw,4.5rem)] leading-tight tracking-tight text-emerald-950">
          Scan your artifacts
        </h1>
        <p className="mt-4 mb-8 max-w-2xl text-lg text-stone-600">
          Choose a recording of your inventory to review its artifacts and
          export them to Genshin Optimizer.
        </p>
        <RecordingPicker {...scan} />
        {row && (
          <>
            <ReviewSummary
              rows={rows}
              skipped={skipped}
              complete={scan.status === "Scan complete"}
              save={() => downloadArtifacts(rows)}
            />
            <div className="grid items-start gap-5 md:grid-cols-[minmax(14rem,0.85fr)_minmax(20rem,1.6fr)]">
              <ArtifactList rows={rows} selected={selected} select={select} />
              <Editor
                row={row}
                toggle={() =>
                  changeSelected((r) => ({ ...r, excluded: !r.excluded }))
                }
                update={(draft) => changeSelected((r) => edited(r, draft))}
              />
            </div>
          </>
        )}
      </main>
    </>
  );
}
