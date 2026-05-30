import { v2 as cloudinary } from "cloudinary";
import Event from "@/database/event.model";
import connectDB from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const contentType = req.headers.get("content-type") || "";

    let event: Record<string, unknown>;
    let formData: FormData | undefined;

    if (contentType.includes("application/json")) {
      try {
        event = await req.json();
      } catch {
        return NextResponse.json(
          { message: "Invalid JSON data format" },
          { status: 400 },
        );
      }
    } else {
      try {
        formData = await req.formData();
      } catch {
        return NextResponse.json(
          { message: "Invalid form data" },
          { status: 400 },
        );
      }

      event = Object.fromEntries(formData.entries());
    }

    const normalizedKeys: Record<string, unknown> = {};
    Object.entries(event).forEach(([k, v]) => {
      normalizedKeys[k.trim()] = v;
    });
    event = normalizedKeys;

    const evt = event as Record<string, unknown>;
    if (typeof evt.agenda === "string") {
      try {
        evt.agenda = JSON.parse(evt.agenda as string) as string[];
      } catch {
        evt.agenda = (evt.agenda as string)
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean);
      }
    }

    if (typeof evt.tags === "string") {
      try {
        evt.tags = JSON.parse(evt.tags as string) as string[];
      } catch {
        evt.tags = (evt.tags as string)
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean);
      }
    }

    const file = formData?.get("image") as unknown as File | null;

    if (!file && typeof event.image !== "string") {
      return NextResponse.json(
        { message: "Image file is required" },
        { status: 400 },
      );
    }

    const tags = JSON.parse(formData?.get("tags") as string);
    const agenda = JSON.parse(formData?.get("agenda") as string);

    let uploadResult: { secure_url: string } | null = null;
    if (file) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      uploadResult = await new Promise<{ secure_url: string }>(
        (resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              { resource_type: "image", folder: "DevEvent" },
              (err, res) => {
                if (err) {
                  reject(err);
                } else if (!res) {
                  reject(new Error("Cloudinary upload returned no result"));
                } else {
                  resolve(res);
                }
              },
            )
            .end(buffer);
        },
      );
    }

    if (uploadResult) {
      event.image = uploadResult.secure_url;
    }

    console.debug("Parsed event payload:", event);

    try {
      const createdEvent = await Event.create({
        ...event,
        tags: tags,
        agenda: agenda,
      });

      return NextResponse.json(
        { message: "Event Created Successfully", event: createdEvent },
        { status: 201 },
      );
    } catch (err) {
      const maybeErr = err as { name?: string; errors?: unknown } | undefined;

      if (maybeErr && maybeErr.name === "ValidationError") {
        console.error("ValidationError creating event:", maybeErr.errors);
        return NextResponse.json(
          { message: "Event validation failed", errors: maybeErr.errors },
          { status: 400 },
        );
      }
      throw err;
    }
  } catch (e) {
    console.error(e);

    return NextResponse.json(
      {
        message: "Event Creation Failed",
        error: e instanceof Error ? e.message : "Unknown",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    await connectDB();

    const events = await Event.find().sort({ createdAt: -1 });

    return NextResponse.json(
      { message: "Events fetched successfully", events },
      { status: 200 },
    );
  } catch (e) {
    return NextResponse.json(
      { message: "Event fetching failed", error: e },
      { status: 500 },
    );
  }
}
