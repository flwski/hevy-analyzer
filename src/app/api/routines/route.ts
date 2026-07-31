import { NextResponse } from "next/server";
import { getAllRoutineFolders, getAllRoutines } from "@/lib/hevy";
import { handleApiError } from "@/lib/api-error";

export async function GET() {
  try {
    const [routines, folders] = await Promise.all([
      getAllRoutines(),
      getAllRoutineFolders(),
    ]);
    return NextResponse.json({ routines, folders });
  } catch (error) {
    return handleApiError(error);
  }
}
