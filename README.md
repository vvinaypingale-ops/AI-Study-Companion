# EduMind Pro — Backend

RAG-powered AI Study Companion Backend  
**Stack:** Node.js · Express · MongoDB · ChromaDB · Gemini/OpenAI/Ollama

---

## Folder Structure

```
edumind-backend/
├── src/
│   ├── server.js               ← Entry point
│   ├── config/
│   │   ├── env.js              ← All env vars
│   │   ├── database.js         ← MongoDB connection
│   │   └── vectorstore.js      ← ChromaDB connection
│   ├── models/
│   │   ├── User.js             ← User profile, performance, streak
│   │   ├── Quiz.js             ← Quiz questions + results
│   │   ├── Mistake.js          ← Wrong answers log
│   │   ├── Chat.js             ← Chat session history
│   │   ├── Document.js         ← Uploaded study files
│   │   └── Reminder.js         ← Exam/study reminders
│   ├── routes/
│   │   ├── auth.js             ← Register / Login / Me
│   │   ├── user.js             ← Profile, Notes, Reminders, Tasks
│   │   ├── chat.js             ← RAG-powered AI tutor chat
│   │   ├── quiz.js             ← AI quiz generation + submission
│   │   ├── upload.js           ← PDF/DOCX upload → vector store
│   │   ├── plan.js             ← AI study plan + recommendations
│   │   ├── progress.js         ← Stats, streak, pomodoro
│   │   └── mistakes.js         ← Mistake log + AI revision
│   ├── services/
│   │   ├── llm.js              ← LLM client (Gemini/OpenAI/Ollama)
│   │   ├── embeddings.js       ← Text → vectors
│   │   ├── rag.js              ← Chunk, embed, store, retrieve
│   │   └── parser.js           ← Extract text from PDF/DOCX/TXT
│   ├── middleware/
│   │   └── auth.js             ← JWT protect middleware
│   └── utils/                  ← (add helpers here)
├── uploads/                    ← Temp file storage
├── tests/                      ← Add tests here
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## How RAG Works Here

```
Student uploads PDF/DOCX
        ↓
  Text extracted (pdf-parse / mammoth)
        ↓
  Split into 500-char chunks (80 overlap)
        ↓
  Each chunk → embedding vector (Gemini/OpenAI/Ollama)
        ↓
  Vectors stored in ChromaDB with metadata
  { userId, subject, docId, filename, chunkIndex }
        ↓
When student asks a question or takes a quiz:
        ↓
  Query → embedding → similarity search in ChromaDB
        ↓
  Top 5 most relevant chunks retrieved
        ↓
  Chunks injected into LLM prompt as context
        ↓
  LLM answers using student's own notes ✅
```

---

## Quick Start

### 1. Prerequisites

| Tool | Install |
|---|---|
| Node.js 18+ | nodejs.org |
| MongoDB | mongodb.com or `brew install mongodb-community` |
| ChromaDB | `pip install chromadb` then `chroma run` |

### 2. Install & Configure

```bash
# Clone and install
cd edumind-backend
npm install

# Copy env file
cp .env.example .env

# Edit .env — add your keys:
# GEMINI_API_KEY=AIzaSy...   (get free at aistudio.google.com)
# MONGO_URI=mongodb://localhost:27017/edumind
# JWT_SECRET=any_long_random_string
```

### 3. Start Services

```bash
# Terminal 1 — MongoDB
mongod

# Terminal 2 — ChromaDB
chroma run --path ./chroma_data

# Terminal 3 — EduMind Backend
npm run dev
```

Server runs at: **http://localhost:5000**

---

## API Reference

### Auth
| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/auth/register` | name, email, password, subjects[] | Register |
| POST | `/api/auth/login` | email, password | Login → JWT |
| GET  | `/api/auth/me` | — | Get current user |

> All routes below require: `Authorization: Bearer <token>`

