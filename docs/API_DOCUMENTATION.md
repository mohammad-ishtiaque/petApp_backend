# Pet App Backend - Complete API Endpoints Specification & Documentation

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
|  - Auth Middlewares (`authenticateUser`, `authenticateOwner`, `authenticateAdmin`)|
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

### 1.2 Global Response Standards & Formats

#### Standard Success Response
Most single item/action endpoints return a response structured like:
```json
{
  "success": true,
  "message": "Operation description",
  "data": { ... }
}
```

#### Standard Paginated GET List Response
GET endpoints returning lists of resources implement pagination metadata. Depending on the module's controller implementation, pagination metadata follows one of the standard schema structures below:

**Schema A (`QueryBuilder` Standard - e.g., `/api/booking/get-bookings`):**
```json
{
  "success": true,
  "message": "Bookings retrieved successfully",
  "bookings": [ ... ],
  "pagination": {
    "total": 100,
    "totalPage": 10,
    "currentPage": 1,
    "limit": 10
  }
}
```

**Schema B (Module Standard - e.g., `/api/services/getServices`, `/api/dashboard/pet-owners`):**
```json
{
  "success": true,
  "message": "Services fetched successfully",
  "services": [ ... ],
  "total": 100,
  "currentPage": 1,
  "pageSize": 10,
  "startIndex": 0,
  "endIndex": 10
}
```

**Schema C (Record Standard - e.g., `/api/pet/get-medical-history/:id`, `/api/pet-medical-history/get/:petId`):**
```json
{
  "success": true,
  "message": "Medical history fetched successfully",
  "page": 1,
  "limit": 10,
  "totalPages": 10,
  "totalRecords": 100,
  "petMedicalHistory": [ ... ]
}
```

#### Standard Error Response
All thrown or unhandled errors are passed to the global `errorHandler` middleware:
```json
{
  "success": false,
  "message": "Error description message",
  "error": "Detailed error object (development environment)"
}
```

---

### 1.3 Role-Based Access Control (RBAC)

| Role | Header Required | Description |
| :--- | :--- | :--- |
| **PUBLIC** | None | Unauthenticated public endpoints |
| **USER** | `Authorization: Bearer <jwt_access_token>` | Authenticated pet owner / app end-user |
| **OWNER** | `Authorization: Bearer <jwt_access_token>` | Authenticated business / service provider owner |
| **USER / OWNER** | `Authorization: Bearer <jwt_access_token>` | Endpoint accessible by both Users and Owners |
| **ADMIN** | `Authorization: Bearer <jwt_access_token>` | Authenticated system administrator |
| **SUPER_ADMIN** | `Authorization: Bearer <jwt_access_token>` | Authenticated root system administrator |

---

## 2. System & Health API

### 2.1 Health Check
- **Route**: `GET /`
- **Auth Level**: Public
- **Response**: `200 OK`
```json
{
  "status": "success",
  "message": "Snasaland Server is healthy"
}
```

---

## 3. Authentication API (`/api/auth`)

### 3.1 Register User / Owner
- **Route**: `POST /api/auth/register`
- **Auth Level**: Public
- **Headers**: `Content-Type: application/json`
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
  - `409 Conflict`: User or Owner with email already exists.

---

### 3.2 Verify Email OTP
- **Route**: `POST /api/auth/verify-email`
- **Auth Level**: Public
- **Headers**: `Content-Type: application/json`
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
  - `400 Bad Request`: Invalid or expired verification code.
  - `404 Not Found`: No pending verification found for email.

---

### 3.3 User / Owner / Admin Login
- **Route**: `POST /api/auth/login`
- **Auth Level**: Public
- **Headers**: `Content-Type: application/json`
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
  - `401 Unauthorized`: Invalid credentials.
  - `403 Forbidden`: Email not verified.
  - `404 Not Found`: User not found.

---

### 3.4 Forgot Password
- **Route**: `POST /api/auth/forgot-password`
- **Auth Level**: Public
- **Headers**: `Content-Type: application/json`
- **Request Payload**:
```json
{
  "email": "user@example.com"
}
```
- **Responses**:
  - `200 OK`: `{ "success": true, "message": "Password reset code sent to your email." }`
  - `404 Not Found`: User not found.

---

### 3.5 Reset Password
- **Route**: `POST /api/auth/reset-password`
- **Auth Level**: Public
- **Headers**: `Content-Type: application/json`
- **Request Payload**:
```json
{
  "email": "user@example.com",
  "password": "NewPassword123!",
  "confirmPassword": "NewPassword123!"
}
```
- **Responses**:
  - `200 OK`: `{ "success": true, "message": "Password reset successful." }`
  - `400 Bad Request`: Passwords do not match.

---

