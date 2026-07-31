import { NextResponse } from "next/server";
import { getAllBodyMeasurements } from "@/lib/hevy";
import { handleApiError } from "@/lib/api-error";

export async function GET() {
  try {
    const measurements = await getAllBodyMeasurements();
    return NextResponse.json({ body_measurements: measurements });
  } catch (error) {
    return handleApiError(error);
  }
}
