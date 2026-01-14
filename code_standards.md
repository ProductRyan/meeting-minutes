# Code Standards & Patterns Reference

**Purpose**: AI-optimized guide for maintaining code consistency with Meetily project standards. Use this to ensure generated code passes core contributor review.

**Last Updated**: January 2026 | **Project**: Meetily (Privacy-first AI Meeting Assistant)

---

## Quick Navigation

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Backend Standards](#backend-standards)
- [Frontend Standards](#frontend-standards)
- [Database Patterns](#database-patterns)
- [API Design](#api-design)
- [Security Practices](#security-practices)
- [Available Scripts](#available-scripts)
- [Terminology Index](#terminology-index)
- [Common Patterns](#common-patterns)

---

## Project Overview

**Meetily**: Privacy-first, locally-hosted AI meeting assistant. All processing occurs on user's machine—no cloud data transmission. Desktop app (Tauri + React) with FastAPI backend and Whisper.cpp transcription engine.

**Core Philosophy**:
- Local-first processing
- Open-source, enterprise-ready
- Multi-provider LLM support (Claude, Ollama, Groq, OpenAI)
- Structured meeting summaries with clear action items

---

## Tech Stack

| Layer | Technologies |
|-------|---|
| **Desktop App** | Tauri 2.x (Rust) + Next.js 14 + React 18 + TypeScript |
| **Backend API** | FastAPI (async) + SQLite (aiosqlite) + Pydantic |
| **Audio/Transcription** | Rust (cpal) + Whisper.cpp + VAD filtering |
| **Frontend Styling** | Tailwind CSS + shadcn UI |
| **Block Editor** | BlockNote (customizable) |
| **State Management** | React Context API |
| **Tauri IPC** | Rust ↔ TypeScript command/event system |

---

## Backend Standards

### File Structure & Organization

```
backend/
├── app/
│   ├── main.py                  # FastAPI app, endpoints, error handling
│   ├── db.py                    # DatabaseManager singleton, SQL operations
│   ├── schema_validator.py      # Schema validation, migrations
│   └── transcript_processor.py  # AI processing, chunking, providers
├── requirements.txt             # Python dependencies
├── Dockerfile*                  # Docker images (app, cpu, gpu, macos)
└── docker-compose.yml           # Multi-service orchestration
```

### Python Code Style

**Naming Conventions**:
- Functions/methods/variables: `snake_case`
- Classes: `PascalCase`
- Constants: `CONSTANT_CASE`
- Async functions: `async def function_name(...)`
- Private methods: `_private_method()`

**Docstring Format** (Google-style):
```python
async def process_transcript(
    self, 
    text: str, 
    model: str,
    model_name: str,
    chunk_size: Optional[int] = 5000,
    overlap: Optional[int] = 1000
) -> Tuple[int, List[str]]:
    """
    Process transcript text into chunks and generate structured summaries.
    
    Args:
        text: The transcript text to process.
        model: AI provider ('claude', 'ollama', 'groq', 'openai').
        model_name: Specific model identifier.
        chunk_size: Characters per chunk. Defaults to 5000.
        overlap: Characters repeated between chunks. Defaults to 1000.
        
    Returns:
        Tuple of (num_chunks, list_of_json_summaries).
        
    Raises:
        ValueError: If model configuration is missing.
        HTTPException: For API errors (converted from exceptions).
    """
```

### Pydantic Models (Request/Response)

Always use Pydantic for validation:

```python
from pydantic import BaseModel, Field
from typing import Optional

class TranscriptRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Transcript content")
    model: str = Field(..., description="Provider: claude, ollama, groq, openai")
    model_name: str = Field(..., description="Model identifier")
    meeting_id: str
    chunk_size: Optional[int] = Field(5000, ge=1000, le=10000)
    overlap: Optional[int] = Field(1000, ge=0)
    custom_prompt: Optional[str] = None

class TranscriptResponse(BaseModel):
    id: str
    text: str
    timestamp: str
    audio_start_time: Optional[float] = None
    audio_end_time: Optional[float] = None
```

### Error Handling Pattern

```python
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)

async def process_endpoint(request: TranscriptRequest):
    try:
        # Attempt operation
        result = await processor.process_transcript(
            text=request.text,
            model=request.model,
            model_name=request.model_name
        )
        return {"status": "success", "result": result}
    
    except ValueError as e:
        # Configuration/validation errors
        logger.error(f"Validation error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))
    
    except Exception as e:
        # Unexpected errors
        logger.error(f"Processing error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
```

**Key Rules**:
1. Catch specific exceptions first, general exceptions last
2. Always log with `exc_info=True` for stack traces
3. Never leak sensitive info (API keys, paths) in error messages
4. Use appropriate HTTP status codes (400 validation, 500 server, 401 auth)

### Logging Configuration

```python
import logging

# In main.py or app initialization
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - [%(filename)s:%(lineno)d - %(funcName)s()] - %(message)s'
)
```

**Logging Standards**:
- `logger.debug()`: Development details, variable values
- `logger.info()`: Important state changes, operation completion
- `logger.warning()`: Recoverable issues, deprecated patterns
- `logger.error()`: Failures that affect operation, with `exc_info=True`

### FastAPI Endpoints Pattern

```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Meetily API", version="1.0")

# CORS: restricted in production, open in development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: restrict to tauri://localhost in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=3600,
)

@app.post("/api/transcripts/process")
async def process_transcript(request: TranscriptRequest) -> dict:
    """Process and summarize transcript."""
    # Implementation using try-except pattern above
    pass

@app.get("/api/health")
async def health_check() -> dict:
    """Simple health check endpoint."""
    return {"status": "healthy"}
```

### Async/Await Standards

- Always use `async def` for I/O-bound operations (DB, API calls)
- Use `await` for async operations
- Avoid blocking operations in async contexts
- Use `asynccontextmanager` for resource management

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def get_db_connection():
    conn = await aiosqlite.connect(db_path)
    try:
        yield conn
    finally:
        await conn.close()
```

---

## Frontend Standards

### File Structure & Organization

```
frontend/
├── src/
│   ├── app/                     # Next.js pages (App Router)
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   └── [routes]/
│   ├── components/              # Reusable React components
│   │   ├── Recording/
│   │   ├── TranscriptView/
│   │   ├── AISummary/
│   │   └── ui/                  # shadcn UI components
│   ├── contexts/                # React Context providers
│   │   ├── ConfigContext.tsx
│   │   ├── RecordingStateContext.tsx
│   │   └── TranscriptContext.tsx
│   ├── hooks/                   # Custom React hooks
│   │   ├── useRecording.ts
│   │   ├── useTranscript.ts
│   │   └── useAIProcessing.ts
│   ├── services/                # Tauri & API service layer
│   │   ├── TranscriptService.ts
│   │   ├── StorageService.ts
│   │   └── ConfigService.ts
│   ├── types/                   # TypeScript interfaces
│   │   ├── transcript.ts
│   │   ├── summary.ts
│   │   └── config.ts
│   ├── lib/                     # Utilities (audio, analytics, etc.)
│   │   ├── audio/
│   │   └── analytics/
│   └── public/                  # Static assets
├── src-tauri/                   # Rust Tauri backend
├── components.json              # shadcn UI config
├── tailwind.config.js           # Tailwind CSS config
├── tsconfig.json                # TypeScript strict mode enabled
└── package.json                 # Dependencies
```

### TypeScript/React Naming Conventions

- **Components**: `PascalCase` (e.g., `RecordingButton.tsx`)
- **Hooks**: `useFeatureName` (e.g., `useRecording.ts`)
- **Functions/variables**: `camelCase`
- **Interfaces/Types**: `PascalCase`, no `I` prefix (e.g., `TranscriptUpdate`, not `ITranscriptUpdate`)
- **Services**: `ServiceName.ts` (e.g., `TranscriptService.ts`)
- **Contexts**: `FeatureContext.tsx` with `useFeature()` hook

### React Component Pattern

```typescript
'use client'; // Required for client components in Next.js App Router

import React, { useState, useCallback } from 'react';
import { useConfig } from '@/contexts/ConfigContext';
import { transcriptService } from '@/services/TranscriptService';

interface ComponentProps {
  meetingId: string;
  onUpdate?: (data: any) => void;
}

/**
 * RecordingButton Component
 *
 * Handles user interaction for starting/stopping recording.
 * Manages recording state via context.
 */
export function RecordingButton({ meetingId, onUpdate }: ComponentProps) {
  const { config } = useConfig();
  const [isLoading, setIsLoading] = useState(false);
  
  const handleClick = useCallback(async () => {
    try {
      setIsLoading(true);
      // Implementation
    } catch (error) {
      console.error('Recording failed:', error);
      // Error handling
    } finally {
      setIsLoading(false);
    }
  }, [meetingId, config]);
  
  return (
    <button onClick={handleClick} disabled={isLoading}>
      {isLoading ? 'Starting...' : 'Start Recording'}
    </button>
  );
}
```

### Custom Hook Pattern

```typescript
import { useCallback, useEffect, useState } from 'react';
import { transcriptService } from '@/services/TranscriptService';
import { TranscriptUpdate } from '@/types/transcript';

export function useTranscript(meetingId: string) {
  const [transcript, setTranscript] = useState<TranscriptUpdate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!meetingId) return;
    
    const loadTranscript = async () => {
      try {
        setLoading(true);
        setError(null);
        // Implementation
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    
    loadTranscript();
  }, [meetingId]);
  
  return { transcript, loading, error };
}
```

### Context API Pattern

```typescript
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ConfigContextType {
  config: AppConfig;
  updateConfig: (config: Partial<AppConfig>) => void;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  
  const updateConfig = (partial: Partial<AppConfig>) => {
    setConfig(prev => ({ ...prev, ...partial }));
  };
  
  return (
    <ConfigContext.Provider value={{ config, updateConfig }}>
      {children}
    </ConfigContext.Provider>
  );
}

// Hook for consuming context
export function useConfig(): ConfigContextType {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within ConfigProvider');
  }
  return context;
}
```

### Tauri Service Pattern

```typescript
/**
 * TranscriptService
 *
 * Wrapper for Tauri backend commands and event listeners.
 * Uses singleton pattern for consistent service instance.
 */
import { invoke, listen, type UnlistenFn } from '@tauri-apps/api/core';
import { TranscriptUpdate, Transcript } from '@/types/transcript';

export class TranscriptService {
  /**
   * Listen for real-time transcript updates
   * @param callback Function to call on new transcript segment
   * @returns Unlistener function
   */
  async onTranscriptUpdate(
    callback: (update: TranscriptUpdate) => void
  ): Promise<UnlistenFn> {
    return await listen('transcript-update', (event) => {
      callback(event.payload as TranscriptUpdate);
    });
  }
  
  /**
   * Invoke Rust backend command
   */
  async getTranscriptHistory(): Promise<Transcript[]> {
    try {
      return await invoke('get_transcript_history');
    } catch (error) {
      throw new Error(`Failed to fetch transcripts: ${error}`);
    }
  }
}

// Singleton instance
export const transcriptService = new TranscriptService();
```

### Type Definitions Pattern

```typescript
// types/transcript.ts
export interface Transcript {
  id: string;
  text: string;
  timestamp: string;        // Wall-clock time
  audio_start_time?: number; // Seconds from recording start
  audio_end_time?: number;
  duration?: number;
  confidence?: number;
}

export interface TranscriptUpdate extends Transcript {
  source: string;           // 'whisper', 'vad', 'chunk'
  sequence_id: number;      // Order in stream
  is_partial: boolean;      // Still being transcribed?
}

export interface Block {
  id: string;
  type: 'bullet' | 'heading1' | 'heading2' | 'text';
  content: string;
  color?: string;
}

export interface SummarySection {
  title: string;
  blocks: Block[];
}
```

### Styling with Tailwind & shadcn

```typescript
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function SummaryCard({ title, content }: { title: string; content: string }) {
  return (
    <Card className="w-full p-6 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        {title}
      </h2>
      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
        {content}
      </p>
      
      <Button 
        className="mt-4"
        variant="outline"
        onClick={() => { /* handle */ }}
      >
        View Details
      </Button>
    </Card>
  );
}
```

**Tailwind Best Practices**:
- Use semantic spacing (px-4, py-2, not px-16, py-8)
- Use utility-first approach, avoid custom CSS
- Use dark mode classes for light/dark theme support
- Responsive prefixes: `sm:`, `md:`, `lg:` for mobile-first design
- Color palette: slate (primary), sky/blue (accents), emerald/red (states)

---

## Database Patterns

### Connection Management

```python
# backend/app/db.py
from contextlib import asynccontextmanager
import aiosqlite

class DatabaseManager:
    def __init__(self, db_path: str):
        self.db_path = db_path
    
    @asynccontextmanager
    async def get_connection(self):
        """Context manager for database connections."""
        conn = await aiosqlite.connect(self.db_path)
        try:
            yield conn
        finally:
            await conn.close()
    
    async def execute(self, query: str, params: tuple = ()) -> Any:
        """Execute query with parameterized statements (prevents SQL injection)."""
        async with self.get_connection() as conn:
            cursor = await conn.execute(query, params)
            return await cursor.fetchall()
```

### Schema Initialization & Migration Pattern

```python
async def create_tables(self):
    """Create tables with schema validation and backward compatibility."""
    queries = [
        # meetings table
        """
        CREATE TABLE IF NOT EXISTS meetings (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            duration_seconds REAL,
            folder_path TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """,
        # transcripts table
        """
        CREATE TABLE IF NOT EXISTS transcripts (
            id TEXT PRIMARY KEY,
            meeting_id TEXT NOT NULL,
            text TEXT,
            timestamp TEXT,
            audio_start_time REAL,
            audio_end_time REAL,
            FOREIGN KEY (meeting_id) REFERENCES meetings(id)
        )
        """
    ]
    
    async with self.get_connection() as conn:
        for query in queries:
            await conn.execute(query)
        await conn.commit()
        
        # Add new columns with backward compatibility
        try:
            await conn.execute("ALTER TABLE meetings ADD COLUMN status TEXT DEFAULT 'active'")
            await conn.commit()
        except aiosqlite.OperationalError:
            pass  # Column already exists

# Use schema validator
from app.schema_validator import SchemaValidator
validator = SchemaValidator(db_manager)
validator.validate_schema()
```

### Query Pattern (Parameterized)

```python
async def get_transcript_by_meeting(self, meeting_id: str) -> List[Transcript]:
    """Retrieve transcripts using parameterized query (safe from SQL injection)."""
    query = "SELECT * FROM transcripts WHERE meeting_id = ? ORDER BY timestamp"
    async with self.get_connection() as conn:
        cursor = await conn.execute(query, (meeting_id,))
        rows = await cursor.fetchall()
        return [Transcript(**row) for row in rows]

async def update_transcript(self, transcript_id: str, text: str, timestamp: str):
    """Update with parameterized statement."""
    query = "UPDATE transcripts SET text = ?, timestamp = ? WHERE id = ?"
    async with self.get_connection() as conn:
        await conn.execute(query, (text, timestamp, transcript_id))
        await conn.commit()
```

**Key Rules**:
1. Always use `?` placeholders in SQL (not f-strings)
2. Wrap critical operations in try-except
3. Call `await conn.commit()` after INSERT/UPDATE/DELETE
4. Use context managers for connection cleanup

---

## API Design

### Endpoint Naming Convention

```
POST   /api/transcripts/process      # Action: submit job
GET    /api/transcripts/{id}         # Resource: fetch one
GET    /api/meetings                 # Resource: list all
POST   /api/summaries/generate       # Action: create
DELETE /api/transcripts/{id}         # Resource: delete
```

### Request/Response Structure

**Standard Success Response**:
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "result": "..."
  },
  "timestamp": "2026-01-13T10:30:00Z"
}
```

**Standard Error Response**:
```json
{
  "status": "error",
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Missing required field: model",
    "details": null
  },
  "timestamp": "2026-01-13T10:30:00Z"
}
```

### Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad request (validation error)
- `401`: Unauthorized
- `404`: Not found
- `500`: Internal server error

### Query Parameters & Filtering

```
GET /api/meetings?limit=10&offset=0&sort=timestamp&order=desc
GET /api/transcripts?meeting_id=uuid&status=complete
```

---

## Security Practices

### API Key Management

**Development**: Environment variables (`.env` file, gitignored)
```bash
# .env
ANTHROPIC_API_KEY=sk-...
GROQ_API_KEY=gsk-...
OPENAI_API_KEY=sk-...
```

**Runtime**: SQLite settings table with per-provider columns
```python
async def get_api_key(self, provider: str) -> Optional[str]:
    """Retrieve API key for provider from settings."""
    query = f"SELECT {provider}_api_key FROM settings WHERE id = 1"
    # Use only configured keys, never hardcode

async def set_api_key(self, provider: str, key: str):
    """Store API key securely."""
    if not key or len(key) < 20:
        raise ValueError("Invalid API key format")
    query = f"UPDATE settings SET {provider}_api_key = ? WHERE id = 1"
    async with self.get_connection() as conn:
        await conn.execute(query, (key,))
        await conn.commit()
```

### Never Log Sensitive Data

```python
# ❌ BAD
logger.info(f"API Key: {api_key}")

# ✅ GOOD
logger.info(f"API Key set for provider: {provider} (length: {len(api_key)})")
```

### CORS Configuration

```python
# Development: Allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Production: Restrict to Tauri origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["tauri://localhost"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type"],
)
```

### Docker Security

```dockerfile
FROM python:3.11-slim

# Create non-root user
RUN useradd -m -u 1000 appuser

# Set working directory with proper permissions
WORKDIR /app
RUN chown -R appuser:appuser /app

# Copy application
COPY --chown=appuser:appuser . .

# Switch to non-root user
USER appuser

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "5167"]
```

### Audio Data Handling

- **Local processing only**: No audio sent to external servers
- **File-based storage**: User's local filesystem
- **User consent**: Opt-in for analytics/telemetry
- **Configurable retention**: Allow deletion of meetings and transcripts

---

## Available Scripts

### Backend Setup & Deployment

| Script | Purpose | OS |
|--------|---------|-----|
| `backend/setup-db.sh` | Initialize database schema | macOS/Linux |
| `backend/setup-db.ps1` | Initialize database schema | Windows |
| `backend/start_python_backend.cmd` | Run FastAPI server | Windows |
| `backend/clean_start_backend.sh` | Clean install & start backend | macOS/Linux |
| `backend/clean_start_backend.cmd` | Clean install & start backend | Windows |
| `backend/build-docker.sh` | Build Docker image | macOS/Linux |
| `backend/build-docker.ps1` | Build Docker image | Windows |
| `backend/run-docker.sh` | Run Docker container | macOS/Linux |
| `backend/run-docker.ps1` | Run Docker container | Windows |
| `backend/download-ggml-model.sh` | Download Whisper model | macOS/Linux |
| `backend/download-ggml-model.cmd` | Download Whisper model | Windows |

**Start Backend Locally**:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 5167
```

### Frontend Setup & Development

| Script | Purpose | OS |
|--------|---------|-----|
| `frontend/clean_build.sh` | Clean install & build | macOS/Linux |
| `frontend/clean_run.sh` | Clean install & run dev | macOS/Linux |
| `frontend/dev-gpu.sh` | Dev with GPU acceleration | macOS/Linux |
| `frontend/dev-gpu.ps1` | Dev with GPU acceleration | Windows |
| `frontend/build-gpu.sh` | Build for GPU | macOS/Linux |
| `frontend/build-gpu.ps1` | Build for GPU | Windows |
| `package-app.sh` | Package Tauri app | macOS/Linux |

**Start Frontend Development**:
```bash
cd frontend

# Install dependencies
pnpm install

# Run dev server (metal acceleration on macOS)
pnpm run tauri:dev:metal

# Or standard dev
pnpm run dev
```

**npm/pnpm Scripts** (frontend/package.json):
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "tauri:dev": "tauri dev",
    "tauri:dev:metal": "tauri dev -- --features metal",
    "tauri:dev:coreml": "tauri dev -- --features coreml",
    "tauri:build": "tauri build",
    "lint": "eslint . --ext .ts,.tsx"
  }
}
```

### Database Migrations

**Manual SQL Execution**:
```python
# In Python console or script
import asyncio
from app.db import DatabaseManager

async def migrate():
    db = DatabaseManager("path/to/meeting_minutes.sqlite")
    async with db.get_connection() as conn:
        # Add new column
        await conn.execute("""
            ALTER TABLE meetings ADD COLUMN status TEXT DEFAULT 'active'
        """)
        await conn.commit()

asyncio.run(migrate())
```

**Automatic Schema Validation** (on startup):
```python
from app.schema_validator import SchemaValidator

db = DatabaseManager("...")
validator = SchemaValidator(db)
validator.validate_schema()  # Checks/fixes schema on boot
```

---

## Terminology Index

### Audio Processing Terms

- **VAD (Voice Activity Detection)**: Filter removing silence/background noise before sending to Whisper
- **Ring Buffer**: Asynchronous audio accumulation for simultaneous recording and mixing
- **RMS-Based Ducking**: Dynamic volume balancing between microphone input and system audio
- **Transcription Path**: VAD-filtered audio → Whisper engine
- **Recording Path**: Professionally mixed audio (mic + system) → file storage

### LLM & Processing Terms

- **Provider**: External LLM service (Ollama, Claude/Anthropic, Groq, OpenAI, OpenRouter)
- **Model Name**: Specific model identifier (e.g., `gpt-4o-2024-11-20`, `claude-3-5-sonnet-20241022`, `qwen2.5:14b`)
- **Chunk Size**: Characters per text segment for processing (default: 5000, range: 1000-10000)
- **Overlap**: Characters repeated between consecutive chunks to maintain context (default: 1000)
- **Custom Prompt**: User-defined instruction prepended to summary request
- **Streaming**: Real-time token generation (vs. batch)

### Meeting Summary Sections

- **People**: Meeting participants with identified roles
- **SessionSummary**: High-level 2-3 sentence overview
- **CriticalDeadlines**: Time-sensitive deliverables with dates
- **KeyItemsDecisions**: Important conclusions, decisions, agreements
- **ImmediateActionItems**: To-do list with assigned owners
- **NextSteps**: Future discussions, meetings, or follow-ups
- **MeetingNotes**: Detailed section-by-section notes with timestamps

### Database/System Terms

- **Meeting**: Container for recording, transcripts, and summaries (unique ID, timestamps, folder path)
- **Transcript**: Raw meeting text with timestamps and optional audio sync markers
- **Summary**: Structured AI-generated document with sections
- **Transcript Chunk**: Processed segment of text for AI summarization
- **Status**: Meeting state (IDLE, RECORDING, STOPPING, TRANSCRIBING, SAVING, COMPLETE)
- **Provider Config**: API keys and model preferences stored per user
- **Folder Path**: Optional user-selected directory for organizing meetings

### Technology Acronyms

- **Tauri**: Desktop app framework combining Rust backend + web frontend
- **Whisper.cpp**: C++ implementation of OpenAI's speech recognition model
- **FastAPI**: Async Python web framework with automatic API docs
- **aiosqlite**: Async SQLite driver for Python
- **Pydantic**: Type validation and serialization library
- **BlockNote**: Customizable block-based editor (Notion-like)
- **shadcn**: Unstyled, accessible React component library
- **cpal**: Cross-platform audio library for Rust

---

## Common Patterns

### Pattern: Async Processing with Status Tracking

Use for long-running operations (summarization, transcription):

```python
# backend/app/main.py
@app.post("/api/summaries/generate-async")
async def generate_summary_async(request: TranscriptRequest) -> dict:
    """Start async summary generation, return process ID."""
    process_id = uuid.uuid4().hex
    
    # Store process record
    await db.execute("""
        INSERT INTO summary_processes 
        (id, meeting_id, status, created_at)
        VALUES (?, ?, 'pending', datetime('now'))
    """, (process_id, request.meeting_id))
    
    # Start background task
    asyncio.create_task(
        processor.background_process_summary(process_id, request)
    )
    
    return {"process_id": process_id, "status": "pending"}

@app.get("/api/summaries/process/{process_id}")
async def get_process_status(process_id: str) -> dict:
    """Check status of async operation."""
    rows = await db.execute(
        "SELECT * FROM summary_processes WHERE id = ?",
        (process_id,)
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Process not found")
    
    process = rows[0]
    return {
        "id": process['id'],
        "status": process['status'],
        "result": process['result'],  # JSON when complete
        "error": process['error'],
        "created_at": process['created_at']
    }
```

### Pattern: Real-Time Event Streaming (Tauri)

Use for live updates (transcription, processing progress):

**Rust Backend** (src-tauri):
```rust
#[tauri::command]
async fn start_transcription(app: AppHandle, meeting_id: String) {
    // Spawn background task
    tokio::spawn(async move {
        // Simulate streaming updates
        for i in 1..=10 {
            let segment = format!("Transcript segment {}", i);
            
            // Emit event to frontend
            app.emit(
                "transcript-update",
                serde_json::json!({
                    "id": format!("chunk_{}", i),
                    "text": segment,
                    "sequence_id": i,
                    "is_partial": i < 10
                })
            ).ok();
            
            tokio::time::sleep(Duration::from_millis(500)).await;
        }
        
        app.emit("transcription-complete", json!({})).ok();
    });
}
```

**React Frontend** (frontend/src):
```typescript
export function useTranscriptionStream(meetingId: string) {
  const [segments, setSegments] = useState<TranscriptUpdate[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  
  useEffect(() => {
    let unlistenUpdate: UnlistenFn;
    let unlistenComplete: UnlistenFn;
    
    (async () => {
      // Listen for transcript updates
      unlistenUpdate = await listen(
        'transcript-update',
        (event) => {
          setSegments(prev => [...prev, event.payload as TranscriptUpdate]);
        }
      );
      
      // Listen for completion
      unlistenComplete = await listen(
        'transcription-complete',
        () => setIsComplete(true)
      );
    })();
    
    return () => {
      unlistenUpdate?.();
      unlistenComplete?.();
    };
  }, [meetingId]);
  
  return { segments, isComplete };
}
```

### Pattern: Multi-Provider LLM Abstraction

```python
# backend/app/transcript_processor.py
class AIProvider:
    async def summarize(self, text: str, prompt: str) -> str:
        """To be implemented by subclasses."""
        raise NotImplementedError

class AnthropicProvider(AIProvider):
    def __init__(self, api_key: str):
        self.client = Anthropic(api_key=api_key)
    
    async def summarize(self, text: str, prompt: str) -> str:
        message = await self.client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2000,
            messages=[
                {"role": "user", "content": f"{prompt}\n\n{text}"}
            ]
        )
        return message.content[0].text

class OllamaProvider(AIProvider):
    def __init__(self, model_name: str = "neural-chat"):
        self.model = model_name
        self.base_url = "http://localhost:11434"
    
    async def summarize(self, text: str, prompt: str) -> str:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/generate",
                json={"model": self.model, "prompt": f"{prompt}\n\n{text}"}
            )
            return response.json()['response']

# Factory pattern
def get_provider(model_type: str, model_name: str, api_key: str) -> AIProvider:
    if model_type == "claude":
        return AnthropicProvider(api_key)
    elif model_type == "ollama":
        return OllamaProvider(model_name)
    # ... other providers
    else:
        raise ValueError(f"Unknown provider: {model_type}")
```

### Pattern: Configuration Persistence (React Context + Tauri Storage)

```typescript
// frontend/src/contexts/ConfigContext.tsx
const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Load from Tauri storage on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await configService.loadConfig();
        setConfig(saved);
      } catch (error) {
        console.error('Failed to load config:', error);
        setConfig(DEFAULT_CONFIG);
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  
  const updateConfig = async (partial: Partial<AppConfig>) => {
    const updated = { ...config!, ...partial };
    try {
      await configService.saveConfig(updated);
      setConfig(updated);
    } catch (error) {
      console.error('Failed to save config:', error);
      throw error;
    }
  };
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <ConfigContext.Provider value={{ config: config!, updateConfig }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be within ConfigProvider');
  }
  return context;
}
```

---

## Quick Checklist for AI Code Generation

Before submitting code generated with AI, verify:

**Python Backend**:
- [ ] Async functions use `async def` and `await`
- [ ] Pydantic models used for all request/response validation
- [ ] Try-except with specific exceptions caught first
- [ ] Logging includes file/line/function context
- [ ] SQL uses parameterized queries (`?` placeholders)
- [ ] Sensitive data (API keys) never logged
- [ ] Docstrings follow Google-style format
- [ ] Error messages safe for user display

**React Frontend**:
- [ ] Components in functional style with hooks
- [ ] Custom hooks for reusable logic
- [ ] Context API for global state
- [ ] Tauri commands used for backend calls
- [ ] TypeScript interfaces for all data shapes
- [ ] Error boundaries or try-catch in async operations
- [ ] Cleanup functions in useEffect (unlisteners, timers)
- [ ] Accessible components (aria labels, semantic HTML)
- [ ] Tailwind classes for styling (no inline CSS)

**General**:
- [ ] File organized in correct directory
- [ ] Naming follows conventions (snake_case Python, camelCase/PascalCase TypeScript)
- [ ] Comments explain "why", not "what"
- [ ] No hardcoded values (use constants/config)
- [ ] Tests considered (if applicable)

---

## References & Key Files

| Category | Files |
|----------|-------|
| **Contribution Guide** | [CONTRIBUTING.md](CONTRIBUTING.md) |
| **AI Development Guide** | [CLAUDE.md](CLAUDE.md) |
| **API Documentation** | [backend/API_DOCUMENTATION.md](backend/API_DOCUMENTATION.md) |
| **Architecture Docs** | [docs/architecture.md](docs/architecture.md), [docs/BUILDING.md](docs/BUILDING.md) |
| **Backend Setup** | [backend/README.md](backend/README.md) |
| **Frontend Setup** | [frontend/README.md](frontend/README.md) |
| **Build Scripts** | [backend/SCRIPTS_DOCUMENTATION.md](backend/SCRIPTS_DOCUMENTATION.md) |

---

**Last Updated**: January 2026 | **Maintained By**: Core Contributors | **For AI Assistants**: Use this as primary reference for code generation consistency
