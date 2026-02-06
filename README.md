# 🎵 Strudel Studio

AI-powered music IDE for creating live-coded electronic music with [Strudel](https://strudel.cc).

## Features

- 💬 **Chat Interface** — Describe the music you want in natural language
- 📝 **Code Editor** — Syntax-highlighted Strudel code with live editing
- 🎧 **Playback Controls** — Play, stop, and adjust volume
- 🤖 **AI Generation** — GPT-4 powered music generation

## Getting Started

### Prerequisites

- Node.js 18+
- OpenAI API key

### Installation

```bash
# Clone the repo
git clone https://github.com/YNCK000/strudel-studio.git
cd strudel-studio

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Add your OPENAI_API_KEY to .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start creating music!

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **State:** Zustand
- **Editor:** CodeMirror 6
- **AI:** OpenAI GPT-4

## Usage

1. Type a prompt like "Make me a techno beat at 130 BPM"
2. Watch the AI generate Strudel code
3. Click Play to hear your creation
4. Edit the code directly to tweak
5. Iterate with follow-up prompts

## Example Prompts

- "Create a deep house groove with a rolling bassline"
- "Make a drum and bass beat with liquid chords"
- "Generate an ambient pad progression in D major"
- "Add a filter sweep to the hats"

## Roadmap

- [ ] Strudel web audio integration
- [ ] Session persistence (Supabase)
- [ ] User authentication
- [ ] Export to WAV
- [ ] Template library
- [ ] NFT minting

## License

MIT

---

Built with ❤️ by Eclipse