### 3.6 Verify Code
- **Route**: `POST /api/auth/verify-code`
- **Auth Level**: Public
- **Headers**: `Content-Type: application/json`
- **Request Payload**:
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```
- **Responses**:
  - `200 OK`: `{ "success": true, "message": "Verification code is valid." }`
  - `400 Bad Request`: Invalid or expired code.

---

### 3.7 Resend Verification Code
- **Route**: `POST /api/auth/resend-verification-code`
- **Auth Level**: Public
- **Headers**: `Content-Type: application/json`
- **Request Payload**: `{ "email": "user@example.com" }`
- **Responses**: `200 OK`

---

### 3.8 Resend Password Reset Code
- **Route**: `POST /api/auth/resend-password-reset-code`
- **Auth Level**: Public
- **Headers**: `Content-Type: application/json`
- **Request Payload**: `{ "email": "user@example.com" }`
- **Responses**: `200 OK`

---

### 3.9 Logout
- **Route**: `POST /api/auth/logout`
- **Auth Level**: Public / Authenticated
- **Headers**: `Content-Type: application/json`
- **Request Payload**: None
- **Responses**:
  - `200 OK`:
    ```json
    {
      "success": true,
      "message": "Logged out successfully"
    }
    ```

---

## 4. Pet Management API (`/api/pet`)

### 4.1 Create Pet
- **Route**: `POST /api/pet/create`
- **Auth Level**: USER
- **Headers**: `Content-Type: multipart/form-data`
- **Request Payload**:
  - `name` (string, required)
  - `animalType` (string, required: e.g. "Dog", "Cat")
  - `breed` (string)
  - `age` (number)
  - `gender` (string: "MALE", "FEMALE")
  - `weight` (number)
  - `height` (number)
  - `color` (string)
  - `description` (string)
  - `petPhoto` (file upload: image)
- **Response**:
  - `201 Created`:
    ```json
    {
      "success": true,
      "message": "Pet created successfully",
      "pet": {
        "_id": "651a...",
        "name": "Buddy",
        "animalType": "Dog",
        "breed": "Golden Retriever",
        "age": 3,
        "gender": "MALE",
        "weight": 25,
        "height": 60,
        "color": "Golden",
        "petPhoto": "uploads/petPhoto-123.jpg",
        "userId": "64f1..."
      }
    }
    ```

---

### 4.2 Get All Pets for Logged-In User
- **Route**: `GET /api/pet/get`
- **Auth Level**: USER
- **Query Filters**: None
- **Response**: `200 OK` returning list of pets owned by user.

---

### 4.3 Get Pet Details By ID
- **Route**: `GET /api/pet/get/:petId`
- **Auth Level**: USER
- **Path Parameter**: `petId` (MongoDB ObjectId)
- **Response**: `200 OK` returning pet document and associated `petMedicalHistory` array.

---

### 4.4 Update Pet
- **Route**: `PUT /api/pet/update/:petId`
- **Auth Level**: USER
- **Headers**: `Content-Type: multipart/form-data`
- **Path Parameter**: `petId` (MongoDB ObjectId)
- **Request Payload**: Any pet fields to update + optional `petPhoto` file.
- **Response**: `200 OK` with updated pet object.

---

### 4.5 Delete Pet
- **Route**: `DELETE /api/pet/delete/:petId`
- **Auth Level**: USER
- **Path Parameter**: `petId` (MongoDB ObjectId)
- **Response**: `200 OK` `{ "success": true, "message": "Pet deleted successfully" }`

---

### 4.6 Get Pet Medical History By Pet ID
- **Route**: `GET /api/pet/get-medical-history/:id`
- **Auth Level**: USER
- **Path Parameter**: `id` (Pet ObjectId)
- **Query Parameters / Filter Options**:
  - `treatmentStatus` (string, optional: e.g. "COMPLETED", "ONGOING", "PENDING")
  - `page` (number, default: `1`)
  - `limit` (number, default: `10`)
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Medical history fetched successfully",
  "totalRecords": 15,
  "currentPage": 1,
  "totalPages": 2,
  "data": [
    {
      "_id": "652b...",
      "petId": "651a...",
      "treatmentType": "Vaccination",
      "treatmentName": "Rabies Booster",
      "doctorName": "Dr. Smith",
      "treatmentDate": "2026-08-15",
      "treatmentStatus": "COMPLETED"
    }
  ]
}
```

---

## 5. User Profile API (`/api/user`)

### 5.1 Get User Profile
- **Route**: `GET /api/user/get-profile`
- **Auth Level**: USER
- **Response**: `200 OK` returning User profile document (excluding password) and associated `pet` array.

---

### 5.2 Update User Profile
- **Route**: `PUT /api/user/update-profile`
- **Auth Level**: USER
- **Headers**: `Content-Type: multipart/form-data`
- **Request Payload**:
  - `name` (string)
  - `address` (string)
  - `phone` (string)
  - `profilePic` (file upload: image)
- **Response**: `200 OK` with updated user object.

---

### 5.3 Change Password
- **Route**: `PUT /api/user/change-password`
- **Auth Level**: USER / OWNER
- **Headers**: `Content-Type: application/json`
- **Request Payload**:
```json
{
  "oldPassword": "CurrentPassword123!",
  "newPassword": "NewPassword123!",
  "confirmPassword": "NewPassword123!"
}
```
- **Response**: `200 OK` `{ "success": true, "message": "Password changed successfully" }`

---

### 5.4 Get My Pets
- **Route**: `GET /api/user/my-pets`
- **Auth Level**: USER
- **Response**: `200 OK` returning user's pet list.

---

### 5.5 Delete Account
- **Route**: `DELETE /api/user/delete-account`
- **Auth Level**: USER / OWNER
- **Headers**: `Content-Type: application/json`
- **Request Payload**:
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```
- **Response**: `200 OK` `{ "success": true, "message": "Account deleted successfully" }`

---

### 5.6 Get My Bookings
- **Route**: `GET /api/user/get-my-bookings`
- **Auth Level**: USER
- **Response**: `200 OK` returning array of bookings created by logged in user.

---

## 6. Owner Management API (`/api/owner`)

### 6.1 Get Owner Details
- **Route**: `GET /api/owner/get-owner-details`
- **Auth Level**: OWNER
- **Response**: `200 OK` returning owner document and associated business.

---

### 6.2 Update Owner Profile
- **Route**: `PUT /api/owner/update-owner-details`
- **Auth Level**: OWNER
- **Headers**: `Content-Type: multipart/form-data`
- **Request Payload**: `name`, `address`, `phone`, `profilePic` (file)
- **Response**: `200 OK` with updated owner profile.

---

### 6.3 Set RevenueCat Identity
- **Route**: `POST /api/owner/revenuecat-identify`
- **Auth Level**: OWNER
- **Headers**: `Content-Type: application/json`
- **Request Payload**: `{ "appUserId": "rc_user_12345" }`
- **Response**: `200 OK` `{ "success": true, "message": "RevenueCat identity saved successfully", "revenueCatUserId": "rc_user_12345" }`

---

### 6.4 Get Owner Businesses & Services
- **Route**: `GET /api/owner/get-owner-businesses`
- **Auth Level**: OWNER
- **Response**: `200 OK` returning owner's businesses and service documents.

---

### 6.5 Get All Bookings for Owner
- **Route**: `GET /api/owner/get-bookings-by-owner`
- **Auth Level**: OWNER
- **Response**: `200 OK` returning owner's populated bookings array sorted newest first.

---

### 6.6 Get Bookings by Owner with Status & Pagination
- **Route**: `GET /api/owner/get-bookings-by-owner-with-status`
- **Auth Level**: OWNER
- **Query Filter Options**:
  - `status` (string, optional: `"PENDING"`, `"APPROVED"`, `"COMPLETED"`, `"REJECTED"`, `"CANCELLED"`)
  - `page` (number, default: `1`)
  - `limit` (number, default: `10`)
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Bookings fetched successfully",
  "bookings": [ ... ],
  "totalPages": 5,
  "totalBookings": 48,
  "currentPage": 1,
  "limit": 10
}
```

