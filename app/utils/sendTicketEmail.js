const mongoose = require("mongoose");
const transporter = require("../config/emailConfig");

const Booking = require("../models/Booking");
const logger = require("../utils/logger");

// --------------------------------------------------
// Escape HTML
// --------------------------------------------------

const escapeHtml = (value) => {
  if (value === null || value === undefined) {
    return "—";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// --------------------------------------------------
// Send Digital Ticket Email
// --------------------------------------------------

const sendTicketEmail = async (bookingId) => {
  try {
    // ==================================================
    // 1. GET ALL TICKET DATA
    // ==================================================

    const result = await Booking.aggregate([
      // ------------------------------------------
      // Booking
      // ------------------------------------------

      {
        $match: {
          _id: new mongoose.Types.ObjectId(bookingId),
          isDeleted: false,
        },
      },

      // ==================================================
      // USER
      // ==================================================

      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },

      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },

      // ==================================================
      // TRIP
      // ==================================================

      {
        $lookup: {
          from: "trips",
          localField: "tripId",
          foreignField: "_id",
          as: "trip",
        },
      },

      {
        $unwind: {
          path: "$trip",
          preserveNullAndEmptyArrays: false,
        },
      },

      // ==================================================
      // ROUTE
      // ==================================================

      {
        $lookup: {
          from: "routes",
          localField: "trip.routeId",
          foreignField: "_id",
          as: "route",
        },
      },

      {
        $unwind: {
          path: "$route",
          preserveNullAndEmptyArrays: true,
        },
      },

      // ==================================================
      // ORIGIN STOP
      // route.originStopId -> stops._id
      // ==================================================

      {
        $lookup: {
          from: "stops",
          localField: "route.originStopId",
          foreignField: "_id",
          as: "originStop",
        },
      },

      {
        $unwind: {
          path: "$originStop",
          preserveNullAndEmptyArrays: true,
        },
      },

      // ==================================================
      // DESTINATION STOP
      // route.destinationStopId -> stops._id
      // ==================================================

      {
        $lookup: {
          from: "stops",
          localField: "route.destinationStopId",
          foreignField: "_id",
          as: "destinationStop",
        },
      },

      {
        $unwind: {
          path: "$destinationStop",
          preserveNullAndEmptyArrays: true,
        },
      },

      // ==================================================
      // BUS
      // ==================================================

      {
        $lookup: {
          from: "buses",
          localField: "trip.busId",
          foreignField: "_id",
          as: "bus",
        },
      },

      {
        $unwind: {
          path: "$bus",
          preserveNullAndEmptyArrays: true,
        },
      },

      // ==================================================
      // PAYMENT
      // ==================================================

      {
        $lookup: {
          from: "payments",
          localField: "_id",
          foreignField: "bookingId",
          as: "payment",
        },
      },

      {
        $unwind: {
          path: "$payment",
          preserveNullAndEmptyArrays: true,
        },
      },

      // ==================================================
      // PASSENGERS
      // ==================================================

      {
        $lookup: {
          from: "passengers",
          localField: "_id",
          foreignField: "bookingId",
          as: "passengers",
        },
      },

      // ==================================================
      // PROJECT REQUIRED DATA
      // ==================================================

      {
        $project: {
          // -----------------------------
          // Booking
          // -----------------------------

          bookingCode: 1,
          seatNumbers: 1,

          // -----------------------------
          // User
          // -----------------------------

          "user.name": 1,
          "user.email": 1,
          "user.phone": 1,

          // -----------------------------
          // Trip
          // -----------------------------

          "trip.departureAt": 1,
          "trip.arrivalAt": 1,

          // -----------------------------
          // Route
          // -----------------------------

          "route.origin": 1,
          "route.destination": 1,

          // -----------------------------
          // Origin Stop
          // -----------------------------

          "originStop.name": 1,
          "originStop.city": 1,

          // -----------------------------
          // Destination Stop
          // -----------------------------

          "destinationStop.name": 1,
          "destinationStop.city": 1,

          // -----------------------------
          // Bus
          // -----------------------------

          "bus.busNumber": 1,
          "bus.busName": 1,

          // -----------------------------
          // Payment
          // -----------------------------

          "payment.amount": 1,
          "payment.paymentMethod": 1,
          "payment.razorpayPaymentId": 1,
          "payment.status": 1,

          // -----------------------------
          // Passengers
          // -----------------------------

          passengers: 1,
        },
      },
    ]);

    // ==================================================
    // 2. CHECK RESULT
    // ==================================================

    if (!result.length) {
      logger.warn(`Ticket email: Booking not found: ${bookingId}`);

      return false;
    }

    const booking = result[0];

    // ==================================================
    // 3. CHECK USER
    // ==================================================

    if (!booking.user || !booking.user.email) {
      logger.warn(
        `Ticket email: User/email not found for booking ${booking.bookingCode}`,
      );

      return false;
    }

    // ==================================================
    // 4. USER
    // ==================================================

    const userName = escapeHtml(booking.user.name);

    const userEmail = booking.user.email;

    // ==================================================
    // 5. BOOKING
    // ==================================================

    const bookingCode = escapeHtml(booking.bookingCode);

    // ==================================================
    // 6. ORIGIN STOP
    // ==================================================

    const originStopName = booking.originStop?.name || "—";

    const originCity = booking.originStop?.city || "—";

    // Example:
    // Dadar East, Mumbai

    const origin = escapeHtml(`${originStopName}, ${originCity}`);

    // ==================================================
    // 7. DESTINATION STOP
    // ==================================================

    const destinationStopName = booking.destinationStop?.name || "—";

    const destinationCity = booking.destinationStop?.city || "—";

    // Example:
    // Digha Bus Stand, Digha

    const destination = escapeHtml(
      `${destinationStopName}, ${destinationCity}`,
    );

    // ==================================================
    // 8. BUS
    // ==================================================

    const busNumber = escapeHtml(booking.bus?.busNumber || "—");

    // ==================================================
    // 9. DEPARTURE
    // ==================================================

    const departureTime = booking.trip?.departureAt
      ? new Date(booking.trip.departureAt).toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "—";

    // ==================================================
    // 10. ARRIVAL
    // ==================================================

    const arrivalTime = booking.trip?.arrivalAt
      ? new Date(booking.trip.arrivalAt).toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "—";

    // ==================================================
    // 11. SEATS
    // ==================================================

    const seats =
      booking.seatNumbers && booking.seatNumbers.length
        ? booking.seatNumbers.join(", ")
        : "—";

    // ==================================================
    // 12. PAYMENT
    // ==================================================

    const amount =
      booking.payment?.amount != null
        ? `₹${Number(booking.payment.amount).toFixed(2)}`
        : "—";

    const paymentMethod = escapeHtml(booking.payment?.paymentMethod || "—");

    const paymentStatus = escapeHtml(booking.payment?.status || "captured");

    // ==================================================
    // 13. SEND EMAIL
    // ==================================================

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,

      to: userEmail,

      subject: `BusNova Ticket Confirmed — ${bookingCode}`,

      html: `
<!DOCTYPE html>

<html>

<head>

  <meta charset="UTF-8">

  <title>BusNova Digital Ticket</title>

</head>


<body
  style="
    margin:0;
    padding:0;
    background:#f4f6f8;
    font-family:Arial,Helvetica,sans-serif;
  "
>

  <div
    style="
      max-width:650px;
      margin:30px auto;
      background:#ffffff;
      border-radius:12px;
      overflow:hidden;
      box-shadow:0 4px 15px rgba(0,0,0,0.08);
    "
  >


    <!-- HEADER -->

    <div
      style="
        background:#ff6b00;
        padding:25px;
        color:#ffffff;
        text-align:center;
      "
    >

      <h1
        style="
          margin:0;
          font-size:30px;
        "
      >
        BusNova
      </h1>

      <p
        style="
          margin:8px 0 0;
          font-size:15px;
        "
      >
        Your digital bus ticket
      </p>

    </div>


    <!-- CONTENT -->

    <div style="padding:30px;">

      <h2
        style="
          margin-top:0;
          color:#222;
        "
      >
        Booking Confirmed 🎉
      </h2>


      <p style="color:#555;">

        Hello <strong>${userName}</strong>,

      </p>


      <p style="color:#555;">

        Your BusNova booking has been successfully confirmed.
        Please keep this email for your journey.

      </p>


      <!-- BOOKING CODE -->

      <div
        style="
          background:#f8f9fa;
          border:1px dashed #ff6b00;
          padding:18px;
          text-align:center;
          border-radius:8px;
          margin:25px 0;
        "
      >

        <div
          style="
            font-size:13px;
            color:#777;
            margin-bottom:5px;
          "
        >
          BOOKING ID
        </div>


        <strong
          style="
            font-size:24px;
            color:#ff6b00;
            letter-spacing:2px;
          "
        >
          ${bookingCode}
        </strong>

      </div>


      <!-- JOURNEY -->

      <h3
        style="
          color:#222;
          border-bottom:1px solid #eee;
          padding-bottom:10px;
        "
      >
        Journey Details
      </h3>


      <table
        width="100%"
        cellpadding="8"
        cellspacing="0"
        style="font-size:14px;"
      >

        <!-- FROM -->

        <tr>

          <td style="color:#777;">
            From
          </td>

          <td>

            <strong>
              ${origin}
            </strong>

          </td>

        </tr>


        <!-- TO -->

        <tr>

          <td style="color:#777;">
            To
          </td>

          <td>

            <strong>
              ${destination}
            </strong>

          </td>

        </tr>


        <!-- DEPARTURE -->

        <tr>

          <td style="color:#777;">
            Departure
          </td>

          <td>

            <strong>
              ${departureTime}
            </strong>

          </td>

        </tr>


        <!-- ARRIVAL -->

        <tr>

          <td style="color:#777;">
            Arrival
          </td>

          <td>

            <strong>
              ${arrivalTime}
            </strong>

          </td>

        </tr>


        <!-- BUS -->

        <tr>

          <td style="color:#777;">
            Bus
          </td>

          <td>

            <strong>
              ${busNumber}
            </strong>

          </td>

        </tr>


        <!-- SEATS -->

        <tr>

          <td style="color:#777;">
            Seat(s)
          </td>

          <td>

            <strong>
              ${seats}
            </strong>

          </td>

        </tr>

      </table>


      <!-- PAYMENT -->

      <h3
        style="
          color:#222;
          border-bottom:1px solid #eee;
          padding-bottom:10px;
          margin-top:25px;
        "
      >
        Payment Details
      </h3>


      <table
        width="100%"
        cellpadding="8"
        cellspacing="0"
        style="font-size:14px;"
      >

        <tr>

          <td style="color:#777;">
            Amount Paid
          </td>

          <td>

            <strong>
              ${amount}
            </strong>

          </td>

        </tr>


        <tr>

          <td style="color:#777;">
            Payment Method
          </td>

          <td>

            <strong>
              ${paymentMethod}
            </strong>

          </td>

        </tr>


        <tr>

          <td style="color:#777;">
            Payment Status
          </td>

          <td>

            <strong style="color:#198754;">
              ${paymentStatus}
            </strong>

          </td>

        </tr>

      </table>


      <!-- IMPORTANT -->

      <div
        style="
          margin-top:25px;
          padding:15px;
          background:#fff8f0;
          border-left:4px solid #ff6b00;
          color:#555;
        "
      >

        <strong>Important:</strong>

        Please carry a valid ID proof and show this
        booking ID when required during boarding.

      </div>


      <p
        style="
          margin-top:30px;
          color:#555;
        "
      >
        Thank you for choosing BusNova.
      </p>


      <p style="color:#555;">

        Safe travels! 🚌

      </p>


      <p style="margin-top:30px;">

        Regards,<br>

        <strong>
          BusNova Team
        </strong>

      </p>

    </div>


    <!-- FOOTER -->

    <div
      style="
        background:#f8f9fa;
        padding:15px;
        text-align:center;
        color:#888;
        font-size:12px;
      "
    >

      This is an automated email from BusNova.
      Please do not reply to this email.

    </div>


  </div>

</body>

</html>
      `,
    });

    // ==================================================
    // 14. LOG
    // ==================================================

    logger.info(
      `Digital ticket email sent to ${userEmail} for booking ${bookingCode}`,
    );

    return true;
  } catch (error) {
    logger.error(`Ticket email sending failed: ${error.message}`);

    // Booking/payment already succeeded.
    // Email failure must NOT cancel the booking.

    return false;
  }
};

module.exports = sendTicketEmail;
