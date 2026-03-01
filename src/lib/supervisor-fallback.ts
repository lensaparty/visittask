const DISTRICT_SUPERVISOR_MAP: Record<string, string> = {
  DSUK001: "Moh Ikbal Awaluddin",
  DSUK002: "R Hardi Rahadian Gusman",
  DSUK003: "Anwar Chairul",
  DSUK004: "Arsya Malika Atmaja",
  DSUK005: "Muhammad Faturrahman",
  DSUK006: "Wahyu Wicaksono",
  DSUK007: "Angki Febiyandi",
  DSUK008: "Joddy Laslihardo",
  DSUK009: "Imam Munsyarif",
  DSUK010: "Fardiansyah Fardiansyah",
  DSUK011: "Bachtiyar Arif Ibrahim",
  DSUK012: "Dedi Yusfardi",
  DSUK013: "Ami Utari",
  DSUK014: "Deny Miharja",
  DSUK015: "Yopi Sopyan Juhri",
  DSUK016: "Yoka Kalparizal",
  DSUK017: "Jeremia Perwira Negara",
};

export function getSupervisorFallbackByDistrict(district?: string | null) {
  const normalizedDistrict = district?.trim().toUpperCase();

  if (!normalizedDistrict) {
    return null;
  }

  return DISTRICT_SUPERVISOR_MAP[normalizedDistrict] ?? null;
}