---

### 6.7 Update Booking Status (Owner)
- **Route**: `PUT /api/owner/update-booking-status/:id`
- **Auth Level**: OWNER
- **Path Parameter**: `id` (Booking ObjectId)
- **Headers**: `Content-Type: application/json`
- **Request Payload**:
```json
{
  "status": "APPROVED", // Allowed: "APPROVED", "COMPLETED", "REJECTED"
  "cancellationReason": "Optional rejection reason if status is REJECTED"
}
```
- **Response**: `200 OK`

---

### 6.8 Get Bookings by Service Type
- **Route**: `GET /api/owner/get-booking-by-sesrviceType`
- **Auth Level**: OWNER
- **Request Payload / Query**: `{ "type": "VET" }` (Allowed: `"VET"`, `"SHOP"`, `"HOTEL"`, `"TRAINING"`, `"FRIENDLY"`, `"GROOMING"`)
- **Response**: `200 OK` returning bookings count and array.

---

### 6.9 Get All Booked Pets
- **Route**: `GET /api/owner/get-all-pets-who-booked`
- **Auth Level**: OWNER
- **Response**: `200 OK` returning unique pets who have booked with the owner, populated with user info and medical history records.

---

### 6.10 Get Pet Details By Pet ID (Owner View)
- **Route**: `GET /api/owner/get-pet-details-by-pet-id/:id`
- **Auth Level**: OWNER
- **Path Parameter**: `id` (Pet ObjectId)
- **Response**: `200 OK` returning pet document with detailed medical history.

---

### 6.11 Get Owner Service Reviews with Averages
- **Route**: `GET /api/owner/get-reviews-withAvg`
- **Auth Level**: OWNER
- **Response**: `200 OK` returning service reviews breakdown and calculated average ratings.

---

## 7. Business Management API (`/api/business`)

### 7.1 Create Business
- **Route**: `POST /api/business/create`
- **Auth Level**: OWNER
- **Headers**: `Content-Type: multipart/form-data`
- **Request Payload**:
  - `businessName` (string, required)
  - `website` (string)
  - `address` (string)
  - `moreInfo` (string)
  - `shopLogo` (file upload: max 1 image)
  - `shopPic` (file uploads: max 2 images)
- **Response**: `201 Created` with created Business object.

---

### 7.2 Get Owner Business Details
- **Route**: `GET /api/business/get`
- **Auth Level**: OWNER
- **Query Filter Options**: QueryBuilder filter parameters.
- **Response**: `200 OK` returning owner's business profile and associated service types.

---

### 7.3 Get Business By ID
- **Route**: `GET /api/business/get/:id`
- **Auth Level**: Public
- **Path Parameter**: `id` (Business ObjectId)
- **Response**: `200 OK`

---

### 7.4 Update Business
- **Route**: `PUT /api/business/update/:id`
- **Auth Level**: OWNER
- **Path Parameter**: `id` (Business ObjectId)
- **Headers**: `Content-Type: multipart/form-data`
- **Request Payload**: `businessName`, `website`, `address`, `moreInfo`, `shopLogo`, `shopPic`
- **Response**: `200 OK`

---

### 7.5 Delete Business
- **Route**: `DELETE /api/business/delete/:id`
- **Auth Level**: OWNER
- **Path Parameter**: `id` (Business ObjectId)
- **Response**: `200 OK`

---

### 7.6 Get All Businesses (Admin Overview)
- **Route**: `GET /api/business/get-all`
- **Auth Level**: Public / ADMIN
- **Response**: `200 OK` returning list of all businesses.

---

## 8. Business Services API (`/api/services`)

### 8.1 Create Service
- **Route**: `POST /api/services/createService`
- **Auth Level**: OWNER
- **Headers**: `Content-Type: multipart/form-data` or `application/json`
- **Request Payload**:
```json
{
  "serviceType": "VET", // Allowed: "VET", "SHOP", "HOTEL", "TRAINING", "FRIENDLY", "GROOMING"
  "serviceName": "Paws Vet Clinic",
  "location": "123 Main St, New York, NY",
  "latitude": "40.7128",
  "longitude": "-74.0060",
  "openingTime": "09:00 AM",
  "closingTime": "06:00 PM",
  "offDay": ["Saturday", "Sunday"], // Array, JSON string, or comma-separated string
  "providings": ["Vaccination", "Checkup"],
  "phone": "+1987654321",
  "websiteLink": "https://example.com"
}
```
- **Files**: `servicesImages` (file upload: single image)
- **Responses**:
  - `201 Created`:
    ```json
    {
      "success": true,
      "message": "Service created successfully",
      "service": {
        "_id": "651a...",
        "serviceType": "VET",
        "serviceName": "Paws Vet Clinic",
        "location": "123 Main St, New York, NY",
        "openingTime": "09:00 AM",
        "closingTime": "06:00 PM",
        "offDay": ["Saturday", "Sunday"],
        "providings": ["Vaccination", "Checkup"],
        "servicesImages": "uploads/servicesImages-123.jpg",
        "businessId": "651b...",
        "isOpenNow": false
      }
    }
    ```
  - `400 Bad Request`: Owner already has a service of this type under the business.

---

### 8.2 Get Owner Services
- **Route**: `GET /api/services/getServices`
- **Auth Level**: OWNER
- **Query Filter Options**:
  - `page` (number, default: `1`)
  - `limit` (number, default: `10`)
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Services fetched successfully",
  "services": [ ... ],
  "total": 25,
  "currentPage": 1,
  "pageSize": 10,
  "startIndex": 0,
  "endIndex": 10
}
```

---

### 8.3 Get Service By ID
- **Route**: `GET /api/services/getServicesById/:id`
- **Auth Level**: Public
- **Path Parameter**: `id` (Service ObjectId)
- **Response**: `200 OK` returning service document populated with reviews, `avgRating`, and computed `isOpenNow` status.

---

### 8.4 Update Service
- **Route**: `PUT /api/services/updateService/:id`
- **Auth Level**: OWNER
- **Path Parameter**: `id` (Service ObjectId)
- **Headers**: `Content-Type: multipart/form-data` or `application/json`
- **Request Payload**: Any service fields to update + optional `servicesImages` file.
- **Response**: `200 OK`

---

### 8.5 Delete Service
- **Route**: `DELETE /api/services/deleteService/:id`
- **Auth Level**: OWNER
- **Path Parameter**: `id` (Service ObjectId)
- **Response**: `200 OK`

---

### 8.6 Get Nearby Services (Geospatial Search)
- **Route**: `GET /api/services/nearby`
- **Auth Level**: Public
- **Query Filter Options**:
  - `type` (string, **required**: e.g., `"VET"`, `"GROOMING"`, `"HOTEL"`)
  - `lat` (number, **required**: Latitude coordinate, e.g. `40.7128`)
  - `long` (number, **required**: Longitude coordinate, e.g. `-74.0060`)
  - `radiusKm` (number, default: `10`)
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Nearby services fetched successfully",
  "count": 3,
  "services": [
    {
      "_id": "651a...",
      "serviceName": "Central Vet",
      "serviceType": "VET",
      "distanceKm": 2.45,
      "isOpenNow": true,
      "latitude": "40.7200",
      "longitude": "-74.0100"
    }
  ]
}
```

