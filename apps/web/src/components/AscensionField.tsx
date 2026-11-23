import { levelCaps, type Weapon } from "@scanner/good";
import { useTranslation } from "react-i18next";
import { Choice } from "./Choice";

const phases = levelCaps.map((_, phase) => String(phase));

export function AscensionField({
  value,
  issue,
  onChange,
}: Readonly<{
  value?: Weapon["ascension"];
  issue?: string;
  onChange: (value: Weapon["ascension"]) => void;
}>) {
  const { t } = useTranslation();

  return (
    <Choice
      label={t("ascension")}
      issue={issue}
      value={value?.toString()}
      options={phases}
      optionLabel={(phase) =>
        t("phaseCap", { phase, cap: levelCaps[Number(phase)] })
      }
      onChange={(phase) => onChange(Number(phase) as Weapon["ascension"])}
    />
  );
}
