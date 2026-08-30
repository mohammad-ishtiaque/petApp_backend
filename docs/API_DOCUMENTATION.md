# Pet App Backend - Complete API Documentation & Endpoints Specification

---

## 1. System Architecture & Dataflow Overview

### 1.1 High-Level Dataflow Diagram

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT LAYER                                     |
|                      (Mobile Apps / Web Frontend Clients)                         |
+-----------------------------------------------------------------------------------+
                                          |
                                   HTTP / HTTPS / WS
                                          v
+-----------------------------------------------------------------------------------+
|                                 EXPRESS APP LAYER                                 |
|  - Static Uploads (`/uploads`)                                                    |
|  - CORS & Cookie Parser                                                           |
|  - Body Parsers (JSON & URL-Encoded 10MB)                                         |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                                MIDDLEWARE LAYER                                   |
|  - Auth Middlewares (`authenticateUser`, `authenticateOwner`, etc.)                 |
|  - File Upload Middleware (`multer` local / `multer-s3` AWS SDK)                  |
|  - Request Validation & Parsing (`QueryBuilder`)                                  |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                        MODULE CONTROLLERS & SERVICE LOGIC                         |
|  - Auth, Pet, User, Owner, Business, BusinessServices, Booking, Review            |
|  - Advertisement, Notification, Conversation, Dashboard, Webhooks               |
+-----------------------------------------------------------------------------------+
        |                                  |                                 |
        v                                  v                                 v
+---------------+                +-------------------+             +--------------------+
|  MONGODB DB   |                |  EXTERNAL SERVICES|             | REALTIME & EMIT    |
|  - Mongoose   |                |  - AWS S3 Storage |             | - Socket.io WS     |
|    ODM        |                |  - Nodemailer OTP |             | - Push Notification|
|  - Aggregation|                |  - RevenueCat     |             |   Service          |
+---------------+                +-------------------+             +--------------------+
```

---

### 1.2 Global Request & Response Formats

#### Success Response Standard
All successful API calls return a JSON response with `success: true`:
```json
{
  "success": true,
  "message": "Operation description",
  "data": { ... },
  "pagination": {
    "total": 100,
    "totalPage": 10,
    "currentPage": 1,
    "limit": 10
  }
}
```

#### Error Response Standard
All thrown errors are passed to the global `errorHandler` middleware and return `success: false` (or `status: "error"`):
```json
{
  "success": false,
  "message": "Error description message",
  "error": "Error details (in development mode only)"
}
```

---

### 1.3 Authentication & Authorization Rules

Authentication is powered by JWT Access and Refresh Tokens passed in the HTTP Authorization header.

| Role | Description | Header Required |
| :--- | :--- | :--- |
| **USER** | Pet owner / Regular app client | `Authorization: Bearer <jwt_access_token>` |
| **OWNER** | Business / Service Provider owner | `Authorization: Bearer <jwt_access_token>` |
| **ADMIN** | System Administrator | `Authorization: Bearer <jwt_access_token>` |
| **SUPER_ADMIN** | Root System Administrator | `Authorization: Bearer <jwt_access_token>` |
| **PUBLIC** | Unauthenticated endpoints | None |

---

## 2. Authentication API (`/api/auth`)

### 2.1 User / Owner Registration
- **Method & Route**: `POST /api/auth/register`
- **Auth Level**: Public
- **Description**: Registers a new User or Owner by creating a temporary user record (`TempUser`) and sending a 6-digit OTP verification code via email.
- **Request Payload**:
```json
{
  "name": "John Doe",
  "email": "user@example.com",
  "phone": "+1234567890",
  "password": "Password123!",
  "confirmPassword": "Password123!",
  "role": "USER" // Allowed: "USER", "OWNER"
}
```
- **Responses**:
  - `201 Created`:
    ```json
    {
      "success": true,
      "message": "Please verify your email to complete registration",
      "email": "user@example.com"
    }
    ```
  - `400 Bad Request`: Password mismatch or invalid role.
  - `409 Conflict`: User or Owner email already exists.
- **Dataflow**:
  1. Validate `password === confirmPassword` and `role in ['USER', 'OWNER']`.
  2. Query `User` and `Owner` collections for existing `email`.
  3. Delete any previous pending record in `TempUser`.
  4. Hash password using `bcrypt` (10 rounds).
  5. Generate OTP verification code using `tokenService.generateVerificationCode()`.
  6. Save `TempUser` with 10-minute code expiry.
  7. Dispatch OTP code via `emailService.sendVerificationCode(email, code)`.

---

### 2.2 Verify Email OTP
- **Method & Route**: `POST /api/auth/verify-email`
- **Auth Level**: Public
- **Description**: Validates the 6-digit OTP code sent to `TempUser`, migrates data into main `User` or `Owner` collection, marks account as verified, and returns JWT tokens.
- **Request Payload**:
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```
- **Responses**:
  - `200 OK`:
    ```json
    {
      "success": true,
      "message": "Email verified successfully. You are now logged in.",
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi...",
      "user": {
        "id": "64f1a2...",
        "name": "John Doe",
        "email": "user@example.com"
      }
    }
    ```
  - `400 Bad Request`: Code invalid or expired.
  - `404 Not Found`: No pending verification for email.