---

## 9. Advertisement API (`/api/advertisement`)

### 9.1 Add Advertisement
- **Route**: `POST /api/advertisement/add-advertisement`
- **Auth Level**: OWNER
- **Headers**: `Content-Type: multipart/form-data`
- **Request Payload**: `advertisementImg` (files upload: up to 5 images)
- **Response**: `201 Created`

---

### 9.2 Get Owner Advertisements
- **Route**: `GET /api/advertisement/get-ads`
- **Auth Level**: OWNER
- **Response**: `200 OK`

---

### 9.3 Get Advertisements By Business ID
- **Route**: `GET /api/advertisement/get-ads-by-business/:id`
- **Auth Level**: OWNER
- **Path Parameter**: `id` (Business ObjectId)
- **Response**: `200 OK`

---

### 9.4 Update Advertisement Status (Admin)
- **Route**: `PUT /api/advertisement/update-ads-status/:id`
- **Auth Level**: ADMIN / SUPER_ADMIN
- **Path Parameter**: `id` (Advertisement ObjectId)
- **Request Payload**: `{ "status": "ACTIVE" }` // Allowed: `"ACTIVE"`, `"INACTIVE"`, `"PENDING"`
- **Response**: `200 OK`

---

### 9.5 Get All Advertisements (Admin)
- **Route**: `GET /api/advertisement/get-all-ads`
- **Auth Level**: ADMIN / SUPER_ADMIN
- **Response**: `200 OK`

---

### 9.6 Delete Advertisement
- **Route**: `DELETE /api/advertisement/delete-ads/:id`
- **Auth Level**: OWNER
- **Path Parameter**: `id` (Advertisement ObjectId)
- **Response**: `200 OK`

---

## 10. Pet Medical History API (`/api/pet-medical-history`)

### 10.1 Create Pet Medical History
- **Route**: `POST /api/pet-medical-history/create/:petId`
- **Auth Level**: OWNER
- **Path Parameter**: `petId` (Pet ObjectId)
- **Headers**: `Content-Type: application/json`
- **Request Payload**:
```json
{
  "treatmentType": "Vaccination",
  "treatmentDate": "2026-09-01",
  "treatmentName": "Annual Rabies Booster",
  "doctorName": "Dr. Alex Johnson",
  "treatmentDescription": "Administered annual rabies vaccine.",
  "treatmentStatus": "COMPLETED" // Allowed: "COMPLETED", "ONGOING", "PENDING"
}
```
- **Response**: `201 Created`

---

### 10.2 Get Medical History by Treatment Status
- **Route**: `GET /api/pet-medical-history/get/:petId`
- **Auth Level**: USER / OWNER
- **Path Parameter**: `petId` (Pet ObjectId)
- **Query Filter Options**:
  - `treatmentStatus` (string, optional)
  - `page` (number, default: `1`)
  - `limit` (number, default: `10`)
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Pet Medical History retrieved successfully",
  "page": 1,
  "limit": 10,
  "totalPages": 2,
  "totalRecords": 18,
  "petMedicalHistory": [ ... ]
}
```

---

### 10.3 Update Pet Medical History
- **Route**: `PUT /api/pet-medical-history/update/:treatmentId`
- **Auth Level**: OWNER
- **Path Parameter**: `treatmentId` (Medical History ObjectId)
- **Request Payload**: Medical history fields to update.
- **Response**: `200 OK`

---

### 10.4 Delete Pet Medical History
- **Route**: `DELETE /api/pet-medical-history/delete/:treatmentId`
- **Auth Level**: OWNER
- **Path Parameter**: `treatmentId` (Medical History ObjectId)
- **Response**: `200 OK`

---

### 10.5 Get Medical History By Pet ID
- **Route**: `GET /api/pet-medical-history/get-medicalHist-by-pet-id/:petId`
- **Auth Level**: USER / OWNER
- **Path Parameter**: `petId` (Pet ObjectId)
- **Query Filter Options**:
  - `page` (number, default: `1`)
  - `limit` (number, default: `10`)
- **Response**: `200 OK` with pagination metadata (`page`, `limit`, `totalPages`, `totalRecords`).

---

## 11. Booking & Appointment API (`/api/booking`)

### 11.1 Create Booking
- **Route**: `POST /api/booking/create-booking`
- **Auth Level**: USER
- **Headers**: `Content-Type: application/json`
- **Request Payload**:
```json
{
  "serviceId": "651a...",
  "businessId": "651b...",
  "petId": "651c...",
  "bookingDate": "2026-09-15",
  "bookingTime": "10:30 AM",
  "bookingStatus": "PENDING",
  "notes": "Annual physical examination",
  "selectedService": "General Checkup",
  "checkInDate": "2026-09-15",  // Required for HOTEL service type
  "checkOutDate": "2026-09-18", // Required for HOTEL service type
  "checkInTime": "12:00 PM",
  "checkOutTime": "11:00 AM"
}
```
- **Responses**:
  - `201 Created`
  - `400 Bad Request`: Selected date lands on service `offDay`.

---

### 11.2 Get User Bookings
- **Route**: `GET /api/booking/get-bookings`
- **Auth Level**: USER
- **Query Filter Options**:
  - `page` (number, default: `1`)
  - `limit` (number, default: `10`)
  - `bookingStatus` (string, optional: `"PENDING"`, `"APPROVED"`, `"COMPLETED"`, `"CANCELLED"`)
  - `search` (string, optional: searches status or notes)
  - `sortBy` (string)
  - `sortOrder` (string: `"asc"`, `"desc"`)
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Bookings retrieved successfully",
  "bookings": [ ... ],
  "pagination": {
    "total": 12,
    "totalPage": 2,
    "currentPage": 1,
    "limit": 10
  }
}
```

