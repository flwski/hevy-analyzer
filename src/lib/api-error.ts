import { NextResponse } from "next/server";
import { HevyApiError } from "./hevy";

export function handleApiError(error: unknown) {
  if (error instanceof HevyApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(error);
  return NextResponse.json({ error: message }, { status: 500 });
}
