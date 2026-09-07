# 🛡️ Banteay Digital (បន្ទាយឌីជីថល)

### _AI-Powered Scam Detection, Digital Safety & Community Fraud Awareness Platform_

[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-5.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7.x-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![MySQL](https://img.shields.io/badge/MySQL-8.x-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python_3.11-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Google Gemini](https://img.shields.io/badge/Gemini_2.5_Flash-Multimodal_AI-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)

---

## 📖 Table of Contents

- [Executive Summary](#-executive-summary)
- [The Problem & Vision](#-the-problem--vision)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [User Journey & Fraud Lifecycle](#-user-journey--fraud-lifecycle)
- [Technology Stack](#-technology-stack)
- [Database & Domain Model](#-database--domain-model)
- [AI Subsystem & Intelligence Layer](#-ai-subsystem--intelligence-layer)
- [API Reference Highlights](#-api-reference-highlights)
- [Getting Started & Local Setup](#-getting-started--local-setup)
- [Security & Responsible AI](#-security--responsible-ai)
- [Project Roadmap](#-project-roadmap)
- [Contributing & Team](#-contributing--team)

---

## 🌟 Executive Summary

**Banteay Digital** (_Banteay_ meaning _Fortress_ in Khmer) is a cybersecurity and public safety web application designed to protect everyday citizens from evolving digital scams, phishing campaigns, financial fraud, and online manipulation.

By combining **Multimodal Artificial Intelligence** with **Human-verified community**, Banteay Digital empowers users to instantly analyze suspicious messages, screenshots, links, and QR codes while building a collective, transparent defense network against fraudulent operations.

```text
    ┌─────────────────┐        ┌──────────────────────┐        ┌─────────────────────────┐
    │  User Submits   │  ───►  │ Instant AI Analysis  │  ───►  │ Verified Community Feed │
    │ Text/Image/Link │        │ (Multimodal + RAG)   │        │ (Shield for the Public) │
    └─────────────────┘        └──────────────────────┘        └─────────────────────────┘
```

---

## 🎯 The Problem & Vision

### The Challenge

Digital fraud has grown increasingly sophisticated across Southeast Asia and globally. Scammers leverage psychological urgency, counterfeit bank portals, deceptive QR codes, investment lures, and impersonation on messaging platforms (Telegram, WhatsApp, SMS). Non-technical users often lack the tools to verify suspicious interactions before suffering irreversible financial or identity loss.

### Our Solution

Banteay Digital provides a two-layered defense:

1. **Instant, Private AI Diagnostics:** Users submit suspicious content (text conversations, SMS warnings, phishing screenshots, payment QR codes) and receive a comprehensive threat report with clear risk scores, detected deception tactics, and immediate protective actions.
2. **Community Fraud Intelligence:** Confirmed fraud cases are reviewed by moderators and published as searchable community awareness posts, creating an up-to-date knowledge base that educates the public and inoculates the community against active scam patterns.

---

## ⚡ Key Features

### 🔍 1. Multimodal Scam Detection Engine

- **Cross-Format Ingestion:** Analyzes raw text, links, visual screenshots of chats and suspicious advertisements in a single unified workflow.
- **Deterministic QR Inspection:** Automatically decodes QR codes to inspect hidden destinations while evaluating the surrounding contextual lure.
- **Deep Fraud Reasoning:** Identifies manipulative language patterns, urgency triggers, impersonation flags, credential harvesting vectors, and unrealistic financial schemes.

### 📊 2. Granular Risk Assessment & Actionable Guidance

- **Standardized Risk Levels:** Categorizes threats into `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL` risk tiers with an explainable `0–100` Risk Score.
- **Explainable Indicators:** Lists exact suspicious indicators (e.g., _domain spoofing_, _unauthorized OTP request_, _unrealistic crypto yields_).
- **Remediation Steps:** Delivers step-by-step guidance on what to do immediately (e.g., _do not transfer funds_, _report number_, _freeze account_).

### 👥 3. Community Awareness & Collective Defense

- **Verified Public Feed:** Approved scam reports become public community posts explaining how the scam operated.
- **Searchable Threat Database:** Users can search previous scam techniques before committing to unfamiliar online transactions.

### 🛡️ 4. Human-in-the-Loop Moderation

- **Admin Review Queue:** High-risk or complex submissions are reviewed by administrators to ensure accuracy, prevent misinformation, and maintain high community data quality.
- **Audit Trails:** Full status tracking from `PENDING` $\rightarrow$ `APPROVED`/`REJECTED`.

### 🔐 5. Robust Security & Authentication

- Dual-mode authentication supporting **HTTP-only secure cookies** and **Bearer JWT tokens**.
- Phone number or email authentication with Bcrypt password hashing and session invalidation via token versioning.

---

## 🏗️ System Architecture

Banteay Digital follows a modular, decoupled architecture optimized for performance, maintainability, and rapid AI model iteration.

```mermaid
flowchart TB
    subgraph ClientLayer [Presentation Layer]
        WebClient[React / Vite Web Application]
        MobileWeb[Responsive Mobile View]
    end

    subgraph BackendLayer [Core Backend Service - Node.js / Express]
        API[Express 5 REST API Router]
        AuthGuard[JWT / Cookie Auth & RBAC Middleware]
        Validation[Zod Input Validation]
        PrismaORM[Prisma ORM Client]
        MySQL[(MySQL Database)]
    end

    subgraph AISubsystem [AI Intelligence Service - Python / FastAPI]
        AIRouter[FastAPI Request Dispatcher]
        QRModule[Deterministic QR Decoder]
        VectorStore[(Vector Store / Qdrant / Chroma)]
        PromptEngine[Context & Prompt Synthesizer]
        MultimodalLLM[Google Gemini 2.0 Flash / Vision LLM]
    end

    WebClient -->|HTTPS / JSON / Multipart| API
    MobileWeb -->|HTTPS / JSON / Multipart| API

    API --> AuthGuard
    AuthGuard --> Validation
    Validation --> PrismaORM
    PrismaORM --> MySQL

    API -->|HTTP REST / Webhook| AIRouter
    AIRouter --> QRModule
    AIRouter -->|Semantic Query| VectorStore
    VectorStore -->|Historical Scam Context| PromptEngine
    QRModule -->|Decoded URL / Payload| PromptEngine
    PromptEngine -->|Multimodal Prompt| MultimodalLLM
    MultimodalLLM -->|Structured JSON Analysis| AIRouter
    AIRouter -->|Validated Risk Result| API
```

---

## 🔄 User Journey & Fraud Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 Citizen / User
    participant Frontend as 💻 Web Client
    participant Backend as ⚙️ Express Backend
    participant AI as 🧠 AI Microservice
    actor Admin as 🛡️ Moderator / Admin
    participant Community as 🌐 Community Feed

    User->>Frontend: Submits suspicious text / screenshot / QR
    Frontend->>Backend: POST /api/submissions
    Backend->>Backend: Store Submission (Status: PENDING)
    Backend->>AI: Trigger Analysis (POST /api/v1/analyze)

    rect rgb(240, 248, 255)
        Note over AI: 1. Decode QR if present<br/>2. Retrieve similar cases (RAG)<br/>3. Multimodal reasoning (LLM)
        AI-->>Backend: Return Structured Scam Analysis (RiskLevel, Score, Indicators)
    end

    Backend->>Backend: Update Submission (Status: COMPLETED)
    Backend-->>Frontend: Instant Diagnostic Report to User

    opt Escalate for Community Protection
        Backend->>Backend: Create ScamReport (Status: PENDING)
        Admin->>Backend: GET /api/admin/reports
        Admin->>Backend: POST /api/admin/reports/:id/review (Approve + Note)
        Backend->>Community: Publish CommunityPost
        Community-->>User: Public can search & learn from verified case
    end
```

---

## 💻 Technology Stack

| Layer                      | Technology                                                                    | Purpose                                                               |
| :------------------------- | :---------------------------------------------------------------------------- | :-------------------------------------------------------------------- |
| **Backend Framework**      | [Express.js 5](https://expressjs.com/) & [Node.js 20+](https://nodejs.org/)   | Core business logic, routing, auth, and data management               |
| **Database & ORM**         | [MySQL 8](https://www.mysql.com/) / [Prisma ORM 7](https://www.prisma.io/)    | Relational storage, schema migrations, and type-safe database queries |
| **AI Microservice**        | [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11)                        | High-performance async service orchestrating AI workflows             |
| **Primary Multimodal LLM** | [Google Gemini 2.5 Flash](https://ai.google.dev/)                             | Unified text, visual context, screenshot, and scam reasoning          |
| **Vector DB / RAG**        | [Qdrant](https://qdrant.tech/) / [ChromaDB](https://www.trychroma.com/)       | Semantic similarity indexing of verified historical scam reports      |
| **Validation & Schema**    | [Zod](https://zod.dev/) & [Pydantic v2](https://docs.pydantic.dev/)           | Strict input/output validation across Node and Python services        |
| **Authentication**         | [JWT](https://jwt.io/) & [Bcrypt](https://github.com/kelektiv/node.bcrypt.js) | Secure token issuance, cookie sessions, and password encryption       |
| **API Specification**      | [Swagger](https://swagger.io/)                                                | Interactive API documentation and contract enforcement                |

---

## 🗄️ Database & Domain Model

The relational schema is managed via Prisma. Key entities include:

```mermaid
erDiagram
    USER ||--o{ SCAM_SUBMISSION : submits
    USER ||--o{ SCAM_REPORT : reviews
    USER ||--o{ COMMUNITY_POST : authors
    SCAM_SUBMISSION ||--o| SCAM_REPORT : escalates_to
    SCAM_REPORT ||--o| COMMUNITY_POST : publishes_as

    USER {
        string id PK
        string email UK
        string phone_num UK
        string passwordHash
        string name
        enum role "USER | ADMIN"
        enum status "ACTIVE | SUSPENDED | BANNED"
        datetime createdAt
    }

    SCAM_SUBMISSION {
        string id PK
        string userId FK
        string title
        string content
        string sourceUrl
        enum analysisStatus "PENDING | PROCESSING | COMPLETED | FAILED"
        enum riskLevel "LOW | MEDIUM | HIGH | CRITICAL"
        int riskScore "0-100"
        string analysisSummary
        datetime createdAt
    }

    SCAM_REPORT {
        string id PK
        string submissionId FK,UK
        enum status "PENDING | APPROVED | REJECTED"
        string reviewNote
        string reviewedById FK
        datetime reviewedAt
        datetime createdAt
    }

    COMMUNITY_POST {
        string id PK
        string reportId FK,UK
        string authorId FK
        string title
        string summary
        string content
        datetime publishedAt
    }
```

---

## 🧠 AI Subsystem & Intelligence Layer

### Single Multimodal Intelligence Pipeline

Rather than chaining separate OCR and translation steps, Banteay Digital utilizes a single multimodal model capable of reading embedded text within images, analyzing layout and branding authenticity, and detecting coercive conversational patterns in a single inference pass.

```json
{
  "submission_id": "sub_cm789abc",
  "risk_score": 92,
  "risk_level": "CRITICAL",
  "scam_category": "Banking Impersonation & Phishing",
  "confidence_score": 0.95,
  "analysis_summary": "The submitted screenshot shows a spoofed bank SMS message creating artificial urgency and directing the victim to a fraudulent credential harvesting domain.",
  "suspicious_indicators": [
    "Sender identity impersonates official banking institution",
    "Extreme psychological pressure ('Account will be permanently closed within 2 hours')",
    "External destination URL does not match official domain registry",
    "Requests sensitive OTP / login password submission"
  ],
  "prevention_recommendations": [
    "Do not click the provided URL or enter banking credentials",
    "Contact your bank directly via their official hotlines",
    "Block the sender and report the scam through Banteay Digital"
  ]
}
```

### Knowledge Retrieval (RAG)

Approved scam reports are vectorized and stored in a vector database. When a new submission arrives, the AI service queries semantically similar historical fraud patterns and provides them as few-shot context to the LLM, dramatically improving detection accuracy for regional fraud variations.

---

## 📡 API Reference Highlights

Interactive documentation is available at `http://localhost:3000/api-docs` when running locally.

| Group           | Method | Endpoint                        | Access        | Description                                         |
| :-------------- | :----- | :------------------------------ | :------------ | :-------------------------------------------------- |
| **Auth**        | `POST` | `/api/auth/register`            | Public        | Register with email or phone number                 |
| **Auth**        | `POST` | `/api/auth/login`               | Public        | Authenticate and receive JWT / Session Cookie       |
| **Auth**        | `POST` | `/api/auth/logout`              | Authenticated | Invalidate current user session                     |
| **Submissions** | `POST` | `/api/submissions`              | Authenticated | Submit suspicious content/screenshot for AI scan    |
| **Submissions** | `GET`  | `/api/submissions`              | Authenticated | List current user's submitted scans (paginated)     |
| **Submissions** | `GET`  | `/api/submissions/:id`          | Authenticated | Get detailed submission report and AI risk output   |
| **Reports**     | `POST` | `/api/reports`                  | Authenticated | Escalate an analyzed submission for admin review    |
| **Admin**       | `GET`  | `/api/admin/reports`            | Admin Only    | View moderation queue of pending scam reports       |
| **Admin**       | `POST` | `/api/admin/reports/:id/review` | Admin Only    | Approve or reject a report with review notes        |
| **Community**   | `GET`  | `/api/community/posts`          | Public        | Browse verified public fraud awareness posts        |
| **Community**   | `GET`  | `/api/community/posts/:id`      | Public        | Read full details and indicators of a verified case |

---

## 🚀 Getting Started & Local Setup

### Prerequisites

- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher
- **MySQL**: `v8.x` running locally or via Docker
- **Python** (for AI microservice): `3.10+`

---

### 1. Clone the Repository

```bash
git clone https://github.com/Sotchi10/BanteayDigital-Backend.git
cd BanteayDigital-Backend
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```env
PORT=3000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database Connection
DATABASE_URL="mysql://root:password@localhost:3306/banteay_digital"

# Authentication Secrets
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"

# AI Microservice Endpoint
AI_SERVICE_URL="http://localhost:8000"
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Database Migration & Prisma Setup

```bash
# Generate Prisma Client
npm run prisma:generate

# Push Schema to Local Database
npm run prisma:push

# (Optional) Open Prisma Studio GUI
npm run prisma:studio
```

### 5. Run the Server

```bash
# Development mode with hot-reloading
npm run dev

# Production start
npm run start
```

The backend will start at `http://localhost:3000`.

---

## 🔒 Security & Responsible AI

- **Human-in-the-Loop Safeguard:** AI outputs provide probabilistic risk indicators; public community posts require human admin verification before broad broadcast.
- **Privacy First:** User submissions can be submitted with privacy preservation. Personal identifiable information (PII) is scrubbed prior to public community posting.
- **Anti-Abuse & Rate Limiting:** Protected endpoints incorporate token verification, cookie protection, role-based access control, and schema bounds.

---

## 🗺️ Project Roadmap

- [x] **Phase 1: Backend Foundations**
  - Database schema & Prisma migrations
  - JWT + Cookie authentication with role separation
  - Scam submission, reporting, and moderation lifecycle
  - Swagger / OpenAPI 3.0 documentation
- [ ] **Phase 2: Multimodal AI Microservice**
  - FastAPI standalone service
  - Gemini 2.0 Flash multimodal prompt integration
  - Deterministic QR code parser utility
- [ ] **Phase 3: RAG Knowledge Retrieval Pipeline**
  - Vector database deployment (Qdrant / Chroma)
  - Automatic indexing of approved community scam reports
  - Semantic similarity search injection into scam prompts
- [ ] **Phase 4: Client & Ecosystem Integration**
  - React/Vite responsive web application
  - Telegram alert bot for high-impact fraud alerts
  - Localized bilingual support (Khmer & English)

---

## 👥 Authors & Acknowledgments

- **Development Team**: Banteay Digital Engineering Team ([@Sotchi10](https://github.com/Sotchi10))
- **Mission**: Safeguarding the digital community through accessible, intelligent, and transparent safety tools.

---

<p align="center">
  <b>Built with care for digital safety and fraud resilience.</b><br/>
  <sub>© 2026 Banteay Digital. All rights reserved.</sub>
</p>
