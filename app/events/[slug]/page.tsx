// app/events/[slug]/page.tsx

import BookEvent from "@/components/BookEvent";
import EventCard from "@/components/EventCard";
import { IEvent } from "@/database/event.model";
import { getSimilarEventBySlug } from "@/lib/actions/event.action";
import { cacheLife } from "next/cache";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  "http://localhost:3000";

// ─── Presentational Components ───────────────────────────────────────────────

const EventDetailItem = ({
  icon,
  alt,
  label,
}: {
  icon: string;
  alt: string;
  label: string;
}) => (
  <div className="flex-row-gap-2 items-center">
    <Image src={icon} alt={alt} width={17} height={17} />
    <p>{label}</p>
  </div>
);

const EventAgenda = ({ agendaItems }: { agendaItems: string[] }) => (
  <div className="agenda">
    <h2>Agenda</h2>
    <ul>
      {agendaItems.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  </div>
);

const EventTags = ({ tags }: { tags: string[] }) => (
  <div className="flex flex-row gap-1.5 flex-wrap">
    {tags.map((tag) => (
      <div className="pill" key={tag}>
        {tag}
      </div>
    ))}
  </div>
);

// ─── Booking Card ─────────────────────────────────────────────────────────────

const BookingCard = ({ eventId, slug }: { eventId: string; slug: string }) => {
  const bookings = 10;

  return (
    <div className="signup-card">
      <h2>Book Your Spot</h2>
      {bookings > 0 ? (
        <p className="text-sm">
          Join {bookings} people who have already booked their spot!
        </p>
      ) : (
        <p className="text-sm">Be the first to book your spot!</p>
      )}
      <BookEvent eventId={eventId} slug={slug} />
    </div>
  );
};

/**
 * Fetches event data for the given event slug from the API.
 *
 * @param slug - The event's slug used to locate the event resource
 * @returns The parsed JSON response containing the event data, or `null` if the response is not OK
 */

async function getEvent(slug: string) {
  "use cache";
  const res = await fetch(`${API_URL}/api/events/${slug}`);
  if (!res.ok) return null;
  return res.json();
}

/**
 * Renders the event details layout for the given route slug, including banner, overview,
 * event metadata, agenda, organizer info, tags, and a booking sidebar.
 *
 * If the fetched event is missing a description, triggers Next.js's `notFound()` to render a 404.
 *
 * @param params - A promise that resolves to an object with a `slug` property used to fetch the event
 * @returns A React element containing the full event details layout
 */

async function EventContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; // ✅ resolved inside Suspense boundary
  const data = await getEvent(slug);

  if (!data?.event?.description) return notFound();

  const {
    event: {
      _id: eventId,
      description,
      image,
      overview,
      date,
      time,
      location,
      mode,
      agenda,
      audience,
      tags,
      organizer,
    },
  } = data;

  return (
    <>
      <div className="header">
        <h1>Event Description</h1>
        <p>{description}</p>
      </div>

      <div className="details">
        {/* Left Side */}
        <div className="content">
          <Image
            src={image}
            alt="Event Banner"
            width={800}
            height={800}
            style={{ height: "auto" }}
            className="banner"
          />

          <section className="flex-col-gap-2">
            <h2>Overview</h2>
            <p>{overview}</p>
          </section>

          <section className="flex-col-gap-2">
            <h2>Event Details</h2>
            <EventDetailItem
              icon="/icons/calendar.svg"
              alt="calendar"
              label={date}
            />
            <EventDetailItem icon="/icons/clock.svg" alt="clock" label={time} />
            <EventDetailItem icon="/icons/pin.svg" alt="pin" label={location} />
            <EventDetailItem icon="/icons/mode.svg" alt="mode" label={mode} />
            <EventDetailItem
              icon="/icons/audience.svg"
              alt="audience"
              label={audience}
            />
          </section>

          <EventAgenda agendaItems={agenda} />

          <section className="flex-col-gap-2">
            <h2>About the organizer</h2>
            <p>{organizer}</p>
          </section>

          <EventTags tags={tags} />
        </div>

        {/* Right Side */}
        <aside className="booking">
          <BookingCard eventId={eventId} slug={slug} />
        </aside>
      </div>
    </>
  );
}

/**
 * Renders a "Similar Events" list for the event identified by the given slug.
 *
 * @param params - A promise that resolves to an object with a `slug` string used to fetch similar events
 * @returns A React node containing a list of similar events, or `null` when no similar events are found
 */
async function SimilarEvents({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params; // ✅ resolved inside Suspense boundary
  const similarEvents: IEvent[] = await getSimilarEventBySlug(slug);

  if (!similarEvents.length) return null;

  return (
    <div className="flex w-full flex-col gap-4 pt-20">
      <h2>Similar Events</h2>
      <div className="events">
        {similarEvents.map((event: IEvent) => (
          <EventCard key={event.title} {...event} />
        ))}
      </div>
    </div>
  );
}

// ─── Page Shell (no await, no runtime data accessed here at all) ──────────────

const EventDetailsPage = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  return (
    <section id="event">
      <Suspense fallback={<p>Loading event...</p>}>
        <EventContent params={params} />
      </Suspense>

      <Suspense fallback={<p>Loading similar events...</p>}>
        <SimilarEvents params={params} />
      </Suspense>
    </section>
  );
};

export default EventDetailsPage;