---

### 11.3 Get Booking Details
- **Route**: `GET /api/booking/get-bookings-by-service-id/:id`
- **Auth Level**: USER
- **Path Parameter**: `id` (Booking ObjectId)
- **Response**: `200 OK` returning populated booking object.

---

### 11.4 Update Booking
- **Route**: `PUT /api/booking/update/:id`
- **Auth Level**: USER
- **Path Parameter**: `id` (Booking ObjectId)
- **Request Payload**: Any booking fields to update.
- **Response**: `200 OK`

---

### 11.5 Delete Booking
- **Route**: `DELETE /api/booking/delete/:id`
- **Auth Level**: USER
- **Path Parameter**: `id` (Booking ObjectId)
- **Response**: `200 OK`

---

### 11.6 Update Booking Status (Owner Action)
- **Route**: `PUT /api/booking/:id/status`
- **Auth Level**: OWNER
- **Path Parameter**: `id` (Booking ObjectId)
- **Request Payload**:
```json
{
  "status": "APPROVED", // Allowed: "APPROVED", "COMPLETED", "CANCELLED"
  "cancellationReason": "Owner unavailable on date"
}
```
- **Response**: `200 OK`

---

### 11.7 Cancel Booking (User Action)
- **Route**: `PUT /api/booking/:id/cancel`
- **Auth Level**: USER
- **Path Parameter**: `id` (Booking ObjectId)
- **Request Payload**:
```json
{
  "cancellationReason": "Schedule change"
}
```
- **Response**: `200 OK`

---

### 11.8 Get Owner Booking Overview
- **Route**: `GET /api/booking/get-booking-overview`
- **Auth Level**: OWNER
- **Query Filter Options**:
  - `viewType` (string: `"monthly"` or `"weekly"`, default: `"monthly"`)
  - `serviceId` (string, optional)
  - `status` (string, optional)
  - `month` (number: 1-12)
  - `year` (number)
  - `weekStart` (string: ISO date)
  - `week` (number: 1-52)
  - `weekYear` (number)
- **Response**: `200 OK` with date range breakdown and aggregated statistics (`pending`, `approved`, `completed`, `rejected`, `cancelled`).

---

### 11.9 Get Owner Booking Status Counts
- **Route**: `GET /api/booking/owner-status-counts`
- **Auth Level**: OWNER
- **Query Filter Options**: `serviceId`, `period` (`"weekly"` | `"monthly"`), `month`, `year`, `weekStart`, `week`, `weekYear`
- **Response**: `200 OK` returning breakdown counts for each status.

---

### 11.10 Get Combined Business Bookings
- **Route**: `GET /api/booking/business/:businessId/bookings`
- **Auth Level**: OWNER
- **Path Parameter**: `businessId` (Business ObjectId)
- **Query Filter Options**:
  - `status` (string, optional)
  - `period` (string: `"monthly"` | `"weekly"`)
  - `month`, `year`, `weekStart`, `week`, `weekYear`
  - `page` (number, default: `1`)
  - `limit` (number, default: `20`)
- **Response**: `200 OK`
```json
{
  "success": true,
  "businessId": "651b...",
  "period": "monthly",
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  },
  "counts": {
    "total": 45,
    "PENDING": 5,
    "APPROVED": 20,
    "COMPLETED": 18,
    "REJECTED": 1,
    "CANCELLED": 1
  },
  "bookings": [ ... ]
}
```

---

## 12. Reviews API (`/api/review`)

### 12.1 Create Review
- **Route**: `POST /api/review/create`
- **Auth Level**: USER
- **Headers**: `Content-Type: application/json`
- **Request Payload**:
```json
{
  "serviceId": "651a...",
  "businessId": "651b...",
  "ownerId": "651c...",
  "rating": 5, // Number: 1 to 5
  "comment": "Outstanding veterinary service and friendly staff!"
}
```
- **Response**: `201 Created`

---

### 12.2 Get Review By ID
- **Route**: `GET /api/review/get/:id`
- **Auth Level**: USER
- **Path Parameter**: `id` (Review ObjectId)
- **Response**: `200 OK`

---

### 12.3 Get All Reviews By Business ID
- **Route**: `GET /api/review/get-all-reviews-by-business/:id`
- **Auth Level**: OWNER
- **Path Parameter**: `id` (Business ObjectId)
- **Response**: `200 OK` returning `avgRating`, `totalReviews`, and `reviews` array.

---

### 12.4 Get All Reviews By Service ID
- **Route**: `GET /api/review/get-all-reviews-by-service/:id`
- **Auth Level**: Public
- **Path Parameter**: `id` (Service ObjectId)
- **Response**: `200 OK` returning `avgRating`, `totalReviews`, and populated reviews list.

---

### 12.5 Get All Reviews By User
- **Route**: `GET /api/review/get-all-reviews-by-user`
- **Auth Level**: USER
- **Response**: `200 OK` returning reviews posted by logged in user.

---

### 12.6 Get Owner Service Reviews
- **Route**: `GET /api/review/owner/service-reviews`
- **Auth Level**: OWNER
- **Query Filter Options**:
  - `serviceType` (string, optional: e.g. `"VET"`, `"GROOMING"`)
  - `page` (number, default: `1`)
  - `limit` (number, default: `20`)
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Owner service reviews fetched successfully",
  "filters": { "serviceType": "VET" },
  "pagination": {
    "total": 30,
    "page": 1,
    "limit": 20,
    "totalPages": 2
  },
  "avgRating": 4.8,
  "reviews": [ ... ]
}
```

---

## 13. User Home Page API (`/api/user-home-page`)

### 13.1 Get Services By Type
- **Route**: `GET /api/user-home-page/getServicesByType/:type`
- **Auth Level**: Public
- **Path Parameter**: `type` (string: e.g. `"VET"`, `"SHOP"`, `"HOTEL"`, `"GROOMING"`)
- **Query Filter Options**: QueryBuilder filters (`search`, `sort`, `page`, `limit`)
- **Response**: `200 OK` returning services with `avgRating`, `isOpenNow`, and `meta` pagination info.

---

### 13.2 Total Pets For Logged-In User
- **Route**: `GET /api/user-home-page/totalPetsForLoggedInUser`
- **Auth Level**: USER
- **Response**: `200 OK` `{ "success": true, "data": { "totalPets": 2, "petList": [ ... ], "userPic": "..." } }`

---

### 13.3 Get Active Advertisements
- **Route**: `GET /api/user-home-page/allAdsWhichActive`
- **Auth Level**: USER
- **Query Filter Options**:
  - `page` (number, default: `1`)
  - `limit` (number, default: `10`)
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Ads fetched successfully",
  "pagination": {
    "totalAds": 5,
    "currentPage": 1,
    "totalPages": 1,
    "limit": 10
  },
  "ads": [ ... ],
  "adsPic": [ ... ]
}
```

