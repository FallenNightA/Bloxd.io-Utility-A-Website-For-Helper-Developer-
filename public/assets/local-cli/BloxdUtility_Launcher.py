import os
import sys
import json
import zipfile
import shutil
import tempfile
import threading
try:
    import tkinter as tk
    from tkinter import ttk, filedialog, messagebox
except ImportError:
    print("Tkinter is required. It is usually included with Python by default.")
    sys.exit(1)

try:
    import webview
except ImportError:
    print("pywebview is required to run the embedded browser.")
    print("Please install it running: pip install pywebview")
    sys.exit(1)

# Ensure this runs on Python <= 3.9.13 as requested
VERSION = "1.0.0"

class BloxdUtilityLauncher(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("BloxdUtility Launcher - v" + VERSION)
        self.geometry("800x600")
        self.configure(bg="#1e1e2e")
        self.temp_dir = tempfile.mkdtemp(prefix="bloxd_")
        self.active_script = ""

        # Using standard Tkinter without ttk.Style dependencies for maximum compatibility
        top_bar = tk.Frame(self, bg="#11111b", height=50)
        top_bar.pack(fill="x", side="top")

        title_label = tk.Label(top_bar, text="BLOXDUTILITY LAUNCHER", fg="#f38ba8", bg="#11111b", font=("Helvetica", 16, "bold"))
        title_label.pack(side="left", padx=20, pady=10)

        # Basic Tab System using frames since we want custom styling that's simple
        self.tab_container = tk.Frame(self, bg="#1e1e2e")
        self.tab_container.pack(fill="both", expand=True)

        nav_bar = tk.Frame(self, bg="#181825", height=40)
        nav_bar.pack(fill="x", side="bottom")

        tk.Button(nav_bar, text="Home", bg="#313244", fg="white", command=lambda: self.show_tab("home")).pack(side="left", padx=10, pady=5)
        tk.Button(nav_bar, text="Settings/Mods", bg="#313244", fg="white", command=lambda: self.show_tab("settings")).pack(side="left", padx=10, pady=5)
        tk.Button(nav_bar, text="Credits", bg="#313244", fg="white", command=lambda: self.show_tab("credits")).pack(side="right", padx=10, pady=5)

        self.tab_home = tk.Frame(self.tab_container, bg="#1e1e2e")
        self.tab_settings = tk.Frame(self.tab_container, bg="#1e1e2e")
        self.tab_credits = tk.Frame(self.tab_container, bg="#1e1e2e")

        self._setup_home()
        self._setup_settings()
        self._setup_credits()
        
        self.show_tab("home")

    def show_tab(self, name):
        self.tab_home.pack_forget()
        self.tab_settings.pack_forget()
        self.tab_credits.pack_forget()
        if name == "home":
            self.tab_home.pack(fill="both", expand=True)
        elif name == "settings":
            self.tab_settings.pack(fill="both", expand=True)
        elif name == "credits":
            self.tab_credits.pack(fill="both", expand=True)

    def _setup_home(self):
        lbl = tk.Label(self.tab_home, text="Welcome to BloxdUtility Embedded!", font=("Helvetica", 20), fg="#a6e3a1", bg="#1e1e2e")
        lbl.pack(pady=40)

        desc = tk.Label(self.tab_home, text="Play Bloxd.io directly inside this app with the BloxdUtility Client injected.", fg="#bac2de", bg="#1e1e2e", font=("Helvetica", 12))
        desc.pack(pady=10)

        btn_play = tk.Button(self.tab_home, text="PLAY BLOXD.IO (EMBEDDED)", bg="#a6e3a1", fg="#11111b", font=("Helvetica", 16, "bold"), command=self.play_game)
        btn_play.pack(pady=30, ipadx=40, ipady=10)

    def _setup_settings(self):
        lbl = tk.Label(self.tab_settings, text="Mod & File Manager", font=("Helvetica", 16), fg="#89b4fa", bg="#1e1e2e")
        lbl.pack(pady=20)
        
        info = tk.Label(self.tab_settings, text="Select a .bloxdutility custom file to load custom settings.", fg="#bac2de", bg="#1e1e2e")
        info.pack(pady=10)

        btn_load = tk.Button(self.tab_settings, text="Load .bloxdutility File", bg="#8ac926", fg="#11111b", command=self.load_bloxdutility_file)
        btn_load.pack(pady=20, ipadx=20, ipady=5)
        
        self.loaded_lbl = tk.Label(self.tab_settings, text="No file loaded.", fg="#f38ba8", bg="#1e1e2e")
        self.loaded_lbl.pack(pady=10)

    def _setup_credits(self):
        lbl = tk.Label(self.tab_credits, text="Credits & Info", font=("Helvetica", 16), fg="#cba6f7", bg="#1e1e2e")
        lbl.pack(pady=20)

        tk.Label(self.tab_credits, text="GitHub Base: github.com/FallenNightA", fg="#89b4fa", bg="#1e1e2e").pack(pady=10)
        tk.Label(self.tab_credits, text="YouTube: @newismaharanisyahrir1005", fg="#89b4fa", bg="#1e1e2e").pack(pady=10)

    def load_bloxdutility_file(self):
        filepath = filedialog.askopenfilename(
            title="Select .bloxdutility file",
            filetypes=(("BloxdUtility Files", "*.bloxdutility"), ("All Files", "*.*"))
        )
        if filepath:
            try:
                with zipfile.ZipFile(filepath, 'r') as zip_ref:
                    zip_ref.extractall(self.temp_dir)
                
                script_path = os.path.join(self.temp_dir, "bloxdutility-client.user.js")
                if os.path.exists(script_path):
                    with open(script_path, "r") as f:
                        self.active_script = f.read()
                
                self.loaded_lbl.config(text=f"Loaded: {os.path.basename(filepath)}", fg="#a6e3a1")
                messagebox.showinfo("Success", f"Successfully loaded features from {os.path.basename(filepath)}!")
            except Exception as e:
                messagebox.showerror("Error", f"Failed to parse .bloxdutility file: {e}")

    def _inject_script(self, window):
        if self.active_script:
            # We wrap it in a slightly delayed execution to ensure page load
            js = f"""
            setTimeout(() => {{
                try {{ {self.active_script} }} catch (e) {{ console.error("BloxdUtility Injection Error:", e); }}
            }}, 2000);
            """
            window.evaluate_js(js)

    def play_game(self):
        self.destroy() # Close the launcher tkinter GUI
        
        # Start PyWebview pointing to bloxd.io
        window = webview.create_window(
            'BloxdUtility Client (Embedded)', 
            'https://bloxd.io', 
            width=1280, 
            height=720
        )
        
        # When pywebview starts, inject our custom script if loaded
        webview.start(self._inject_script, window)

if __name__ == "__main__":
    app = BloxdUtilityLauncher()
    app.mainloop()
