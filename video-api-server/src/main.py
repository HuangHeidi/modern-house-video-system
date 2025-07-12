from flask import Flask, send_from_directory
from flask_cors import CORS
from routes.youtube import youtube_bp

app = Flask(__name__, static_folder='static', static_url_path='/')
CORS(app)

# 註冊藍圖
app.register_blueprint(youtube_bp, url_prefix='/api')

# 根路徑導向 index.html
@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

# 其他靜態路徑
@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
