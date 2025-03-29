# Chatalia

<div align="center">
  <img src="./src/assets/logo.png" alt="Chatalia Logo" width="150" height="150"/>
  
  <h1>A Modern, Local-First AI Chat Interface</h1>
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Made with Tauri](https://img.shields.io/badge/Made%20with-Tauri-blueviolet)](https://tauri.app)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
</div>

## Overview

**Chatalia** is a powerful desktop application that provides a beautiful interface for interacting with Large Language Models (LLMs). Built with privacy in mind, all your conversations and configurations are stored locally on your machine.

> **⚠️ Status:** Active Development. Core functionality is in place, but AI interactions currently use simulated responses.

## ✨ Features

### 🔒 Privacy & Security
- **Local-First Storage**: All data stays on your device
- **Encrypted API Keys**: OS-level encryption for sensitive data
- **No Cloud Dependencies**: Complete control over your data

### 🎯 Core Features
- **Multi-Provider Support**
  - Configure multiple AI providers (OpenAI, Anthropic, Groq, etc.)
  - Custom endpoint support
  - Built-in connection testing
- **Flexible Settings**
  - Global defaults for AI models
  - Per-chat setting overrides
  - Customizable system prompts

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or newer)
- [Rust](https://www.rust-lang.org/tools/install)
- Platform-specific requirements:
  - **Windows**: WebView2
  - **Linux**: WebKit2GTK
  - **macOS**: Xcode Command Line Tools

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/MegalithOfficial/Chatalia
   cd chatalia
   ```

2. Install dependencies
   ```bash
   npm install
   # or
   yarn install
   ```

3. Run in development mode
   ```bash
   npm run tauri dev
   # or
   yarn tauri dev
   ```

## ⚙️ Configuration

### API Setup

1. Open Settings → API Providers
2. Click "Add API Provider"
3. Select your provider type
4. Enter your API key and optional base URL
5. Test the connection
6. Save your changes

### Default Settings

1. Navigate to Settings → Defaults & Behavior
2. Configure your preferred:
   - AI provider and model
   - Temperature settings
   - System prompts
   - UI preferences

## 🛠️ Development

### Building from Source

```bash
# Development mode
npm run tauri dev

# Production build
npm run tauri build
```

### Project Structure

- `/src` - Frontend React/TypeScript code
- `/src-tauri` - Rust backend code

## 🗺️ Roadmap

- [ ] Live API Integration
- [ ] Streaming Responses
- [ ] Real API Key Validation
- [ ] Enhanced Error Handling
- [ ] Advanced Chat Settings
- [ ] File Attachments
- [ ] Light Theme
- [ ] Command Palette
- [ ] Chat Organization

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <p>Built with ❤️ using Tauri, React, and Rust</p>
</div>