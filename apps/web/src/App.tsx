import { useEffect, useState } from "react";
import { CustomOwners } from "./components/CustomOwners";
import { loadCustomOwners, saveCustomOwners } from "./customOwners";
import { useTranslation } from "react-i18next";
import { AppHeader } from "./components/AppHeader";
import { AppFooter } from "./components/AppFooter";
import { RecordingPicker } from "./components/RecordingPicker";
import { ReviewSummary } from "./components/ReviewSummary";
import { ArtifactList } from "./components/ArtifactList";
import { CharacterReview } from "./components/CharacterReview";
import { WeaponEditor } from "./components/WeaponEditor";
import { Editor } from "./Editor";
import { downloadInventory, downloadScanReport } from "./download";
import {
  characterEntries,
  edited,
  editedWeapon,
  inventoryReviewRows,
} from "./review";
import { useRecordingScan } from "./useRecordingScan";

const reviewTabs = [
  ["artifact", "artifactsTab"],
  ["weapon", "weaponsTab"],
  ["character", "charactersTab"],
] as const;
type ReviewTab = (typeof reviewTabs)[number][0];

declare global {
  interface Window {
    downloadScanReport?: () => void;
  }
}

export function App() {
  const { t } = useTranslation();

  const [names, setNames] = useState(loadCustomOwners);
  const { rows, characters, setCharacters, changeRow, skipped, ...scan } =
    useRecordingScan(names);
  const [tab, setTab] = useState<ReviewTab>();
  const [selected, select] = useState(0);
  const activeTab =
    tab ??
    (rows.some((row) => row.kind === "artifact") ? "artifact" : "weapon");
  const reviewed = inventoryReviewRows(rows);
  const entries = characterEntries(reviewed, characters);
  const visible = reviewed
    .map((row, i) => ({ row, i }))
    .filter(({ row }) => row.kind === activeTab);
  const selectedEntry = visible[selected];
  const row = selectedEntry?.row;

  function start(file?: File) {
    if (!file || scan.progress) return;
    setTab(undefined);
    select(0);
    void scan.start(file);
  }

  function toggleSelected() {
    if (!selectedEntry) return;
    changeRow(selectedEntry.i, (current) => ({
      ...current,
      excluded: !current.excluded,
    }));
  }

  useEffect(() => {
    if (!rows.length || scan.progress) return;
    window.downloadScanReport = () => downloadScanReport(rows);
    return () => {
      delete window.downloadScanReport;
    };
  }, [rows, scan.progress]);

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="mx-auto my-9 w-full max-w-275 grow px-4 pb-16 sm:my-16 sm:px-7">
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
        <RecordingPicker
          {...scan}
          start={start}
          skipped={skipped.artifacts + skipped.weapons}
        />
        {rows.length > 0 && (
          <>
            <ReviewSummary
              rows={reviewed}
              skipped={skipped}
              charactersToReview={
                entries.filter(
                  (entry) => !entry.excluded && entry.issues.length,
                ).length
              }
              complete={scan.status === "complete"}
              save={() => downloadInventory(rows, characters)}
            />
            <div
              className="mb-4 flex flex-wrap gap-2"
              role="group"
              aria-label={t("reviewSections")}
            >
              {reviewTabs.map(([id, label]) => (
                <button
                  type="button"
                  key={id}
                  aria-pressed={activeTab === id}
                  className="cursor-pointer rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium hover:bg-stone-100 aria-pressed:border-emerald-800 aria-pressed:bg-emerald-50"
                  onClick={() => {
                    setTab(id);
                    select(0);
                  }}
                >
                  {t(label)}
                </button>
              ))}
            </div>
            {activeTab === "character" ? (
              <CharacterReview
                entries={entries}
                update={(owner, entry) =>
                  setCharacters((previous) => ({ ...previous, [owner]: entry }))
                }
              />
            ) : row ? (
              <div className="grid items-start gap-5 md:grid-cols-[minmax(14rem,0.85fr)_minmax(20rem,1.6fr)]">
                <ArtifactList
                  rows={visible.map(({ row }) => row)}
                  selected={selected}
                  select={select}
                />
                {row.kind === "weapon" ? (
                  <WeaponEditor
                    row={row}
                    toggle={toggleSelected}
                    update={(draft) =>
                      changeRow(selectedEntry.i, (current) =>
                        current.kind === "weapon"
                          ? editedWeapon(current, draft)
                          : current,
                      )
                    }
                  />
                ) : (
                  <Editor
                    row={row}
                    toggle={toggleSelected}
                    update={(draft) =>
                      changeRow(selectedEntry.i, (current) =>
                        current.kind === "artifact"
                          ? edited(current, draft)
                          : current,
                      )
                    }
                  />
                )}
              </div>
            ) : (
              <p className="text-stone-600">
                {t(activeTab === "weapon" ? "noWeapons" : "noArtifacts")}
              </p>
            )}
          </>
        )}
      </main>
      <AppFooter />
    </div>
  );
}
