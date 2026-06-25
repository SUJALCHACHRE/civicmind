# CivicMind

CivicMind is a full-stack civic complaint platform built for municipal service workflows in Bhopal. It gives citizens a guided way to submit complaints, attach evidence, and track progress, while giving administrators a structured dashboard for routing, review, escalation, and resolution.

The application combines a React + Vite frontend with a Flask backend, Supabase authentication and data storage, and AI-assisted complaint analysis for category detection, priority scoring, and department routing.

## What It Does

- Lets citizens sign in and submit public complaints with text, location, ward, and optional photo evidence
- Uses AI-assisted analysis to classify the issue and prepare it for routing
- Stores and retrieves complaint data through Supabase
- Provides citizen and admin dashboards for tracking and review
- Includes a chat assistant and escalation reporting flow for follow-up
- Supports image capture, voice input, and map-based civic context

## Key Features

- Citizen authentication with Supabase
- Complaint intake form with ward selection, location capture, image upload, and camera support
- AI complaint analysis and routing
- Tracking number generation and complaint confirmation flow
- Admin dashboard for complaint oversight
- Citizen dashboard for personal complaint history
- Escalation report generation
- Chat support for complaint context and assistance
- Responsive UI built with Tailwind CSS and animated interactions

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, GSAP
- Backend: Flask, Python, Flask-CORS
- Data/Auth: Supabase
- AI and media: Groq integration, image handling, complaint analysis pipeline
- Visualization: Leaflet, Recharts, Three.js

## Project Structure

```text
.
|-- backend/    Flask API, AI pipeline, Supabase integration
|-- public/     Static assets
|-- src/        React frontend
|-- dist/       Production build output
`-- README.md
```

## Prerequisites

- Node.js 18 or newer
- npm
- Python 3.10 or newer
- A Supabase project
- A Groq API key for server-side AI features

## Environment Variables

### Frontend

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_BASE_URL=http://127.0.0.1:5000/api
```

### Backend

Create a `.env` file inside `backend/`:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_service_role_or_server_key
GROQ_API_KEY=your_groq_api_key
```

## Setup

### 1. Install frontend dependencies

```bash
npm install
```

### 2. Install backend dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 3. Configure environment files

Add the frontend variables in the project root `.env` and the backend variables in `backend/.env`.

## Running Locally

### Start the backend API

Run this from the `backend/` folder:

```bash
python app.py
```

The backend runs on:

- `http://127.0.0.1:5000`

### Start the frontend

Run this from the project root:

```bash
npm run dev
```

The frontend runs on:

- `http://localhost:5173`

## Build For Production

```bash
npm run build
```

Preview the production build locally with:

```bash
npm run preview
```

## API Overview

The frontend talks to the backend through `/api` endpoints. The main flows include:

- `POST /api/complaints/analyze`
- `POST /api/complaints`
- `GET /api/complaints`
- `GET /api/complaints/:id`
- `PATCH /api/complaints/:id/status`
- `GET /api/stats`
- `GET /api/wards`
- `POST /api/chat`

## Notes

- The frontend uses Supabase for authentication.
- The backend is configured with CORS for local development.
- Complaint routing and analysis are designed around Bhopal municipal workflows.
- If you change the backend host or port, update `VITE_API_BASE_URL` accordingly.

## License

No license has been declared yet. Add one before distributing or open-sourcing the project publicly.
