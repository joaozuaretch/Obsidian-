import http.server
import socketserver
import os
import json
import urllib.parse

PORT = 3000
DIRECTORY = "public"
VAULT_DIR = "vault"

class ObsidianHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        url_path = urllib.parse.urlparse(self.path).path
        
        # API: List files in vault
        if url_path == "/api/files":
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            files_tree = self.get_file_tree(VAULT_DIR)
            self.wfile.write(json.dumps(files_tree).encode())
            return
            
        # Serve vault files directly (for PDFs and raw MD)
        if url_path.startswith("/vault/"):
            # Ensure path is safe
            requested_file = os.path.join(os.getcwd(), url_path.lstrip("/"))
            if os.path.exists(requested_file) and os.path.commonpath([os.getcwd(), requested_file]) == os.getcwd():
                self.directory = "." # Temporarily change directory to serve from root
                return super().do_GET()
            else:
                self.send_error(404, "File not found")
                return

        # Default: Serve from public directory
        self.directory = DIRECTORY
        return super().do_GET()

    def get_file_tree(self, path):
        tree = []
        try:
            for entry in os.scandir(path):
                if entry.name.startswith('.'):
                    continue
                    
                item = {
                    "name": entry.name,
                    "path": entry.path.replace(os.sep, '/'),
                    "isDir": entry.is_dir()
                }
                
                if entry.is_dir():
                    item["children"] = self.get_file_tree(entry.path)
                
                # Only include supported files or directories
                if entry.is_dir() or entry.name.lower().endswith(('.md', '.pdf')):
                    tree.append(item)
        except Exception as e:
            print(f"Error scanning {path}: {e}")
            
        return sorted(tree, key=lambda x: (not x["isDir"], x["name"].lower()))

if __name__ == "__main__":
    # Ensure vault exists
    if not os.path.exists(VAULT_DIR):
        os.makedirs(VAULT_DIR)
        
    # Start server
    with socketserver.TCPServer(("", PORT), ObsidianHandler) as httpd:
        print(f"Obsidian Viewer running at http://localhost:{PORT}")
        print(f"Serving files from: {os.path.abspath(VAULT_DIR)}")
        httpd.serve_forever()