---

### 13.4 Get Active Advertisement Details
- **Route**: `GET /api/user-home-page/getActiveAdsDetails/:id`
- **Auth Level**: USER
- **Path Parameter**: `id` (Advertisement ObjectId)
- **Response**: `200 OK` returning ad document, associated business, and services.

---

### 13.5 Get Complete Home Page Aggregated Data
- **Route**: `GET /api/user-home-page/getAllUserHomePageData`
- **Auth Level**: USER
- **Query Filter Options**:
  - `type` (string, optional: service type filter)
  - `id` (string, optional: active ad ID)
- **Response**: `200 OK` returning aggregated object containing `services`, `appointments`, `pets`, and `advertisements`.

---

### 13.6 Global Service Search & Filter
- **Route**: `GET /api/user-home-page/services/search`
- **Auth Level**: Public / USER
- **Query Filter Options**:
  - `q` (string, optional: multi-field regex text search across `serviceName`, `location`, and `providings`)
  - `serviceType` (string, optional: `"VET"`, `"GROOMING"`, `"HOTEL"`, `"SHOP"`, `"TRAINING"`, `"FRIENDLY"`)
  - `location` (string, optional: location regex filter)
  - `isOpen` (boolean/string: `"true"` to filter only currently open services)
  - `sortBy` (string, optional: `"avgRating"`, `"totalReviews"`, `"totalBookings"`, `"serviceName"`)
  - `sortOrder` (string: `"asc"` or `"desc"`, default: `"asc"`)
  - `page` (number, default: `1`)
  - `limit` (number, default: `10`)
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Services fetched successfully",
  "services": [ ... ],
  "currentPage": 1,
  "pageSize": 10,
  "total": 35
}
```

---

## 14. Conversation & Chat API (`/api/chat`)

### 14.1 Get Conversation
- **Route**: `GET /api/chat/get-conversation`
- **Auth Level**: USER / OWNER
- **Response**: `200 OK`

---

### 14.2 Get Conversation By ID
- **Route**: `GET /api/chat/get-conversation/:conversationId`
- **Auth Level**: USER / OWNER
- **Path Parameter**: `conversationId`
- **Response**: `200 OK`

---

### 14.3 Get Conversation List
- **Route**: `GET /api/chat/get-conversation-list`
- **Auth Level**: USER / OWNER
- **Response**: `200 OK` returning user/owner chat list with unread counts and recent messages.

---

### 14.4 Check User Blocked Status
- **Route**: `GET /api/chat/check-block/:targetUserId`
- **Auth Level**: USER / OWNER
- **Path Parameter**: `targetUserId`
- **Response**: `200 OK`

---

### 14.5 Block User
- **Route**: `POST /api/chat/block/:targetUserId`
- **Auth Level**: USER / OWNER
- **Path Parameter**: `targetUserId`
- **Response**: `200 OK`

---

### 14.6 Unblock User
- **Route**: `POST /api/chat/unblock/:targetUserId`
- **Auth Level**: USER / OWNER
- **Path Parameter**: `targetUserId`
- **Response**: `200 OK`

---

### 14.7 Toggle Conversation Block
- **Route**: `POST /api/chat/block-toggle/:conversationId`
- **Auth Level**: USER / OWNER
- **Path Parameter**: `conversationId`
- **Response**: `200 OK`

---

### 14.8 Delete Message
- **Route**: `POST /api/chat/delete-message/:messageId`
- **Auth Level**: USER / OWNER
- **Path Parameter**: `messageId`
- **Response**: `200 OK`

---

### 14.9 Send Media in Chat
- **Route**: `POST /api/chat/chat-images-video`
- **Auth Level**: USER / OWNER
- **Headers**: `Content-Type: multipart/form-data`
- **Request Payload**:
  - `chatImage` (file uploads: up to 10 images)
  - `chatVideo` (file upload: max 1 video)
  - `chatVideoCover` (file upload: max 1 image)
- **Response**: `200 OK` with uploaded file paths/URLs.

---

## 15. Notification API (`/api/notifications`)

### 15.1 Get User Notifications
- **Route**: `GET /api/notifications`
- **Auth Level**: USER / OWNER
- **Query Filter Options**:
  - `page` (number, default: `1`)
  - `limit` (number, default: `20`)
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "total": 20,
    "page": 1,
    "limit": 20,
    "unreadCount": 3
  }
}
```

---

### 15.2 Mark Notification as Read
- **Route**: `PUT /api/notifications/:id/read`
- **Auth Level**: USER / OWNER
- **Path Parameter**: `id` (Notification ObjectId)
- **Response**: `200 OK`

---

### 15.3 Mark All Notifications as Read
- **Route**: `PUT /api/notifications/read-all`
- **Auth Level**: USER / OWNER
- **Response**: `200 OK` `{ "success": true, "message": "All notifications marked as read" }`

---

### 15.4 Delete Notification
- **Route**: `DELETE /api/notifications/:id`
- **Auth Level**: USER / OWNER
- **Path Parameter**: `id` (Notification ObjectId)
- **Response**: `200 OK`

---

### 15.5 Get Simple Notifications
- **Route**: `GET /api/notifications/simple`
- **Auth Level**: USER / OWNER
- **Response**: `200 OK` returning simplified notification list (`title`, `type`, `message`, `time`).

---

### 15.6 Get Admin Notifications
- **Route**: `GET /api/notifications/admin-notifications`
- **Auth Level**: ADMIN / SUPER_ADMIN
- **Response**: `200 OK` returning admin system activity notifications.

---

