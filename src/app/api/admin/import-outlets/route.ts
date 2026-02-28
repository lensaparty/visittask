import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { importOutletsFromWorkbook } from "@/lib/outlet-import";
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
      { message: "Attach an .xlsx file in the `file` field." },
      { status: 400 },
    );
  }

  try {
    const summary = await importOutletsFromWorkbook(uploadedFile);
    return NextResponse.json(summary);
  } catch (importError) {
    return NextResponse.json(
      {
        message:
          importError instanceof Error
            ? importError.message
            : "Unable to import outlets.",
      },
      { status: 400 },
    );
  }
}
