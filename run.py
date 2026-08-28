import os
import sys
import subprocess
import time
import shutil

def main():
    print("=" * 50)
    print("🚀 Démarrage de MailAlert (Backend FastAPI + Frontend React)")
    print("=" * 50)

    # 1. Vérification / création du fichier .env
    if not os.path.exists(".env") and os.path.exists(".env.example"):
        print("📄 Création de .env à partir de .env.example...")
        shutil.copy(".env.example", ".env")
        print("⚠️  Pensez à renseigner vos clés dans le fichier .env !")

    # 2. Gestion de l'environnement virtuel (venv)
    venv_dir = ".venv"
    if os.name == "nt":
        venv_python = os.path.join(venv_dir, "Scripts", "python.exe")
    else:
        venv_python = os.path.join(venv_dir, "bin", "python")

    if not os.path.exists(venv_dir):
        print("📁 Création de l'environnement virtuel (.venv)...")
        subprocess.check_call([sys.executable, "-m", "venv", venv_dir])
        print("✅ Environnement virtuel créé.")

    # 3. Installation/Mise à jour des dépendances dans le venv
    print("📦 Installation des dépendances dans l'environnement virtuel...")
    try:
        subprocess.check_call([venv_python, "-m", "pip", "install", "--upgrade", "pip"])
        subprocess.check_call([venv_python, "-m", "pip", "install", "-r", "requirements.txt"])
    except Exception as e:
        print(f"❌ Erreur lors de l'installation des dépendances : {e}")
        sys.exit(1)

    # 4. Lancement du Backend et Frontend via le venv
    print("\n🌐 Démarrage des serveurs...")
    
    backend_cmd = [venv_python, "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
    
    # Run npm run dev in frontend folder
    # We use shell=True on windows to make npm work properly
    is_windows = os.name == "nt"
    npm_cmd = "npm run dev" if is_windows else ["npm", "run", "dev"]
    frontend_proc = subprocess.Popen(npm_cmd, cwd="frontend", shell=is_windows)

    backend_proc = subprocess.Popen(backend_cmd)

    print("\n✅ Backend accessible sur :  http://localhost:8000")
    print("✅ Frontend accessible sur : http://localhost:5173")
    print("👉 Sur votre mobile (même réseau Wi-Fi) : http://<VOTRE_IP_LOCALE>:5173")
    print("\nAppuyez sur Ctrl+C pour arrêter l'application.")

    try:
        while True:
            time.sleep(1)
            if backend_proc.poll() is not None or frontend_proc.poll() is not None:
                break
    except KeyboardInterrupt:
        print("\n🛑 Arrêt des serveurs...")
    finally:
        backend_proc.terminate()
        frontend_proc.terminate()
        try:
            backend_proc.wait(timeout=3)
            frontend_proc.wait(timeout=3)
        except Exception:
            backend_proc.kill()
            frontend_proc.kill()
        print("👋 Serveurs arrêtés proprement.")

if __name__ == "__main__":
    main()
