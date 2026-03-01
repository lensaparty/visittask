export type TerritoryPicMapping = {
  teamName: string;
  territoryGroup: string;
  picName: string;
};

export const TERRITORY_PIC_MAPPINGS: TerritoryPicMapping[] = [
  {
    teamName: "Phoenix",
    territoryGroup: "DSUK001",
    picName: "Moh Ikbal Awaluddin",
  },
  {
    teamName: "Vamos",
    territoryGroup: "DSUK002",
    picName: "R Hardi Rahadian Gusman",
  },
  {
    teamName: "Southern",
    territoryGroup: "DSUK003",
    picName: "Anwar Chairul",
  },
  {
    teamName: "Vamos",
    territoryGroup: "DSUK004",
    picName: "Arsya Malika Atmaja",
  },
  {
    teamName: "Phoenix",
    territoryGroup: "DSUK005",
    picName: "Muhammad Faturrahman",
  },
  {
    teamName: "Vamos",
    territoryGroup: "DSUK006",
    picName: "Wahyu Wicaksono",
  },
  {
    teamName: "Phoenix",
    territoryGroup: "DSUK007",
    picName: "Angki Febiyandi",
  },
  {
    teamName: "Southern",
    territoryGroup: "DSUK008",
    picName: "Joddy Laslihardo",
  },
  {
    teamName: "Southern",
    territoryGroup: "DSUK009",
    picName: "Imam Munsyarif",
  },
  {
    teamName: "North",
    territoryGroup: "DSUK010",
    picName: "Fardiansyah Fardiansyah",
  },
  {
    teamName: "Inferno",
    territoryGroup: "DSUK011",
    picName: "Bachtiyar Arif Ibrahim",
  },
  {
    teamName: "Pakidulan Troops",
    territoryGroup: "DSUK012",
    picName: "Dedi Yusfardi",
  },
  {
    teamName: "North",
    territoryGroup: "DSUK013",
    picName: "Ami Utari",
  },
  {
    teamName: "Inferno",
    territoryGroup: "DSUK014",
    picName: "Deny Miharja",
  },
  {
    teamName: "Inferno",
    territoryGroup: "DSUK015",
    picName: "Yopi Sopyan Juhri",
  },
  {
    teamName: "Pakidulan Troops",
    territoryGroup: "DSUK016",
    picName: "Yoka Kalparizal",
  },
  {
    teamName: "Pakidulan Troops",
    territoryGroup: "DSUK017",
    picName: "Jeremia Perwira Negara",
  },
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
