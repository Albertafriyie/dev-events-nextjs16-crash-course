import EventCard from "@/components/EventCard";
import ExploreBtn from "@/components/ExploreBtn";
import connectDB from "@/lib/mongodb";
import Event from "@/database/event.model";
import type { IEvent } from "@/database/event.model";
import { cacheLife, cacheTag } from "next/cache";

/**
 * Fetches all events from the database and returns them as plain JSON-serializable event objects.
 *
 * The returned events are ordered by `createdAt` descending (newest first).
 *
 * @returns An array of `IEvent` objects sorted by `createdAt` in descending order
 */
async function getEvents(): Promise<IEvent[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("events");

  await connectDB();
  const events = (await Event.find()
    .sort({ createdAt: -1 })
    .lean()
    .exec()) as IEvent[];

  return JSON.parse(JSON.stringify(events)) as IEvent[];
}

// ✅ Page is dynamic by default in Next.js 16 — no extra config needed
const Page = async () => {
  const events = await getEvents();

  return (
    <section>
      <h1 className="text-center">
        The Hub for Every Dev <br /> You Cannot Miss
      </h1>
      <p className="text-center mt-5">
        Hackathons, Meetups, Conferences, All in One Place
      </p>
      <ExploreBtn />
      <div className="mt-20 space-y-7">
        <h3>Featured Events</h3>
        <ul className="events">
          {events.length > 0 ? (
            events.map((event: IEvent) => (
              <li key={event._id?.toString()} className="list-none">
                <EventCard {...event} />
              </li>
            ))
          ) : (
            <p className="text-center text-muted-foreground">
              No events found. Check back soon.
            </p>
          )}
        </ul>
      </div>
    </section>
  );
};

export default Page;
