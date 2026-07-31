import { NextResponse } from "next/server";
import { getUserInfo } from "@/lib/hevy";
import { handleApiError } from "@/lib/api-error";

export async function GET() {
  try {
    const info = await getUserInfo();
    return NextResponse.json(info);
  } catch (error) {
    return handleApiError(error);
  }
}
