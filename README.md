# Lazy-Waba: Advanced Chat Automation Platform

*A sophisticated AI-powered automation system that monitors your messaging applications, analyzes conversation context, and generates contextually-appropriate responses - all while operating autonomously in the background.*

## Core Technical Architecture

### 🔍 Perception Layer
- **Real-time OCR Monitoring:** Leverages ScreenPipe's vision capabilities to capture and analyze screen content without requiring API access
- **Intelligent Pattern Recognition:** Implements sophisticated algorithms to differentiate between new messages and existing content
- **Multi-Platform Compatibility:** Simultaneously monitors both WhatsApp Desktop and Discord applications with platform-specific optimization

### 🧠 Intelligence Processing
- **Dual AI Provider Integration:** 
  - Local inference via Ollama for privacy-focused, offline operation
  - Cloud processing via Nebius for enhanced performance on complex queries
- **Conversation Context Management:** Maintains conversation history and semantic understanding across sessions
- **Vector Database Integration:** Utilizes SQLite with vector extensions for efficient similarity search and knowledge retrieval

### ⚙️ Execution Pipeline
- **Pixel-Perfect Automation:** Uses ScreenPipe's automation API for cross-platform compatibility and detection-resistant operation
- **Human-like Interaction Simulation:** Randomized typing patterns and interaction delays that mimic authentic human behavior
- **Application Process Management:** Programmatically launches and controls chat applications through native OS integrations

## Advanced Features

- **Conversation Flow Analysis:** Uses AI to detect conversation patterns and respond with appropriate tone and content
- **Initial Greeting Detection:** Automatically identifies when to start conversations vs. continue existing threads
- **AI Preset Management:** Customize response styles and personalities through configurable AI presets
- **Health Monitoring System:** Self-diagnostics to ensure all components function properly
- **Comprehensive Activity Logging:** Detailed event tracking for troubleshooting and operational insight
- **Responsive Development UI:** Real-time visual feedback of system state and operations
- **OCR Visual Debugging:** View exactly what the system "sees" to fine-tune recognition parameters

## Technical Implementation Details

- **Next.js Frontend:** Modern React-based interface with server components for optimal performance
- **Tailwind CSS Styling:** Utility-first styling framework for consistent design language
- **TypeScript Throughout:** Full type safety across the entire codebase
- **Custom React Hooks:** Modular architecture with hooks for AI providers (`use-ollama.tsx`, `use-nebius.tsx`), health monitoring, and system state
- **WebSocket Communication:** Real-time bidirectional communication with the ScreenPipe backend
- **Tauri Integration (Beta):** Native desktop application capabilities for enhanced performance

## Technical Limitations & Considerations

- **Input Simulation:** Limited to pixel-level interactions (mouse movement, clicking, typing)
- **Window Positioning:** Requires consistent application window placement for reliable automation
- **Timing Calibration:** May require adjustment based on system performance characteristics
- **Recognition Accuracy:** Dependent on screen resolution and text clarity

## Getting Started

1. **Installation:** Install this pipe from UI and play with it or clone this repo:
```bash
git clone https://github.com/Ankur2606/AutoRespond-AI
cd AutoRespond-AI
```

2. **Configuration:** Follow the documentation to create your pipe (will create this app):
   https://docs.screenpi.pe/plugins

3. **Backend Setup:** Run the ScreenPipe rust server (For Windows):
```bash
iwr get.screenpi.pe/cli.ps1 | iex
screenpipe.exe
```

4. **Frontend Setup:**
```bash
# Navigate to Next.js workspace
cd AutoRespond-AI

# Install dependencies
bun install

# Start development server
bun dev
```

5. **Application Configuration:**
   - Configure AI providers in settings
   - Position chat applications according to guidelines
   - Test automation with the built-in diagnostic tools

## Extensibility & Advanced Usage

- **Custom AI Providers:** Extend beyond default providers by implementing the provider interface
- **Response Templates:** Create and save commonly used response patterns
- **Conversation Rules:** Define trigger conditions and special handling for specific conversation scenarios
- **Scheduled Operation:** Configure operation hours and automatic mode switching
- **Multi-Language Support:** Works with any language supported by your configured AI models

---

*Lazy-Waba: Sophisticated automation for the digitally overwhelmed professional.*

---
