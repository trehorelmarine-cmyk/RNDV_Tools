#!/usr/bin/env python3
"""
Serveur web pour le tableau de bord RNDV
Lance un serveur HTTP local accessible sur le réseau
"""

import http.server
import socketserver
import socket
import os
import subprocess
from pathlib import Path

PORT = 8080
DIRECTORY = Path(__file__).parent

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIRECTORY), **kwargs)

    def log_message(self, format, *args):
        print(f"[{self.log_date_time_string()}] {args[0]}")

def get_local_ip():
    """Récupère l'IP locale de la machine"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "127.0.0.1"

def main():
    # Mise à jour des données avant de lancer le serveur
    print("Mise à jour des données...")
    update_script = DIRECTORY / "update_dashboard.py"
    if update_script.exists():
        subprocess.run(["python3", str(update_script)], cwd=str(DIRECTORY))

    print()
    print("=" * 60)
    print("SERVEUR TABLEAU DE BORD RNDV")
    print("=" * 60)

    local_ip = get_local_ip()

    print()
    print("URLs d'accès:")
    print(f"  Local:   http://localhost:{PORT}/rapport_evolution.html")
    print(f"  Réseau:  http://{local_ip}:{PORT}/rapport_evolution.html")
    print()
    print("Appuyez sur Ctrl+C pour arrêter le serveur")
    print("-" * 60)
    print()

    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServeur arrêté.")

if __name__ == "__main__":
    main()
