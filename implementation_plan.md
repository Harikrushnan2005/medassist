# Production-Grade Patient Services Architecture

To make these chatbot options "realistic and production-level," we need to replace the frontend mocks with a robust data layer. This means storing documents locally on the server, tracking real invoice balances in the database, and saving patient intake forms to their backend profile.

Here is the comprehensive plan to build this full-stack architecture:

## 1. Database Schema Additions (`backend/models.py`)

We will introduce 4 new SQLAlchemy models mapped to the database:

### [NEW] `Invoice` and `Payment`
*   `Invoice`: `id`, `patient_id` (ForeignKey), `amount` (Float), `status` ("pending" | "paid"), `description`, `due_date`, `created_at`.
*   We'll map a one-to-many relationship from `Patient` -> `Invoices`.

### [NEW] `PreVisitForm`
*   `PreVisitForm`: `id`, `patient_id`, `symptoms` (Text), `allergies` (Text), `medications` (Text), `submitted_at`.

### [NEW] `Document` (ID & Card Uploads)
*   `Document`: `id`, `patient_id`, `file_name`, `file_type`, `file_path`, `extracted_data` (JSON block simulating OCR results), `uploaded_at`.

### [NEW] `PriorAuthorization`
*   `PriorAuthorization`: `id`, `patient_id`, `procedure_name`, `status` ("Approved", "Pending", "Denied"), `valid_until`.

---

## 2. API Expansion (`backend/routes/`)

We will expose RESTful endpoints for the chatbot to interact with:

*   **Billing:**
    *   `GET /api/patients/{patient_id}/invoices` -> Returns pending invoices.
    *   `POST /api/invoices/{invoice_id}/pay` -> Marks the invoice as paid.
*   **Forms:**
    *   `POST /api/patients/{patient_id}/forms` -> Saves a new `PreVisitForm` to the DB.
*   **Prior Auths:**
    *   `GET /api/patients/{patient_id}/authorizations` -> Fetches PA status for procedures.
*   **Documents:**
    *   `POST /api/patients/{patient_id}/documents` -> Accepts `multipart/form-data`. We will securely save the image/PDF file to a local `backend/uploads/` directory and create a DB `Document` record.

We will also update `backend/seed.py` so that our test user ("Jane Smith") starts with a fake unpaid $85 invoice and a mock MRI authorization so you have data to test with!

---

## 3. Frontend Chatbot Wire-up (`src/`)

We will replace the mock `simulateDelay` blocks in `useChatbot.ts` with real API calls using the verified `patientId` from the session.

#### [MODIFY] `src/services/api.ts`
*   Export new Axios typings and functions (`getInvoices`, `payInvoice`, `uploadDocument`, etc.).

#### [MODIFY] `src/hooks/useChatbot.ts`
*   **Identity Check:** If a user clicks "Pay Bill" but hasn't verified their identity yet (i.e., `patientId` is null), the bot will dynamically route them to the "Verify Identity" form first before letting them pay the bill.
*   **Document Upload:** Actually send the `File` object over the network using `FormData`. If successful, the bot confirms it is in the database.
*   **Form Submission:** Map the React `FormBlock` state to the `submitPreVisitForm` API call.

## Open Questions

> [!WARNING]
> **Identity Prerequisite**
> Currently, the chatbot asks for your Identity as soon as you open it. If you bypass that by clicking the sidebar right away, do you agree with my plan to force an identity check first before revealing private invoices/PA statuses?

> [!CAUTION]
> **File Storage**
> For this production-level system, I will write the uploaded files directly to the server's local file system (`backend/uploads/`). In a massive cloud deployment you'd use AWS S3, but local disk is the standard starting point. Is this acceptable?
