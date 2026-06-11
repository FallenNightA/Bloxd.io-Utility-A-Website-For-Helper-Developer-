# 🏗️ Bloxd.io Utility

![GitHub White Style](https://img.shields.io/badge/style-GitHub_White-ffffff?style=flat-square)
![Status: Active](https://img.shields.io/badge/status-Active-green.svg)

**A professional helper tool for Bloxd.io developers.**  
**Turn any AI into a Bloxd.io expert with the Automated Mega-Prompt Generator!**

---
## 🌐 Live Demo
🔗 **[Visit the Website Here](https://fallennighta.github.io/Bloxd.io-Utility-A-Website-For-Helper-Developer-/)**

---
## ✨ Features
✅ **CodexMind AI Dev Companion (NEW)** – Live streaming AI developer helper integrated directly inside Code Lab and Command Studio. Generate custom commands, logic callbacks, and gameplay loops in real-time with automatic workspace mapping and instant injection buttons!

✅ **Automated AI Mega-Prompt Generator** – Combines custom instructions with real-time GitHub API data (`Bloxdy/code-api`) to guide any general-purpose LLM step-by-step.

✅ **Full API Documentation Viewer** – Browse, search, and bookmark official Bloxd.io functions with syntax highlighting (Prism.js).

✅ **GitHub White Style UI** – Clean, high-contrast design using Tailwind CSS with seamless dark/light sync.

✅ **Copy-Paste Ready Code** – All scripts are rigorously checked, validated, and formatted specifically for the **Bloxd.io F8 console** and custom Code Blocks.

✅ **Parallel Data Fetching** – Pulls 14+ documentation files from GitHub in seconds.

---
## 🛠️ Technologies
- **Frontend**: HTML5, Tailwind CSS, JavaScript (ES6+), CSS variables.
- **Libraries**: [Marked.js](https://marked.js.org/), [Prism.js](https://prismjs.com/), Monaco Editor.
- **API**: GitHub REST API, Next.js server-side streaming endpoints (`/api/chat`).

---
## 🚀 Local Run & Setup
1. Clone or download the repository.
2. Install all development packages:
   ```bash
   npm install
   ```
3. Create your local configuration `.env.local` at the root directory:
   ```env
   GEMINI_API_KEY=your_google_ai_studio_api_key_here
   ```
4. Run the local development workspace:
   ```bash
   npm run dev
   ```

---
## 🤝 How to Contribute
1. Fork the repository.
2. Create a new branch (`git checkout -b feature/your-idea`).
3. Commit your changes (`git commit -m "Add awesome feature"`).
4. Push to the branch (`git push origin feature/your-idea`).
5. Open a Pull Request!

---
## 🙏 Credits
- **Bloxd.io**: [Official Website](https://bloxd.io)
- **API Data**: [Bloxdy/code-api](https://github.com/Bloxdy/code-api)
- **Author**: [FallenNightA](https://github.com/FallenNightA)
