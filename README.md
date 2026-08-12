<div align="center">

# 🚌 BusNova

**A full-stack bus agency management platform** — seat layouts, live trip scheduling, real-time booking, and integrated payments in one system.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Realtime-010101?logo=socket.io&logoColor=white)](https://socket.io/)
[![Razorpay](https://img.shields.io/badge/Payments-Razorpay-0C2451?logo=razorpay&logoColor=white)](https://razorpay.com/)
[![License](https://img.shields.io/badge/License-Educational-lightgrey)](#license)

[Overview](#-overview) • [Features](#-features) • [Tech Stack](#️-tech-stack) • [Getting Started](#-getting-started) • [Architecture](#-architecture) • [Security](#️-security) • [Deployment](#-deployment)

</div>

---

## 📌 Overview

**BusNova** is a web-based bus agency management system that centralizes the operations of a bus travel business — buses, routes, stops, trips, seat layouts, bookings, passengers, payments, drivers, staff, and customer accounts — into a single platform.

The system is built around four distinct user workflows:

| Role | Responsibility |
|---|---|
| 🧑‍💼 **Admin** | Full system management and oversight |
| 🎫 **Booking Staff** | Day-to-day booking and operational tasks |
| 🙋 **Customer** | Search buses, select seats, book tickets, pay online |
| 🧑‍✈️ **Driver** | View assigned trips and duty schedules |

Real-time updates are powered by **Socket.IO**, and payments are processed through **Razorpay**.

---

## ✨ Features

<details open>
<summary><strong>👨‍💼 Admin Management</strong></summary>

- Authentication & role-based access control
- Central dashboard with system-wide analytics
- User, staff, and driver management
- Bus, seat layout, route, and stop/station management
- Trip scheduling and monitoring
- Booking, passenger, and payment oversight
- Coupon management
- Notification broadcasting
- Admin activity logs
- System banners and configurable settings

</details>

<details>
<summary><strong>👤 Customer Experience</strong></summary>

- Registration with OTP email verification
- Secure login / logout and profile management
- Bus search with route and trip details
- Interactive seat selection (Normal & Premium pricing)
- Passenger information capture
- Coupon and discount support
- Booking creation with Razorpay payment
- Live booking status and full booking history
- Real-time in-app notifications

</details>

<details>
<summary><strong>🧑‍✈️ Driver Portal</strong></summary>

- Secure driver login
- Personalized dashboard
- Assigned trip schedule and upcoming duty roster
- Route and bus details per trip
- Live trip status
- Push notifications for schedule changes

</details>

<details>
<summary><strong>🔔 Real-Time Notifications (Socket.IO)</strong></summary>

Delivered instantly to the relevant role or user:

- New customer registered
- New booking created
- Payment completed / failed
- Booking status updated
- Admin broadcast messages
- Driver-specific trip alerts

Notifications are persisted in the database where relevant, so they remain available after a user reconnects.

</details>

<details>
<summary><strong>💳 Payments (Razorpay)</strong></summary>

```text
Customer → Select Trip → Select Seats → Passenger Details
         → Create Booking → Reserve Seats → Create Razorpay Order
         → Payment → Verify Payment → Confirm Booking
```

If payment creation fails before the booking completes, reserved seats are automatically released.

</details>

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Backend** | Node.js, Express.js, MongoDB, Mongoose, EJS, Socket.IO |
| **Auth & Security** | JWT, bcrypt, Express Session, Cookie Parser, Helmet, CORS, Joi validation, OTP email verification |
| **Payments** | Razorpay |
| **File / Media** | Multer, Cloudinary |
| **Frontend** | HTML5, CSS3, JavaScript, Bootstrap 5, Bootstrap Icons, EJS |
| **Tooling** | Git, GitHub, Postman, Morgan, dotenv |

---

## 📂 Project Structure

```text
BusNova/
│
├── app/
│   ├── config/
│   │   ├── db.js
│   │   └── socket.js
│   │
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   └── utils/
│
├── public/
│   └── assets/
│       ├── css/
│       ├── js/
│       └── images/
│
├── views/
│   ├── admin/
│   ├── customer/
│   ├── driver/
│   ├── staff/
│   └── layouts/
│
├── .env
├── .gitignore
├── package.json
├── package-lock.json
└── server.js
```

---

## 🗄️ Database Collections

BusNova uses **MongoDB** with **Mongoose** for schema modeling:

```text
Users               Roles               Buses
SeatLayouts         Routes              Stops
Trips               Bookings            Passengers
Payments            Coupons             Drivers / Driver Profiles
Staffs              Notifications       AdminNotifications
Banners             Settings            ActivityLogs
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- MongoDB (local or Atlas)
- Cloudinary account (for media uploads)
- Razorpay account (for payments)

### 1. Clone the Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd BusNova
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
PORT=3000

MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_token_secret

SESSION_SECRET=your_session_secret

EMAIL_USER=your_email
EMAIL_PASSWORD=your_email_app_password

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

RAZORPAY_KEY_ID=your_razorpay_test_key_id
RAZORPAY_KEY_SECRET=your_razorpay_test_key_secret
```

> ⚠️ **Never commit `.env` or real API credentials to GitHub.**

### 4. Run the Application

**Development mode:**

```bash
npm run dev
```

**Standard mode** (if `nodemon` isn't configured):

```bash
node server.js
```

The app will be available at:

```text
http://localhost:3000
```

---

## 🔑 Demo Credentials

> Replace with actual demo values before sharing publicly. Never publish real production credentials.

| Role | Email | Password |
|---|---|---|
| Admin | `YOUR_ADMIN_EMAIL` | `YOUR_ADMIN_PASSWORD` |
| Booking Staff | `YOUR_STAFF_EMAIL` | `YOUR_STAFF_PASSWORD` |
| Driver | `YOUR_DRIVER_EMAIL` | `YOUR_DRIVER_PASSWORD` |
| Customer | `YOUR_CUSTOMER_EMAIL` | `YOUR_CUSTOMER_PASSWORD` |

**Razorpay Test Mode**

```text
Mode: Test
Key ID: YOUR_RAZORPAY_TEST_KEY_ID
```

> 🔒 **Do not put your Razorpay Key Secret in a public README.** For public repos, simply state `Razorpay: Test Mode` and keep the actual secret inside `.env`.

---

## 🏗️ Architecture

### 🪑 Seat Booking Flow

BusNova supports tiered seat categories:

```text
Normal Seat   → Base Fare
Premium Seat  → Premium Fare
```

Each trip document stores:

```text
baseFare
premiumFare
availableSeats
bookedSeatNumbers
```

The applicable fare is resolved server-side based on the selected seat category.

### 🔒 Atomic Seat Reservation

To prevent race conditions where two customers book the same seat simultaneously, seat reservation uses **atomic MongoDB update operations**:

```javascript
$inc         // decrement availableSeats
$addToSet    // add to bookedSeatNumbers
```

This guarantees no duplicate seat allocation under concurrent load.

### 🔔 Socket.IO Notification Flow

```text
Browser → Socket.IO Client → Socket.IO Server → Room / Event → Connected User
```

**Broadcast to a role:**

```javascript
io.to("role:Admin").emit("newNotification", {
  title: "New Booking",
  message: "A new booking has been created."
});
```

**Target a specific user:**

```javascript
io.to(`user:${userId}`).emit("newNotification", {
  title: "Booking Confirmed",
  message: "Your booking has been confirmed."
});
```

### 📢 Admin Notifications

System-generated admin notifications are tracked separately from customer/staff notifications, and persist even while the admin is offline:

```text
New Customer Registered   Payment Successful
New Booking Created       Payment Failed
Booking Cancelled         Trip Updated
```

### 🧾 Booking Lifecycle

```text
Search → Trip Selection → Seat Selection → Passenger Details
       → Booking Created → Seats Reserved → Payment Created
       → Razorpay Payment → Payment Verification → Booking Confirmed
```

### 👥 Role-Based Access

```text
Admin
 ├── Manage Users
 ├── Manage Buses
 ├── Manage Routes
 ├── Manage Trips
 ├── Manage Bookings
 └── Manage Notifications

Booking Staff
 └── Booking Operations

Driver
 └── Assigned Trips

Customer
 ├── Search
 ├── Booking
 └── Payment
```

### 🚌 Trip Composition

A trip links together:

```text
Route + Bus + Driver + Departure Time + Arrival Time + Fare + Seat Availability
```

**Example:**

| Field | Value |
|---|---|
| Route | Delhi → Jaipur |
| Bus | BN-101 |
| Driver | Assigned Driver |
| Departure | 22:30 |
| Arrival | 05:30 |
| Base Fare | ₹800 |
| Premium Fare | ₹1,100 |

---

## 📊 Admin Dashboard Modules

Users · Buses · Seat Layouts · Routes · Stops · Trips · Bookings · Payments · Passengers · Drivers · Staff · Coupons · Notifications · Activity Logs · Settings

---

## 🛡️ Security

- Password hashing with **bcrypt**
- **JWT** authentication with refresh tokens
- Secure session handling
- HTTP security headers via **Helmet**
- **CORS** configuration
- Request validation (Joi)
- Protected admin routes with role-based authorization
- Environment variables for all secrets
- HTML escaping for notification content
- Atomic seat reservation to prevent double-booking

---

## 🌐 Deployment

1. Provision a production MongoDB database
2. Configure production environment variables
3. Set `NODE_ENV=production`
4. Switch to Razorpay production credentials
5. Switch to Cloudinary production credentials
6. Deploy the Node.js application
7. Configure HTTPS
8. Update CORS allowed origins
9. Configure secure production session cookies
10. Ensure `.env` and secret keys are never exposed

---

## 🚫 Environment Variables & Git Hygiene

Ensure `.gitignore` includes:

```gitignore
node_modules/
.env
.env.*
!.env.example
uploads/
logs/
```

Provide a template via `.env.example`:

```env
PORT=
MONGO_URI=

JWT_SECRET=
JWT_REFRESH_SECRET=

SESSION_SECRET=

EMAIL_USER=
EMAIL_PASSWORD=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
```

> 📌 **Never publish real passwords, JWT secrets, MongoDB credentials, email passwords, Cloudinary secrets, or Razorpay secret keys in this README.** For project presentations or private submissions, share credentials via a separate, secured document.

---

## 📄 License

This project is developed for **educational/project purposes**.

<div align="center">

**BusNova** — Bus Agency Management System with Seat Layout & Ticket Booking

</div>
