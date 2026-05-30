"use server";

import Booking from "@/database/booking.model";
import connectDB from "../mongodb";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const createBooking = async ({
  eventId,
  slug,
  email,
}: {
  eventId: string;
  slug: string;
  email: string;
}) => {
  try {
    await connectDB();
    await Booking.create({ eventId, slug, email });

    await resend.emails.send({
      from: "DevEvent <noreply@yourdoman.com>",
      to: email,
      subject: "Your spot is booked!",
      html: `<p>Thanks for booking! Your spot for event <strong>${slug}<strong> is confirmed.</p>`,
    });

    return { success: true };
  } catch (e) {
    console.error("create booking failed", e);
    return { success: false };
  }
};