## 16. Admin Dashboard API (`/api/dashboard`)

### 16.1 Get Dashboard Statistics
- **Route**: `GET /api/dashboard/stats`
- **Auth Level**: ADMIN / SUPER_ADMIN
- **Query Filter Options**: `year` (number, optional: default current year)
- **Response**: `200 OK` returning `totalUsers`, `totalIncome`, `totalSellers`, `userGrowth`, `sellerGrowth`, `businessOwners`, `additionalStats`.

---

### 16.2 Get Dashboard Overview
- **Route**: `GET /api/dashboard/overview`
- **Auth Level**: ADMIN / SUPER_ADMIN
- **Query Filter Options**: `year` (number, optional)
- **Response**: `200 OK` returning yearly summary (`newUsers`, `newSellers`, `yearlyBookings`, `yearlyRevenue`).

---

### 16.3 Get Pet Owner Details By ID
- **Route**: `GET /api/dashboard/pet-owner/:id`
- **Auth Level**: ADMIN / SUPER_ADMIN
- **Path Parameter**: `id` (User ObjectId)
- **Response**: `200 OK` returning user profile and pets.

---

### 16.4 Get All Pet Owners
- **Route**: `GET /api/dashboard/pet-owners`
- **Auth Level**: ADMIN / SUPER_ADMIN
- **Query Filter Options**:
  - `page` (number, default: `1`)
  - `limit` (number, default: `10`)
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Users fetched successfully",
  "users": [ ... ],
  "total": 125,
  "currentPage": 1,
  "pageSize": 10
}
```

---

### 16.5 Block Pet Owner
- **Route**: `PUT /api/dashboard/pet-owner/:id/block`
- **Auth Level**: ADMIN / SUPER_ADMIN
- **Path Parameter**: `id` (User ObjectId)
- **Response**: `200 OK`

---

### 16.6 Unblock Pet Owner
- **Route**: `PUT /api/dashboard/pet-owner/:id/unblock`
- **Auth Level**: ADMIN / SUPER_ADMIN
- **Path Parameter**: `id` (User ObjectId)
- **Response**: `200 OK`

---

### 16.7 Get Business Owner Details By ID
- **Route**: `GET /api/dashboard/business-owner/:id`
- **Auth Level**: ADMIN / SUPER_ADMIN
- **Path Parameter**: `id` (Owner ObjectId)
- **Response**: `200 OK` returning owner, business, services, and reviews.

---

### 16.8 Get All Business Owners
- **Route**: `GET /api/dashboard/business-owners`
- **Auth Level**: ADMIN / SUPER_ADMIN
- **Query Filter Options**:
  - `page` (number, default: `1`)
  - `limit` (number, default: `10`)
- **Response**: `200 OK` with pagination metadata (`total`, `currentPage`, `pageSize`).

---

### 16.9 Block Business Owner
- **Route**: `PUT /api/dashboard/business-owner/:id/block`
- **Auth Level**: ADMIN / SUPER_ADMIN
- **Path Parameter**: `id` (Owner ObjectId)
- **Response**: `200 OK`

---

### 16.10 Unblock Business Owner
- **Route**: `PUT /api/dashboard/business-owner/:id/unblock`
- **Auth Level**: ADMIN / SUPER_ADMIN
- **Path Parameter**: `id` (Owner ObjectId)
- **Response**: `200 OK`

---

### 16.11 Get All Businesses (Dashboard)
- **Route**: `GET /api/dashboard/business`
- **Auth Level**: ADMIN / SUPER_ADMIN
- **Response**: `200 OK` returning all businesses with `bookingsCount`.

---

### 16.12 Get All Bookings By Business ID
- **Route**: `GET /api/dashboard/get-bookings-by-business/:id`
- **Auth Level**: ADMIN / SUPER_ADMIN
- **Path Parameter**: `id` (Business ObjectId)
- **Response**: `200 OK`

---

### 16.13 Get All Services With Statistics
- **Route**: `GET /api/dashboard/services-stats`
- **Auth Level**: ADMIN / SUPER_ADMIN
- **Response**: `200 OK` returning list of services sorted by `totalBookings` descending with owner details.

---

### 16.14 Get Service Booking Details (Admin)
- **Route**: `GET /api/dashboard/service-bookings/:serviceId`
- **Auth Level**: ADMIN / SUPER_ADMIN
- **Path Parameter**: `serviceId` (Service ObjectId)
- **Response**: `200 OK` returning detailed service booking list with pet and user information.

---

## 17. System Content & Policy APIs

### 17.1 FAQ API (`/api/faq` & `/api/manage`)
- **Create FAQ**: `POST /api/faq/create` (ADMIN/SUPER_ADMIN) -> Body: `{ "question": "...", "answer": "..." }` -> `201 Created`
- **Get All FAQs**: `GET /api/faq/get` (Public) -> `200 OK`
- **Get FAQ By ID**: `GET /api/faq/get/:id` (Public) -> `200 OK`
- **Update FAQ**: `PUT /api/faq/update/:id` (ADMIN/SUPER_ADMIN) -> Body: `{ "question": "...", "answer": "..." }` -> `200 OK`
- **Delete FAQ**: `DELETE /api/faq/delete/:id` (ADMIN/SUPER_ADMIN) -> `200 OK`
- **Manage FAQ Endpoints**:
  - `POST /api/manage/add-faq` (ADMIN/SUPER_ADMIN)
  - `PATCH /api/manage/update-faq` (ADMIN/SUPER_ADMIN)
  - `GET /api/manage/get-faq` (Public)
  - `DELETE /api/manage/delete-faq` (ADMIN/SUPER_ADMIN)

---

### 17.2 Privacy Policy API (`/api/privacy` & `/api/manage`)
- **Create Privacy Policy**: `POST /api/privacy/create` (ADMIN/SUPER_ADMIN) -> `201 Created`
- **Get Privacy Policy**: `GET /api/privacy/get` (Public) -> `200 OK`
- **Update Privacy Policy**: `PUT /api/privacy/update/:id` (ADMIN/SUPER_ADMIN) -> `200 OK`
- **Delete Privacy Policy**: `DELETE /api/privacy/delete/:id` (ADMIN/SUPER_ADMIN) -> `200 OK`
- **Manage Privacy Endpoints**:
  - `POST /api/manage/add-privacy-policy` (ADMIN/SUPER_ADMIN)
  - `GET /api/manage/get-privacy-policy` (Public)
  - `GET /api/manage/get-privacy-policy1` (Public)
  - `DELETE /api/manage/delete-privacy-policy` (ADMIN/SUPER_ADMIN)

---

### 17.3 Terms & Conditions API (`/api/terms-condition` & `/api/manage`)
- **Create Terms & Conditions**: `POST /api/terms-condition/create` (OWNER) -> `201 Created`
- **Get Terms & Conditions**: `GET /api/terms-condition/get` (Public) -> `200 OK`
- **Get Terms By ID**: `GET /api/terms-condition/get/:id` (Public) -> `200 OK`
- **Update Terms**: `PUT /api/terms-condition/update/:id` (OWNER) -> `200 OK`
- **Delete Terms**: `DELETE /api/terms-condition/delete/:id` (OWNER) -> `200 OK`
- **Manage Terms Endpoints**:
  - `POST /api/manage/add-terms-conditions` (ADMIN/SUPER_ADMIN)
  - `GET /api/manage/get-terms-conditions` (Public)
  - `DELETE /api/manage/delete-terms-conditions` (ADMIN/SUPER_ADMIN)

---

### 17.4 Help Center API (`/api/help`)
- **Create Help Request**: `POST /api/help/create` (USER/OWNER) -> `201 Created`
- **Get All Helps**: `GET /api/help/get` (Public) -> `200 OK`
- **Get Help By ID**: `GET /api/help/get/:id` (Public) -> `200 OK`
- **Update Help**: `PUT /api/help/update/:id` -> `200 OK`
- **Delete Help**: `DELETE /api/help/delete/:id` -> `200 OK`

---

### 17.5 Top Brands API (`/api/top-brands`)
- **Create Top Brand**: `POST /api/top-brands/create` (ADMIN/SUPER_ADMIN) -> Headers: `multipart/form-data`, Body: `logo` (file uploads) -> `201 Created`
- **Get All Top Brands**: `GET /api/top-brands/get-all` (Public) -> `200 OK`
- **Delete Top Brand**: `DELETE /api/top-brands/delete/:id` (ADMIN/SUPER_ADMIN) -> `200 OK`

---

### 17.6 About Us & Contact Us API (`/api/manage`)
- **About Us**:
  - `POST /api/manage/add-about-us` (ADMIN/SUPER_ADMIN)
  - `GET /api/manage/get-about-us` (Public)
  - `DELETE /api/manage/delete-about-us` (ADMIN/SUPER_ADMIN)
- **Contact Us**:
  - `POST /api/manage/add-contact-us` (ADMIN/SUPER_ADMIN)
  - `GET /api/manage/get-contact-us` (Public)
  - `DELETE /api/manage/delete-contact-us` (ADMIN/SUPER_ADMIN)

---

## 18. Admin Account API (`/api/admin`)

### 18.1 Get Admin Profile
- **Route**: `GET /api/admin/get-profile`
- **Auth Level**: ADMIN / SUPER_ADMIN
- **Response**: `200 OK` `{ "admin": { "id": "...", "name": "...", "email": "...", "role": "ADMIN" } }`

---

### 18.2 Update Admin Profile
- **Route**: `PUT /api/admin/update-profile`
- **Auth Level**: ADMIN / SUPER_ADMIN
- **Headers**: `Content-Type: multipart/form-data`
- **Request Payload**: `name`, `contact`, `address`, `profilePic` (file)
- **Response**: `200 OK`

---

### 18.3 Change Admin Password
- **Route**: `PUT /api/admin/change-password`
- **Auth Level**: ADMIN / SUPER_ADMIN
- **Headers**: `Content-Type: application/json`
- **Request Payload**: `{ "oldPassword": "...", "newPassword": "...", "confirmNewPassword": "..." }`
- **Response**: `200 OK`

---

### 18.4 Make Admin
- **Route**: `POST /api/admin/make-admin`
- **Auth Level**: SUPER_ADMIN
- **Headers**: `Content-Type: application/json`
- **Request Payload**: `{ "name": "Admin Name", "email": "admin@example.com", "password": "Password123!" }`
- **Response**: `201 Created`

---

### 18.5 Make Super Admin
- **Route**: `POST /api/admin/make-super-admin`
- **Auth Level**: Public / System Setup
- **Headers**: `Content-Type: application/json`
- **Request Payload**: `{ "name": "Super Admin Name", "email": "superadmin@example.com", "password": "Password123!" }`
- **Response**: `201 Created`

---

### 18.6 Remove Admin
- **Route**: `POST /api/admin/remove-admin`
- **Auth Level**: SUPER_ADMIN
- **Headers**: `Content-Type: application/json`
- **Request Payload**: `{ "adminId": "64f1..." }`
- **Response**: `200 OK` `{ "message": "Admin deleted successfully" }`

---

### 18.7 Remove Super Admin
- **Route**: `POST /api/admin/remove-super-admin`
- **Auth Level**: SUPER_ADMIN
- **Headers**: `Content-Type: application/json`
- **Request Payload**: `{ "adminId": "64f1..." }`
- **Response**: `200 OK` `{ "message": "Super Admin removed successfully" }`

---

## 19. RevenueCat Webhook API (`/api/webhooks`)

### 19.1 RevenueCat Webhook Listener
- **Route**: `POST /api/webhooks/revenuecat`
- **Auth Level**: Public / RevenueCat Authorization Header (`Authorization: <REVENUECAT_WEBHOOK_AUTH_TOKEN>`)
- **Headers**: `Content-Type: application/json`, `Authorization: <token>`
- **Request Payload Example**:
```json
{
  "api_version": "1.0",
  "event": {
    "id": "evt_12345",
    "type": "INITIAL_PURCHASE", // Supported: INITIAL_PURCHASE, RENEWAL, PRODUCT_CHANGE, UNCANCELLATION, CANCELLATION, EXPIRATION, BILLING_ISSUE, TRANSFER
    "app_user_id": "rc_user_12345",
    "original_app_user_id": "rc_user_12345",
    "product_id": "pro_monthly_subscription",
    "expiration_at_ms": 1788259200000,
    "original_transaction_id": "tx_99999",
    "store": "APP_STORE"
  }
}
```
- **Responses**:
  - `200 OK`: `{ "message": "Webhook processed successfully" }`
  - `401 Unauthorized`: Authorization header invalid or missing.