- **Dataflow**:
  1. Find `TempUser` by `email`.
  2. Verify `code` match and `expiresAt > Date.now()`.
  3. Instantiate `User` or `Owner` document based on `tempUser.role` with `isVerified: true`.
  4. Save document & delete `TempUser` document.
  5. Asynchronously send Welcome Email via `emailService.sendWelcomeEmail()`.
  6. Issue JWT Access (15m/1d) and Refresh (7d) tokens.

---

### 2.3 User / Owner / Admin Login
- **Method & Route**: `POST /api/auth/login`
- **Auth Level**: Public
- **Description**: Authenticates User, Owner, Admin, or SuperAdmin credentials and returns access/refresh JWT tokens.
- **Request Payload**:
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```
- **Responses**:
  - `200 OK`:
    ```json
    {
      "success": true,
      "message": "Login successful",
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi...",
      "user": {
        "id": "64f1a2...",
        "name": "John Doe",
        "email": "user@example.com",
        "role": "USER"
      }
    }
    ```
  - `401 Unauthorized`: Invalid email or password.
  - `403 Forbidden`: Email not verified.
  - `404 Not Found`: User not found.
- **Dataflow**:
  1. Query `User`, `Owner`, and `Admin` collections for `email` selecting `+password`.
  2. Verify account exists and `isVerified === true`.
  3. Validate password using `bcrypt.compare(password, hash)`.
  4. Generate and return JWT access and refresh tokens.

---

### 2.4 Forgot Password
- **Method & Route**: `POST /api/auth/forgot-password`
- **Auth Level**: Public
- **Request Payload**:
```json
{
  "email": "user@example.com"
}
```
- **Responses**: `200 OK` on success, `404 Not Found` if email not in DB.
- **Dataflow**: Finds user across `User`/`Owner`/`Admin`, stores `passwordResetCode` with 10m expiry, and sends reset code via Nodemailer.

---

### 2.5 Reset Password
- **Method & Route**: `POST /api/auth/reset-password`
- **Auth Level**: Public
- **Request Payload**:
```json
{
  "email": "user@example.com",
  "password": "NewPassword123!",
  "confirmPassword": "NewPassword123!"
}
```
- **Responses**: `200 OK` on success.
- **Dataflow**: Verifies passwords match, hashes new password with bcrypt, updates password on `User`/`Owner`/`Admin` document, and clears reset code.

---

### 2.6 Resend Verification Code & Password Reset Code
- **Method & Routes**:
  - `POST /api/auth/resend-verification-code`
  - `POST /api/auth/resend-password-reset-code`
- **Auth Level**: Public
- **Request Payload**: `{ "email": "user@example.com" }`
- **Responses**: `200 OK` with confirmation message.

---

## 3. Pet Management API (`/api/pet`)

### 3.1 Create Pet
- **Method & Route**: `POST /api/pet/create`
- **Auth Level**: `USER`
- **Content-Type**: `multipart/form-data`
- **Request Payload**:
  - `name` (string, required)
  - `type` (string, required: e.g. "Dog", "Cat")
  - `breed` (string)
  - `age` (number)
  - `weight` (number)
  - `gender` (string: "MALE", "FEMALE")
  - `petPhoto` (File upload: image)
- **Responses**: `201 Created` with saved pet object.
- **Dataflow**:
  1. `authenticateUser` verifies token & sets `req.user.id`.
  2. `upload.single('petPhoto')` uploads photo to local `/uploads` or S3.
  3. Create `Pet` document bound to `userId: req.user.id`.
  4. Push pet `_id` to `User.pets` array and save.

---

### 3.2 Get All Pets for Logged-In User
- **Method & Route**: `GET /api/pet/get`
- **Auth Level**: `USER`
- **Query Filter Options**:
  - `page` (number, default: 1)
  - `limit` (number, default: 10)
  - `search` (string)
- **Responses**: `200 OK` with paginated array of user's pets.

---

### 3.3 Get Pet Details
- **Method & Route**: `GET /api/pet/get/:petId`
- **Auth Level**: `USER`
- **Path Parameter**: `petId` (MongoDB ObjectId)
- **Responses**: `200 OK` with pet document.

---

### 3.4 Update Pet
- **Method & Route**: `PUT /api/pet/update/:petId`
- **Auth Level**: `USER`
- **Content-Type**: `multipart/form-data`
- **Payload**: Any pet fields to update + optional `petPhoto`.
- **Dataflow**: Replaces file on S3/local storage if new file provided, updates Mongoose document.

---

### 3.5 Delete Pet
- **Method & Route**: `DELETE /api/pet/delete/:petId`
- **Auth Level**: `USER`
- **Responses**: `200 OK`
- **Dataflow**: Deletes image file, removes `petId` from `User.pets` array, and removes `Pet` document.

---

## 4. User Profile API (`/api/user`)

### 4.1 Get Profile Details
- **Method & Route**: `GET /api/user/get-profile`
- **Auth Level**: `USER`
- **Response**: `200 OK` returning User profile populated with pet details.

---

### 4.2 Update Profile
- **Method & Route**: `PUT /api/user/update-profile`
- **Auth Level**: `USER`
- **Content-Type**: `multipart/form-data`
- **Payload**: `name`, `phone`, `address`, `profilePic` (File)
- **Response**: `200 OK` with updated profile.

---

### 4.3 Change Password
- **Method & Route**: `PUT /api/user/change-password`
- **Auth Level**: `USER` / `OWNER`
- **Request Payload**:
```json
{
  "oldPassword": "CurrentPassword123!",
  "newPassword": "NewPassword123!",
  "confirmPassword": "NewPassword123!"
}
```

---

### 4.4 Get My Bookings
- **Method & Route**: `GET /api/user/get-my-bookings`
- **Auth Level**: `USER`
- **Query Filters**: `page`, `limit`, `bookingStatus`
- **Response**: Returns user's bookings populated with service & business details.

---

## 5. Owner & Business API (`/api/owner` & `/api/business`)

### 5.1 Create Business Profile
- **Method & Route**: `POST /api/business/create`
- **Auth Level**: `OWNER`
- **Content-Type**: `multipart/form-data`
- **Payload**:
  - `businessName` (string, required)
  - `location` (string)
  - `latitude` (number/string)
  - `longitude` (number/string)
  - `phone` (string)
  - `description` (string)
  - `shopLogo` (File, max 1)
  - `shopPic` (Files, max 2)
- **Responses**: `201 Created`
- **Dataflow**: Creates `Business` document with `ownerId: req.owner.id`, links business ID to `Owner` document.

---

### 5.2 Get Owner Businesses
- **Method & Route**: `GET /api/owner/get-owner-businesses`
- **Auth Level**: `OWNER`
- **Response**: `200 OK` with business documents and associated services.

---

### 5.3 RevenueCat Identity Association
- **Method & Route**: `POST /api/owner/revenuecat-identify`
- **Auth Level**: `OWNER`
- **Payload**: `{ "appUserId": "rc_user_12345" }`
- **Response**: `200 OK`
- **Dataflow**: Stores RevenueCat app user ID against `Owner` record for subscription tracking.

---

## 6. Business Services API (`/api/services`)

### 6.1 Create Service (Multi-Day Off Day Support)
- **Method & Route**: `POST /api/services/createService`
- **Auth Level**: `OWNER`
- **Content-Type**: `multipart/form-data` or `application/json`
- **Request Payload**:
```json
{
  "serviceType": "VET", // Allowed: "VET", "SHOP", "HOTEL", "TRAINING", "FRIENDLY", "GROOMING"
  "serviceName": "Paws Veterinary Clinic",
  "location": "123 Pet St, NY",
  "openingTime": "09:00 AM",
  "closingTime": "06:00 PM",
  "offDay": ["Saturday", "Sunday"], // Multi-select array, JSON string '["Saturday", "Sunday"]', or comma-separated "Saturday, Sunday"
  "providings": ["Vaccination", "General Checkup"], // Array or JSON string
  "phone": "+1987654321",
  "websiteLink": "https://example.com",
  "latitude": "40.7128",
  "longitude": "-74.0060"
}
```
- **Files**: `servicesImages` (Single file upload)
- **Responses**:
  - `201 Created`:
    ```json
    {
      "success": true,
      "message": "Service created successfully",
      "service": {
        "_id": "651a1f2e...",
        "serviceType": "VET",
        "serviceName": "Paws Veterinary Clinic",
        "location": "123 Pet St, NY",
        "openingTime": "09:00 AM",
        "closingTime": "06:00 PM",
        "offDay": ["Saturday", "Sunday"],
        "providings": ["Vaccination", "General Checkup"],
        "phone": "+1987654321",
        "websiteLink": "https://example.com",
        "servicesImages": "uploads/servicesImages-12345.jpg",
        "businessId": "651a1e00...",
        "shopLogo": "uploads/shopLogo-999.jpg",
        "isOpenNow": false,
        "createdAt": "2026-08-30T12:00:00.000Z",
        "updatedAt": "2026-08-30T12:00:00.000Z"
      }
    }
    ```
  - `400 Bad Request`: Owner already has a service of this type under the business.
- **Dataflow & Edge-case Handling**:
  1. `parseArrayField` sanitizes `offDay` into a trimmed `[String]` array whether passed as an array `["Saturday", "Sunday"]`, JSON string `'["Saturday","Sunday"]'`, comma-separated `"Saturday, Sunday"`, or single string `"Sunday"`.
  2. Validates unique `serviceType` per business using `.lean()` for high performance.
  3. Inserts `Service` document directly.
  4. Pushes `service._id` into `Business.services` using fast `findByIdAndUpdate`.
  5. Fires Admin Notification asynchronously without blocking API latency.

---

### 6.2 Update Service
- **Method & Route**: `PUT /api/services/updateService/:id`
- **Auth Level**: `OWNER`
- **Path Parameter**: `id` (Service MongoDB ObjectId)
- **Content-Type**: `multipart/form-data` or `application/json`
- **Request Payload** (All fields optional):
```json
{
  "serviceName": "Paws Advanced Vet & Dental",
  "location": "456 Bark Ave, NY",
  "openingTime": "08:00 AM",
  "closingTime": "07:00 PM",
  "offDay": ["Sunday", "Wednesday"], // Updated off days list
  "providings": ["Vaccination", "Dental Care", "Surgeries"],
  "phone": "+1987654321",
  "websiteLink": "https://pawsadvanced.com",
  "latitude": "40.7300",
  "longitude": "-73.9900"
}
```
- **Files**: `servicesImages` (Optional single file upload)
- **Responses**:
  - `200 OK`:
    ```json
    {
      "success": true,
      "message": "Service updated successfully",
      "service": {
        "_id": "651a1f2e...",
        "serviceName": "Paws Advanced Vet & Dental",
        "offDay": ["Sunday", "Wednesday"],
        "providings": ["Vaccination", "Dental Care", "Surgeries"],
        "isOpenNow": true
      }
    }
    ```
- **Dataflow**: Finds existing service, safely replaces file in storage if new image uploaded, sanitizes `offDay` and `providings` arrays, saves updated document, returns updated service object.

---

### 6.3 Get Owner Services
- **Method & Route**: `GET /api/services/getServices`
- **Auth Level**: `OWNER`
- **Query Filter Options**:
  - `page` (number, default: 1)
  - `limit` (number, default: 10)
- **Response**: `200 OK` returning paginated owner services with calculated `isOpenNow` virtual status (evaluating current day against multi-day `offDay` list).

---

### 6.4 Get Service By ID
- **Method & Route**: `GET /api/services/getServicesById/:id`
- **Auth Level**: Public / Owner / User
- **Response**: `200 OK` returning single service populated with customer reviews, average rating calculation (`avgRating`), and `isOpenNow` boolean.

---

### 6.2 Get Nearby Services (Geospatial Haversine Search)
- **Method & Route**: `GET /api/services/nearby`
- **Auth Level**: Public
- **Query Parameters & Filters**:
  - `type` (string, **required**: e.g., `CLINIC`, `GROOMING`, `HOTEL`)
  - `lat` (number, **required**: User latitude, e.g. `40.7128`)
  - `long` (number, **required**: User longitude, e.g. `-74.0060`)
  - `radiusKm` (number, default: `10`)
- **Responses**:
  - `200 OK`:
    ```json
    {
      "success": true,
      "message": "Nearby services fetched successfully",
      "count": 5,
      "services": [
        {
          "_id": "651a...",
          "serviceName": "Central Pet Clinic",
          "serviceType": "CLINIC",
          "distanceKm": 2.45,
          "isOpenNow": true,
          "latitude": "40.7200",
          "longitude": "-74.0100"
        }
      ]
    }
    ```
- **Dataflow (MongoDB Aggregation Pipeline)**:
  1. `$match` `serviceType == UPPER(type)` and `isActive == true` with valid `latitude`/`longitude`.
  2. `$addFields` converts string coordinates to double radians.
  3. Computes Haversine spherical distance equation in kilometers ($R=6371$).
  4. Filters `$match` `distanceKm <= radiusKm`.
  5. `$sort` by `distanceKm` ascending, limit 100 results.
  6. Maps `isOpenNow` virtual status using business opening/closing hours and current day.

---

## 7. Booking & Appointment API (`/api/booking`)

### 7.1 Create Booking
- **Method & Route**: `POST /api/booking/create-booking`
- **Auth Level**: `USER`
- **Request Payload**:
```json
{
  "serviceId": "651a...",
  "businessId": "651b...",
  "petId": "651c...",
  "bookingDate": "2026-09-15",
  "bookingTime": "10:30 AM",
  "bookingStatus": "PENDING",
  "notes": "Regular health checkup",
  "selectedService": "Vaccination",
  "checkInDate": "2026-09-15",  // For Hotel services
  "checkOutDate": "2026-09-18", // For Hotel services
  "checkInTime": "12:00 PM",
  "checkOutTime": "11:00 AM"
}
```
- **Responses**:
  - `201 Created` with booking object.
  - `404 Not Found` if service, pet, or business is invalid, or if `bookingDate` lands on service `offDay`.
- **Dataflow**:
  1. Checks if booking day matches `service.offDay`.
  2. Validates existence of `Business`, `Service`, `Pet`, and `Owner`.
  3. Creates `Booking` record.
  4. Pushes `booking._id` into `Owner.bookings` and `Service.bookings` arrays.
  5. Fires real-time push notifications to both User and Owner via `postNotification()`.

---

### 7.2 Get Bookings (User View)
- **Method & Route**: `GET /api/booking/get-bookings`
- **Auth Level**: `USER`
- **Query Filter Options**:
  - `page` (number)
  - `limit` (number)
  - `bookingStatus` (string: `PENDING`, `APPROVED`, `COMPLETED`, `CANCELLED`)
  - `search` (string: searches notes or status)
  - `sortBy`, `sortOrder`
- **Responses**: `200 OK` with paginated list populated with service and business information.

---

### 7.3 Update Booking Status (Owner Action)
- **Method & Route**: `PUT /api/booking/:id/status`
- **Auth Level**: `OWNER`
- **Path Parameter**: `id` (Booking ID)
- **Request Payload**:
```json
{
  "status": "APPROVED", // Allowed: "APPROVED", "COMPLETED", "CANCELLED"
  "cancellationReason": "Owner unavailable on selected date" // Required if status is CANCELLED
}
```
- **Responses**: `200 OK`
- **Dataflow**: Verifies owner ownership of booking, updates status, sends push notification to User.

---

### 7.4 Cancel Booking (User Action)
- **Method & Route**: `PUT /api/booking/:id/cancel`
- **Auth Level**: `USER`
- **Request Payload**:
```json
{
  "cancellationReason": "Schedule conflict"
}
```
- **Responses**: `200 OK` with updated status `CANCELLED` and notification dispatched to Owner.

---

### 7.5 Owner Booking Overview & Analytics
- **Method & Route**: `GET /api/booking/get-booking-overview`
- **Auth Level**: `OWNER`
- **Query Filter Options**:
  - `viewType` (string: `"monthly"` or `"weekly"`, default: `"monthly"`)
  - `serviceId` (string, optional: filter by specific service)
  - `status` (string: `PENDING`, `APPROVED`, `COMPLETED`, `CANCELLED`)
  - `month` (number: 1-12)
  - `year` (number: e.g. 2026)
  - `week` (number: 1-52)
  - `weekStart` (string: ISO date)
- **Responses**:
  - `200 OK`:
    ```json
    {
      "success": true,
      "viewType": "monthly",
      "dateRange": {
        "month": 9,
        "monthName": "September",
        "year": 2026,
        "start": "2026-09-01",
        "end": "2026-09-30"
      },
      "totalBookings": 45,
      "stats": {
        "total": 45,
        "pending": 10,
        "approved": 20,
        "completed": 12,
        "rejected": 1,
        "cancelled": 2
      },
      "bookings": [ ... ]
    }
    ```

---

## 8. Reviews API (`/api/review`)

### 8.1 Create Review
- **Method & Route**: `POST /api/review/create`
- **Auth Level**: `USER`
- **Request Payload**:
```json
{
  "serviceId": "651a...",
  "businessId": "651b...",
  "rating": 5, // Number 1 to 5
  "comment": "Excellent grooming service for my dog!"
}
```
- **Responses**: `201 Created`
- **Dataflow**: Saves `Review` document, pushes review ID into `Service.reviews` and `Business.reviews`.

---

### 8.2 Get Reviews by Service
- **Method & Route**: `GET /api/review/get-all-reviews-by-service/:id`
- **Auth Level**: Public
- **Path Parameter**: `id` (Service ID)
- **Response**: `200 OK` with populated user ratings & comments.

---

## 9. User Home Page & Global Search API (`/api/user-home-page`)

### 9.1 Global Service Search
- **Method & Route**: `GET /api/user-home-page/services/search`
- **Auth Level**: Public / User
- **Query Filter Options**:
  - `q` (string: Search term across service name, location, and providings)
  - `serviceType` (string: `CLINIC`, `GROOMING`, `HOTEL`, `TRAINING`)
  - `location` (string: Regex location filter)
  - `isOpen` (boolean: `true` to filter only currently open businesses)
  - `sortBy` (string: `avgRating`, `totalReviews`, `totalBookings`, `serviceName`)
  - `sortOrder` (string: `asc` or `desc`)
  - `page` (number, default: 1)
  - `limit` (number, default: 10)
- **Responses**:
  - `200 OK`:
    ```json
    {
      "success": true,
      "message": "Services fetched successfully",
      "services": [ ... ],
      "currentPage": 1,
      "pageSize": 10,
      "total": 24
    }
    ```

---

### 9.2 Complete Home Page Aggregation
- **Method & Route**: `GET /api/user-home-page/getAllUserHomePageData`
- **Auth Level**: `USER`
- **Query Parameters**:
  - `type` (string, optional: filter service type)
  - `id` (string, optional: featured advertisement ID)
- **Response Structure**:
```json
{
  "success": true,
  "data": {
    "services": [ ... ],
    "appointments": [ ... ],
    "pets": {
      "total": 2,
      "list": [ ... ]
    },
    "advertisements": {
      "featured": [ ... ],
      "details": null
    }
  }
}
```

---

## 10. Conversation & Chat API (`/api/chat`)

### 10.1 Get Conversation List
- **Method & Route**: `GET /api/chat/get-conversation-list`
- **Auth Level**: `USER` / `OWNER`
- **Response**: Returns all chat conversations with last message, unread counts, and user details.

---

### 10.2 Send Media in Chat
- **Method & Route**: `POST /api/chat/chat-images-video`
- **Auth Level**: `USER` / `OWNER`
- **Content-Type**: `multipart/form-data`
- **Payload**:
  - `chatImage` (Files, max 10)
  - `chatVideo` (File, max 1)
  - `chatVideoCover` (File, max 1)
- **Response**: `200 OK` with uploaded file URLs.

---

### 10.3 Block / Unblock User
- **Method & Routes**:
  - `POST /api/chat/block/:targetUserId`
  - `POST /api/chat/unblock/:targetUserId`
  - `POST /api/chat/block-toggle/:conversationId`
- **Auth Level**: `USER` / `OWNER`

---

## 11. Notification API (`/api/notifications`)

### 11.1 Get Notifications
- **Method & Route**: `GET /api/notifications`
- **Auth Level**: `USER` / `OWNER`
- **Query Filters**: `page`, `limit`
- **Response**: Returns notifications list sorted by creation date.

---

### 11.2 Mark Notifications Read
- **Method & Routes**:
  - `PUT /api/notifications/:id/read` (Single)
  - `PUT /api/notifications/read-all` (All)

---

## 12. Admin Dashboard API (`/api/dashboard` & `/api/admin`)

### 12.1 System Statistics Overview
- **Method & Route**: `GET /api/dashboard/stats`
- **Auth Level**: `ADMIN` / `SUPER_ADMIN`
- **Response**:
```json
{
  "success": true,
  "stats": {
    "totalUsers": 1250,
    "totalOwners": 140,
    "totalPets": 1890,
    "totalBookings": 4500,
    "activeAds": 12
  }
}
```

---

### 12.2 Block / Unblock Users & Business Owners
- **Method & Routes**:
  - `PUT /api/dashboard/pet-owner/:id/block`
  - `PUT /api/dashboard/pet-owner/:id/unblock`
  - `PUT /api/dashboard/business-owner/:id/block`
  - `PUT /api/dashboard/business-owner/:id/unblock`
- **Auth Level**: `ADMIN` / `SUPER_ADMIN`

---

### 12.3 Admin Role Management
- **Method & Routes**:
  - `POST /api/admin/make-admin` (SuperAdmin only)
  - `POST /api/admin/remove-admin` (SuperAdmin only)
  - `POST /api/admin/make-super-admin`

---

## 13. Webhook API (`/api/webhooks`)

### 13.1 RevenueCat In-App Purchase Webhook
- **Method & Route**: `POST /api/webhooks/revenuecat`
- **Auth Level**: Public (Protected via RevenueCat signature / token verification)
- **Dataflow**: Receives purchase, renewal, cancellation, and expiration events from RevenueCat and updates `Owner` subscription status accordingly.

---