### Chat (RAG-powered)
| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/chat` | message, topic, sessionId? | Send message → AI reply |
| GET  | `/api/chat/sessions` | — | List all chat sessions |
| GET  | `/api/chat/history/:id` | — | Get session messages |

### Quiz
| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/quiz/generate` | subject, difficulty, count, focus | Generate AI quiz |
| POST | `/api/quiz/:id/submit` | answers[{questionIndex, selectedOption}] | Submit quiz |
| GET  | `/api/quiz/history` | — | Past quiz results |
| GET  | `/api/quiz/:id` | — | Get one quiz |

### Document Upload (RAG Ingestion)
| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/upload` | file (multipart), subject | Upload PDF/DOCX |
| GET  | `/api/upload` | — | List uploaded docs |
| DELETE | `/api/upload/:id` | — | Delete doc + vectors |

### Study Plan
| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/plan/generate` | — | Generate 7-day plan |
| POST | `/api/plan/recommendations` | — | Get AI recommendations |

### Progress
| Method | Endpoint | Body | Description |
|---|---|---|---|
| GET  | `/api/progress` | — | Full progress summary |
| PATCH | `/api/progress/streak` | — | Mark today active |
| PATCH | `/api/progress/pomodoro` | type (focus/break) | Save pomodoro session |

### Mistakes
| Method | Endpoint | Body | Description |
|---|---|---|---|
| GET  | `/api/mistakes` | ?subject= | Get mistake log |
| POST | `/api/mistakes/revise` | subject? | AI explains mistakes (RAG) |
| PATCH | `/api/mistakes/:id/reviewed` | — | Mark reviewed |
| DELETE | `/api/mistakes/:id` | — | Delete a mistake |

### User
| Method | Endpoint | Body | Description |
|---|---|---|---|
| GET  | `/api/user/profile` | — | Get profile |
| PATCH | `/api/user/profile` | fields to update | Update profile |
| GET  | `/api/user/notes` | — | Get notes |
| POST | `/api/user/notes` | title, body, subject | Add note |
| DELETE | `/api/user/notes/:index` | — | Delete note |
| GET  | `/api/user/reminders` | — | Get reminders |
| POST | `/api/user/reminders` | title, date, type, subject | Add reminder |
| DELETE | `/api/user/reminders/:id` | — | Delete reminder |

---

## LLM Provider Options

Edit `LLM_PROVIDER` in `.env`:

| Provider | Cost | Setup |
|---|---|---|
| `gemini` | **Free** (1500 req/day) | aistudio.google.com → API Key |
| `openai` | Paid (~$0.01/req) | platform.openai.com → API Key |
| `ollama` | **Free** (local) | ollama.ai → `ollama pull llama3` |

Same for `EMBED_PROVIDER` — controls which model generates vectors.

---

## Next Steps (Frontend Integration)

1. Call `POST /api/auth/register` on signup → save JWT in localStorage
2. Send `Authorization: Bearer <token>` header on all requests
3. Upload study PDFs via `POST /api/upload` with `multipart/form-data`
4. Use `POST /api/chat` for the AI tutor (pass `sessionId` to maintain history)
5. Use `POST /api/quiz/generate` then `POST /api/quiz/:id/submit`
6. Call `GET /api/progress` to update dashboard charts

---

## Environment Variables Reference

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/edumind` |
| `JWT_SECRET` | Secret for signing tokens | — (required) |
| `LLM_PROVIDER` | `gemini` / `openai` / `ollama` | `gemini` |
| `GEMINI_API_KEY` | Google Gemini API key | — |
| `OPENAI_API_KEY` | OpenAI API key | — |
| `EMBED_PROVIDER` | Embedding model provider | `gemini` |
| `CHROMA_URL` | ChromaDB server URL | `http://localhost:8000` |
| `CHROMA_COLLECTION` | Collection name in Chroma | `edumind_docs` |
| `UPLOAD_DIR` | Temp directory for uploads | `./uploads` |
| `MAX_FILE_SIZE_MB` | Max upload size | `20` |
