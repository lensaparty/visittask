import { UserRole } from "@prisma/client";
import * as XLSX from "xlsx";
import {
  coerceInteger,
  findExistingUserByName,
  normalizeText,
  parseCoordinatePair,
  parseImportedScheduleCode,
  toPrismaScheduleDay,
  type ImportScheduleDayCode,
} from "@/lib/importer";
import { prisma } from "@/lib/prisma";

type ParsedOutletImportRow = {
  kodeToko: string;
  namaToko: string;
  alamat: string;
  kecamatan: string | null;
  kabupaten: string | null;
  lat: number;
  lon: number;
  district: string | null;
  territory: string | null;
  territoryGroup: string | null;
  supervisorName: string | null;
  fieldForceNameRaw: string | null;
  noTelpSpv: string | null;
  typeOutlet: string | null;
  visualPposm: string | null;
  brand: string | null;
  ukuran: string | null;
  jumlahSunscreen: number | null;
  scheduleOddDay: ImportScheduleDayCode | null;
  scheduleEvenDay: ImportScheduleDayCode | null;
};

export type OutletImportError = {
  rowNumber: number;
  message: string;
};

export type OutletImportSummary = {
  inserted: number;
  updated: number;
  errors: OutletImportError[];
};

function parseJumlahSunscreen(
  value: unknown,
  rowNumber: number,
): { value: number | null; error: OutletImportError | null } {
  const rawText = normalizeText(value);

  if (!rawText) {
    return {
      value: null,
      error: null,
    };
  }

  const parsed = coerceInteger(rawText);

  if (parsed == null) {
    return {
      value: null,
      error: {
        rowNumber,
        message: "Jumlah Sunscreen must be an integer.",
      },
    };
  }

  return {
    value: parsed,
    error: null,
  };
}

function parseScheduleColumn(
  value: unknown,
  label: "Ganjil" | "Genap",
  rowNumber: number,
): { value: ImportScheduleDayCode | null; error: OutletImportError | null } {
  const rawText = normalizeText(value);

  if (!rawText || rawText === "0") {
    return {
      value: null,
      error: null,
    };
  }

  const parsed = parseImportedScheduleCode(rawText);

  if (!parsed) {
    return {
      value: null,
      error: {
        rowNumber,
        message: `${label} must be an Indonesian weekday or 0.`,
      },
    };
  }

  return {
    value: parsed,
    error: null,
  };
}

function parseOutletImportRow(
  row: Record<string, unknown>,
  rowNumber: number,
): { data: ParsedOutletImportRow | null; error: OutletImportError | null } {
  const kodeToko = normalizeText(row["Kode Toko"]);
  const namaToko = normalizeText(row["Nama Toko"]);
  const alamat = normalizeText(row["Alamat"]);
  const kecamatan = normalizeText(row["Kecamatan"]);
  const kabupaten = normalizeText(row["Kabupaten"]);
  const koordinat = parseCoordinatePair(normalizeText(row["Koordinat"]));
  const district = normalizeText(row["District"]);
  const territory = normalizeText(row["Territory"]);
  const territoryGroup = normalizeText(row["Nama Territory Group"]);
  const supervisorName = normalizeText(row["Supervisor"]);
  const fieldForceNameRaw = normalizeText(row["Field Force"]);
  const noTelpSpv = normalizeText(row["No Telp Spv"]);
  const typeOutlet = normalizeText(row["Type Outlet"]);
  const visualPposm = normalizeText(row["Visual PPOSM"]);
  const brand = normalizeText(row["Brand"]);
  const ukuran = normalizeText(row["Ukuran"]);
  const jumlahSunscreen = parseJumlahSunscreen(row["Jumlah Sunscreen"], rowNumber);
  const scheduleOddDay = parseScheduleColumn(row["Ganjil"], "Ganjil", rowNumber);
  const scheduleEvenDay = parseScheduleColumn(row["Genap"], "Genap", rowNumber);

  if (!kodeToko) {
    return {
      data: null,
      error: {
        rowNumber,
        message: "Kode Toko is required.",
      },
    };
  }

  if (!namaToko) {
    return {
      data: null,
      error: {
        rowNumber,
        message: "Nama Toko is required.",
      },
    };
  }

  if (!alamat) {
    return {
      data: null,
      error: {
        rowNumber,
        message: "Alamat is required.",
      },
    };
  }

  if (!koordinat) {
    return {
      data: null,
      error: {
        rowNumber,
        message: "Koordinat must be in `lat, lon` format.",
      },
    };
  }

  if (jumlahSunscreen.error) {
    return {
      data: null,
      error: jumlahSunscreen.error,
    };
  }

  if (scheduleOddDay.error) {
    return {
      data: null,
      error: scheduleOddDay.error,
    };
  }

  if (scheduleEvenDay.error) {
    return {
      data: null,
      error: scheduleEvenDay.error,
    };
  }

  return {
    data: {
      kodeToko,
      namaToko,
      alamat,
      kecamatan,
      kabupaten,
      lat: koordinat.latitude,
      lon: koordinat.longitude,
      district,
      territory,
      territoryGroup,
      supervisorName,
      fieldForceNameRaw,
      noTelpSpv,
      typeOutlet,
      visualPposm,
      brand,
      ukuran,
      jumlahSunscreen: jumlahSunscreen.value,
      scheduleOddDay: scheduleOddDay.value,
      scheduleEvenDay: scheduleEvenDay.value,
    },
    error: null,
  };
}

