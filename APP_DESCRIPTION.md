# RFE Foam Pro - Application Overview

## Introduction
RFE Foam Pro is a comprehensive Estimating, CRM, and Job Management Web Application designed specifically for Spray Foam Insulation businesses. 
It provides an end-to-end solution from generating foam material estimates, managing customer relationships, tracking inventory, to dispatching crews and calculating job profitability.

## Technology Stack
- **Frontend Framework:** React 19 / TypeScript / Vite
- **Styling:** Tailwind CSS v4
- **Icons & UI:** Lucide React
- **Document Generation:** jsPDF & jsPDF-AutoTable
- **Backend / Database:** Serverless Architecture powered by Google Apps Script (acting as an API Gateway) with Google Sheets acting as the NoSQL Document Database.
- **PWA Capabilities:** Fully configured to be installed as a Progressive Web App (PWA) with a manifest file and service workers.

## Core Architecture & Backend Details
The architecture is unique in that it replaces a traditional database (like Postgres) with an organized layout of Google Sheets:
- **`backend/Code.js`**: Functions as the primary API Gateway and Authentication server. It handles read/write logic, locking mechanisms for transactional safety (e.g. preventing double deductions of inventory), and delta-syncing algorithms for performance optimization.
- **Databases (Google Sheets tabs)**: Includes tables for `Estimates_DB`, `Customers_DB`, `Settings_DB`, `Inventory_DB`, `Equipment_DB`, `Profit_Loss_DB`, and `Material_Log_DB`.
- **Authentication:** HMAC-SHA-256 token-based authentication with two roles: `admin` (Full Access) and `crew` (Restricted field-view access via 4-digit PIN).
- **Google Drive Integration:** Direct integrations utilizing Apps Script to generate job sheets, upload site photos, and store generated Estimate/Invoice PDFs in organized Drive folders.

## Key Features & Modules

### 1. Spray Foam Material Calculator
At the heart of the application is a highly configurable calculator specifically engineered for spray foam jobs.
- **Calculation Modes:** Handles varying geometry (Building setups, Walls Only, Flat Areas, or Custom calculations).
- **Material Types:** Built-in configurations for **Open Cell** and **Closed Cell** foam.
- **Advanced Job Variables:** Accounts for Foam Thickness, Yields (Board Feet / Set), Waste Percentages, Roof Pitches, Gable Area generation, and Metal Surface factors.
- **Output:** Outputs accurate sets of chemicals needed, stroke counts, labor cost estimations, base material costs, and recommended retail pricing (supports both level and sq-ft-based pricing).

### 2. Estimate & Job Pipeline
A structured workflow mechanism guiding leads to completed jobs.
- **Stages:** Draft → Work Order → Invoiced → Paid → Archived.
- **Documentation Engine:** Instant generation of professional PDF Estimates, Work Orders, and Invoices.
- **Delta Sync:** Employs optimistic UI state management with a robust syncing engine to Google Sheets to handle offline functionality or spotty connectivity.

### 3. CRM (Customer Management)
Simple yet effective integrated customer tracking.
- Maintains comprehensive Customer Profiles (Contact Info, Address mapping, Notes).
- Stages for filtering: **Lead**, **Active**, **Archived**.
- Allows quick navigation from a Customer Profile directly to a new Estimate configuration.

### 4. Inventory & Warehouse Management
Keeps an accurate ledger of physical warehouse stock.
- Standard tracking of Open Cell and Closed Cell set levels.
- Dynamic inventory addition for tracking supplementary items (scaffolding, prep materials, safety gear, etc).
- Calculates the true Cost of Goods Sold (COGS) based on current unit costs.

### 5. Crew Dashboard & Field Execution
A restricted, simplified view specifically designed for crews on the job site.
- **Simplified Login:** Access managed completely via a company-assigned 4-digit Crew PIN.
- **Execution Tracking:** Crews can transition job statuses (`Not Started` → `In Progress` → `Completed`).
- **Actuals Reporting:** Crews report the "Actual Materials Used" (e.g., how many sets actually sprayed versus estimated), triggering delta logic that deducts from the live warehouse inventory.
- **Site Photos:** Crews can upload completion imagery straight into Google Drive.

### 6. Job Costing & Financial Engine
Automatically converts completed jobs into detailed Profit & Loss records.
- Logs Revenue vs. True Cost (Chemical Costs + Labor Hours + Additional Inventory + Miscellaneous Trip Charges/Fees).
- Generates exact Net Profit and Margin Percentages per job upon being marked "Paid", seamlessly recording these entries into the `Profit_Loss_DB` for end-of-quarter analytics.

### 7. Progressive Web App (PWA) Capability
Designed for the modern contractor. It prompts the user to "Install Desktop/Mobile App" via web app manifests and service workers, giving it a native application appearance directly from the homescreen.
