import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { IEvent } from "@/database/event.model";
import Event from "@/database/event.model";
import connectDB from "@/lib/mongodb";

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

/**
 * Fetches an event by slug and returns a JSON HTTP response.
 *
 * @param params - A promise resolving to the route parameters; the resolved object must contain `slug`.
 * @returns A NextResponse with a JSON body:
 * - 200: `{ message: "Event fetched successfully", event }`
 * - 400: `{ message: "Missing or invalid slug parameter" }`
 * - 404: `{ message: "Event not found for slug: <slug>" }`
 * - 500: `{ message: "An unexpected error happened", error }`
 */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    // connect to MongoDB once per server lifecycle; connectDB caches the connection in development
    await connectDB();

    const resolvedParams = await params;

    // validate and normalize slug route param for consistent URL matching
    const slug = resolvedParams?.slug?.trim().toLowerCase();

    if (!slug) {
      return NextResponse.json(
        { message: "Missing or invalid slug parameter" },
        { status: 400 },
      );
    }

    // query event by slug and return raw object
    const event = await Event.findOne({ slug }).lean<IEvent>().exec();

    if (!event) {
      return NextResponse.json(
        { message: `Event not found for slug: ${slug}` },
        { status: 404 },
      );
    }

    // respond with event data
    return NextResponse.json(
      { message: "Event fetched successfully", event },
      { status: 200 },
    );
  } catch (error) {
    // log unexpected server errors
    console.error("GET /api/events/[slug] error:", error);

    return NextResponse.json(
      {
        message: "An unexpected error happened",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