export async function importOutletsFromWorkbook(file: File) {
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    throw new Error("Only .xlsx files are supported.");
  }

  const workbook = XLSX.read(await file.arrayBuffer(), {
    type: "array",
  });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("Workbook is empty.");
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets[sheetName],
    { defval: "" },
  );

  const summary: OutletImportSummary = {
    inserted: 0,
    updated: 0,
    errors: [],
  };

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;
    const parsed = parseOutletImportRow(row, rowNumber);

    if (!parsed.data || parsed.error) {
      summary.errors.push(
        parsed.error ?? {
          rowNumber,
          message: "Unable to parse row.",
        },
      );
      continue;
    }

    try {
      const supervisor = await findExistingUserByName({
        name: parsed.data.supervisorName,
        role: UserRole.SUPERVISOR,
      });

      const fieldForce = await findExistingUserByName({
        name: parsed.data.fieldForceNameRaw,
        role: UserRole.FIELD_FORCE,
      });

      const existingOutlet = await prisma.outlet.findUnique({
        where: {
          storeCode: parsed.data.kodeToko,
        },
        select: {
          id: true,
        },
      });

      const savedOutlet = await prisma.outlet.upsert({
        where: {
          storeCode: parsed.data.kodeToko,
        },
        update: {
          name: parsed.data.namaToko,
          address: parsed.data.alamat,
          subdistrict: parsed.data.kecamatan,
          regency: parsed.data.kabupaten,
          latitude: parsed.data.lat,
          longitude: parsed.data.lon,
          district: parsed.data.district,
          territory: parsed.data.territory,
          territoryGroup: parsed.data.territoryGroup,
          oddScheduleDay: toPrismaScheduleDay(parsed.data.scheduleOddDay),
          evenScheduleDay: toPrismaScheduleDay(parsed.data.scheduleEvenDay),
          supervisorId: supervisor?.id ?? null,
          fieldForceId: fieldForce?.id ?? null,
          supervisorPhone: parsed.data.noTelpSpv,
          typeOutlet: parsed.data.typeOutlet,
          visualPposm: parsed.data.visualPposm,
          brand: parsed.data.brand,
          size: parsed.data.ukuran,
          sunscreenCount: parsed.data.jumlahSunscreen,
        },
        create: {
          storeCode: parsed.data.kodeToko,
          name: parsed.data.namaToko,
          address: parsed.data.alamat,
          subdistrict: parsed.data.kecamatan,
          regency: parsed.data.kabupaten,
          latitude: parsed.data.lat,
          longitude: parsed.data.lon,
          district: parsed.data.district,
          territory: parsed.data.territory,
          territoryGroup: parsed.data.territoryGroup,
          oddScheduleDay: toPrismaScheduleDay(parsed.data.scheduleOddDay),
          evenScheduleDay: toPrismaScheduleDay(parsed.data.scheduleEvenDay),
          supervisorId: supervisor?.id ?? null,
          fieldForceId: fieldForce?.id ?? null,
          supervisorPhone: parsed.data.noTelpSpv,
          typeOutlet: parsed.data.typeOutlet,
          visualPposm: parsed.data.visualPposm,
          brand: parsed.data.brand,
          size: parsed.data.ukuran,
          sunscreenCount: parsed.data.jumlahSunscreen,
        },
      });

      if (fieldForce?.id) {
        await prisma.assignment.upsert({
          where: {
            userId_outletId: {
              userId: fieldForce.id,
              outletId: savedOutlet.id,
            },
          },
          update: {
            active: true,
          },
          create: {
            userId: fieldForce.id,
            outletId: savedOutlet.id,
            active: true,
          },
        });
      }

      if (existingOutlet) {
        summary.updated += 1;
      } else {
        summary.inserted += 1;
      }
    } catch (error) {
      summary.errors.push({
        rowNumber,
        message:
          error instanceof Error ? error.message : "Unexpected import error.",
      });
    }
  }

  return summary;
}
