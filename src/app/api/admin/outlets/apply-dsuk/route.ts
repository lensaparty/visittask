import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  getTerritoryPicMapping,
  normalizeTerritoryGroup,
} from "@/lib/territory-pic-map";
import { getCurrentUser } from "@/lib/session";

const applyDsukSchema = z.object({
  territoryGroup: z.string().min(1),
  outletCodes: z.array(z.string()).min(1),
});

export async function POST(request: Request) {
  const adminUser = await getCurrentUser();

  if (!adminUser) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (adminUser.role !== UserRole.SUPERVISOR) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = applyDsukSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Provide `territoryGroup` and a non-empty `outletCodes` array." },
      { status: 400 },
    );
  }

  const normalizedTerritoryGroup = normalizeTerritoryGroup(parsed.data.territoryGroup);
  const mapping = getTerritoryPicMapping(normalizedTerritoryGroup);

  if (!mapping) {
    return NextResponse.json(
      { message: "Unknown DSUK territory group." },
      { status: 400 },
    );
  }

  const outletCodes = Array.from(
    new Set(
      parsed.data.outletCodes
        .map((outletCode) => outletCode.trim())
        .filter((outletCode) => outletCode.length > 0),
    ),
  );

  if (outletCodes.length === 0) {
    return NextResponse.json(
      { message: "At least one outlet code is required." },
      { status: 400 },
    );
  }

  const result = await prisma.outlet.updateMany({
    where: {
      storeCode: {
        in: outletCodes,
      },
    },
    data: {
      territoryGroup: mapping.territoryGroup,
    },
  });

  return NextResponse.json({
    territoryGroup: mapping.territoryGroup,
    updatedCount: result.count,
  });
}
