# ai-campaign-builder
Open-source tool to create RPG campaigns using a visual, modular and AI-assisted approach.
# ai-campaign-builder

ai-campaign-builder is an experimental, open-source tool to create RPG campaigns using a visual, modular and AI-assisted approach.

Instead of writing stories in a continuous chat, you build narratives by dragging and combining story blocks on a canvas.  
Each block represents a narrative concept such as themes, locations, NPCs, events or twists.  
The story is dynamically regenerated based on the structure you create.

Think of it as **"story sculpting with AI"**.

---

## ✨ Core Idea

- Visual canvas instead of chat
- Drag-and-drop narrative blocks
- Each block contributes to the final prompt
- AI regenerates only the affected parts
- Minimalist, fast and creative UX
- Local-first development
- Open for community contribution

---

## 🧱 Current Status

This project is in **early beta / prototype phase**.

Initial goals:
- Validate UX concept
- Validate modular storytelling
- Create a strong base for future extensions

---

## 🗺️ Roadmap

### Phase 1 – Visual Foundation
- [ ] React app setup
- [ ] Canvas layout
- [ ] Drag & drop system
- [ ] Basic story blocks (mocked)
- [ ] Minimal UI theme

### Phase 2 – Story Structure
- [ ] Campaign model
- [ ] Block data model
- [ ] Story serialization (JSON)
- [ ] Save/load local stories

### Phase 3 – AI Integration
- [ ] Python backend (FastAPI)
- [ ] Prompt builder from blocks
- [ ] AI story generation
- [ ] Partial regeneration (only changed sections)

### Phase 4 – UX Polish
- [ ] Animations and transitions
- [ ] Visual feedback on generation
- [ ] Theming support (dark, fantasy, arcane, etc.)

### Phase 5 – Extensibility
- [ ] Plugin system for new block types
- [ ] Support for other RPG systems
- [ ] Community blocks repository

---

## 🧠 Philosophy

ai-campaign-builder is built around three principles:

1. **Context control**  
   No endless chats. The story is built from modular intent.

2. **Visual reasoning**  
   You see the story structure, not just the result.

3. **AI as a collaborator**  
   The AI reacts to your structure instead of replacing your creativity.

---

## 🚀 Tech Stack (initial)

- Frontend: React
- Backend: Python (FastAPI)
- AI: OpenAI / Azure OpenAI (optional & pluggable)
- Storage: Local JSON (initially)

---

## 🤝 Contribution

This project is open-source and welcomes contributions:
- UI/UX improvements
- New narrative blocks
- AI prompt strategies
- Integrations with VTTs and RPG tools

---

## 📜 License

MIT License

Backend (API)

cd D:\DevRepos\ai-campaign-builder\apps\api
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
Se a porta 8000 já estiver ocupada:

.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8001
Frontend (Web)

cd D:\DevRepos\ai-campaign-builder\apps\web
npm run dev
Se usar 8001 no backend, rode o frontend com:

$env:VITE_API_URL = 'http://localhost:8001'
npm run dev 