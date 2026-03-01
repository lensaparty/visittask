export type TerritoryPicMapping = {
  teamName: string;
  territoryGroup: string;
};

export const TERRITORY_PIC_MAPPINGS: TerritoryPicMapping[] = [
  { teamName: "Phoenix", territoryGroup: "DSUK001" },
  { teamName: "Vamos", territoryGroup: "DSUK002" },
  { teamName: "Southern", territoryGroup: "DSUK003" },
  { teamName: "Vamos", territoryGroup: "DSUK004" },
  { teamName: "Phoenix", territoryGroup: "DSUK005" },
  { teamName: "Vamos", territoryGroup: "DSUK006" },
  { teamName: "Phoenix", territoryGroup: "DSUK007" },
  { teamName: "Southern", territoryGroup: "DSUK008" },
  { teamName: "Southern", territoryGroup: "DSUK009" },
  { teamName: "North", territoryGroup: "DSUK010" },
  { teamName: "Inferno", territoryGroup: "DSUK011" },
  { teamName: "Pakidulan Troops", territoryGroup: "DSUK012" },
  { teamName: "North", territoryGroup: "DSUK013" },
  { teamName: "Inferno", territoryGroup: "DSUK014" },
  { teamName: "Inferno", territoryGroup: "DSUK015" },
  { teamName: "Pakidulan Troops", territoryGroup: "DSUK016" },
  { teamName: "Pakidulan Troops", territoryGroup: "DSUK017" },
];

export function normalizeTerritoryGroup(value: string | null | undefined) {
  return value?.trim().toUpperCase() ?? "";
}

export function getTerritoryPicMapping(value: string | null | undefined) {
  const normalizedValue = normalizeTerritoryGroup(value);

  if (!normalizedValue) {
    return null;
  }

  return (
    TERRITORY_PIC_MAPPINGS.find(
      (mapping) => mapping.territoryGroup === normalizedValue,
    ) ?? null
  );
}
