import { useEffect, useState } from "react";
import { CustomOwners } from "./components/CustomOwners";
import { loadCustomOwners, saveCustomOwners } from "./customOwners";
import { useTranslation } from "react-i18next";
import { AppHeader } from "./components/AppHeader";
import { RecordingPicker } from "./components/RecordingPicker";
import { ReviewSummary } from "./components/ReviewSummary";
import { ArtifactList } from "./components/ArtifactList";
import { Editor } from "./Editor";
import { downloadArtifacts, downloadScanReport } from "./download";
import { edited } from "./review";
import { useRecordingScan } from "./useRecordingScan";

declare global {
  interface Window {
    downloadScanReport?: () => void;
  }
}

export function App() {
  const { t } = useTranslation();

  const [names, setNames] = useState(loadCustomOwners);
  const { rows, selected, select, changeSelected, skipped, ...scan } =
    useRecordingScan(names);
  const row = rows[selected];

  useEffect(() => {
    if (!rows.length || scan.progress) return;
    window.downloadScanReport = () => downloadScanReport(rows);
    return () => {
      delete window.downloadScanReport;
    };
  }, [rows, scan.progress]);

  return (
    <>
      <AppHeader />
      <main className="mx-auto my-9 max-w-275 px-4 pb-16 sm:my-16 sm:px-7">
        <h1 className="font-serif text-[clamp(2.5rem,6vw,4.5rem)] leading-tight tracking-tight text-emerald-950">
          {t("title")}
        </h1>
        <p className="mt-4 mb-8 max-w-2xl text-lg text-stone-600">
          {t("intro")}
        </p>
        <CustomOwners
          names={names}
          disabled={!!scan.progress}
          onChange={(next) => {
            setNames(next);
            saveCustomOwners(next);
          }}
        />
        <RecordingPicker skipped={skipped} {...scan} />
        {row && (
          <>
            <ReviewSummary
              rows={rows}
              skipped={skipped}
              complete={scan.status === "complete"}
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
