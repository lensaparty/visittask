import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import {
  coerceInteger,
  ensureImportedUser,
  normalizeText,
  parseCoordinatePair,
  parseImportedSchedule,
} from "@/lib/importer";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (user.role !== UserRole.SUPERVISOR) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const formData = await request.formData();
  const uploadedFile = formData.get("file");

  if (!(uploadedFile instanceof File)) {
    return NextResponse.json(
      { message: "Attach an Excel file in the `file` field." },
      { status: 400 },
    );
  }

  const workbook = XLSX.read(await uploadedFile.arrayBuffer(), {
    type: "array",
  });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    return NextResponse.json({ message: "Workbook is empty." }, { status: 400 });
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets[sheetName],
    { defval: "" },
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const storeCode = normalizeText(row["Kode Toko"]);
    const outletName = normalizeText(row["Nama Toko"]);
    const address = normalizeText(row["Alamat"]);
    const coordinates = parseCoordinatePair(normalizeText(row["Koordinat"]));

    if (!storeCode || !outletName || !address || !coordinates) {
      skipped += 1;
      continue;
    }

    const supervisor = await ensureImportedUser({
      name: normalizeText(row["Supervisor"]),
      role: UserRole.SUPERVISOR,
      phone: normalizeText(row["No Telp Spv"]),
      territory: normalizeText(row["Territory"]),
      territoryGroup: normalizeText(row["Nama Territory Group"]),
    });

    const fieldForce = await ensureImportedUser({
      name: normalizeText(row["Field Force"]),
      role: UserRole.FIELD_FORCE,
      territory: normalizeText(row["Territory"]),
      territoryGroup: normalizeText(row["Nama Territory Group"]),
    });

    const existing = await prisma.outlet.findUnique({
      where: { storeCode },
    });

    await prisma.outlet.upsert({
      where: { storeCode },
      update: {
        name: outletName,
        address,
        subdistrict: normalizeText(row["Kecamatan"]),
        regency: normalizeText(row["Kabupaten"]),
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        district: normalizeText(row["District"]),
        territory: normalizeText(row["Territory"]),
        territoryGroup: normalizeText(row["Nama Territory Group"]),
        oddScheduleDay: parseImportedSchedule(row["Ganjil"]),
        evenScheduleDay: parseImportedSchedule(row["Genap"]),
        supervisorId: supervisor?.id ?? null,
        fieldForceId: fieldForce?.id ?? null,
        supervisorPhone: normalizeText(row["No Telp Spv"]),
        typeOutlet: normalizeText(row["Type Outlet"]),
        visualPposm: normalizeText(row["Visual PPOSM"]),
        brand: normalizeText(row["Brand"]),
        size: normalizeText(row["Ukuran"]),
        sunscreenCount: coerceInteger(row["Jumlah Sunscreen"]),
      },
      create: {
        storeCode,
        name: outletName,
        address,
        subdistrict: normalizeText(row["Kecamatan"]),
        regency: normalizeText(row["Kabupaten"]),
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        district: normalizeText(row["District"]),
        territory: normalizeText(row["Territory"]),
        territoryGroup: normalizeText(row["Nama Territory Group"]),
        oddScheduleDay: parseImportedSchedule(row["Ganjil"]),
        evenScheduleDay: parseImportedSchedule(row["Genap"]),
        supervisorId: supervisor?.id ?? null,
        fieldForceId: fieldForce?.id ?? null,
        supervisorPhone: normalizeText(row["No Telp Spv"]),
        typeOutlet: normalizeText(row["Type Outlet"]),
        visualPposm: normalizeText(row["Visual PPOSM"]),
        brand: normalizeText(row["Brand"]),
        size: normalizeText(row["Ukuran"]),
        sunscreenCount: coerceInteger(row["Jumlah Sunscreen"]),
      },
    });

    if (existing) {
      updated += 1;
    } else {
      created += 1;
    }
  }

  return NextResponse.json({
    created,
    updated,
    skipped,
    rows: rows.length,
  });
}
