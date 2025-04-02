## Lazy Waba Built With Screenpipe Template

*A magical automation tool that monitors your chat apps, reads incoming messages, and responds automatically while you nap, making your friends think you're attentive when you're actually watching cat videos.*

### How It Works (Tech Details)
🧐 **Monitors Chats:** Uses ScreenPipe’s OCR to detect new messages in a fixed WhatsApp/Discord window.  
🤖 **AI-Powered Replies:** Searches your `sqlite3` vector DB, runs responses through your AI model, and types them out.  
🎭 **Acts Human:** Messages are sent via pixel-based automation, making it look like you actually typed them.  

### Strict Rules (Because Windows Said So)
🚫 **Only allowed actions:** Move mouse, click, type, and press enter.  
📍 **Coordinates matter**—window must stay fixed.  
⏳ **Timing-sensitive** (delay calibration required).  
🔍 **No native element detection**—pure pixel wizardry.  

### Behind the Scenes (Workflow)
1️⃣ OCR detects a new message.  
2️⃣ Vector DB finds relevant context.  
3️⃣ AI model crafts a response.  
4️⃣ Script types & presses enter.  
5️⃣ You take credit for the thoughtful reply.  

---

**Lazy Waba:** Because automation is better than socializing. 😎

---


## getting started

1. install this pipe from UI and play with it or clone this repo using 
```bash
git clone https://github.com/Ankur2606/Lazy-Waba
cd Lazy-Waba
```
2. follow docs to create your pipe (it will create this app) (https://docs.screenpi.pe/plugins)
3. run the backend(Screenpipe) rust server using (For Windows)
```bash
iwr get.screenpi.pe/cli.ps1 | iex
screenpipe.exe
```
4. Navigate to Next Workspace
5. Run ```bun build``` to install all dependencies
6. Run ```bun dev``` to start the next js server
