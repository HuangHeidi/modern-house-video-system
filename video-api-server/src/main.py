import os
import sys

# DON'T CHANGE THIS. This is to allow the agent to find the local modules.
sys.path.append(os.path.dirname(__file__))

from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS
import sqlite3
import json

# 導入自定義路由
from routes.youtube import youtube_bp

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)  # 允許所有來源的跨域請求

# 註冊藍圖
app.register_blueprint(youtube_bp, url_prefix='/api/youtube')

DATABASE = './database/app.db'

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    os.makedirs(os.path.dirname(DATABASE), exist_ok=True)
    conn = get_db_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS cases (
            id TEXT PRIMARY KEY,
            case_name TEXT NOT NULL,
            modern_house_youtube_link TEXT,
            searchome_link TEXT,
            gorgeous_space_link TEXT,
            uploaded_to_modern_house BOOLEAN,
            remarks TEXT
        )
    ''')
    conn.commit()
    conn.close()

# 初始化資料庫
init_db()

@app.route('/api/cases', methods=['GET'])
def get_cases():
    conn = get_db_connection()
    cases = conn.execute('SELECT * FROM cases').fetchall()
    conn.close()
    return jsonify([dict(row) for row in cases])

@app.route('/api/cases', methods=['POST'])
def add_case():
    data = request.json
    conn = get_db_connection()
    try:
        conn.execute('''
            INSERT INTO cases (id, case_name, modern_house_youtube_link, searchome_link, gorgeous_space_link, uploaded_to_modern_house, remarks)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['id'],
            data['case_name'],
            data.get('modern_house_youtube_link'),
            data.get('searchome_link'),
            data.get('gorgeous_space_link'),
            data.get('uploaded_to_modern_house', False),
            data.get('remarks')
        ))
        conn.commit()
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Case with this ID already exists'}), 400
    finally:
        conn.close()
    return jsonify({'message': 'Case added successfully'}), 201

@app.route('/api/cases/<string:case_id>', methods=['PUT'])
def update_case(case_id):
    data = request.json
    conn = get_db_connection()
    conn.execute('''
        UPDATE cases
        SET case_name = ?, modern_house_youtube_link = ?, searchome_link = ?, gorgeous_space_link = ?, uploaded_to_modern_house = ?, remarks = ?
        WHERE id = ?
    ''', (
        data['case_name'],
        data.get('modern_house_youtube_link'),
        data.get('searchome_link'),
        data.get('gorgeous_space_link'),
        data.get('uploaded_to_modern_house', False),
        data.get('remarks'),
        case_id
    ))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Case updated successfully'}) 

@app.route('/api/cases/<string:case_id>', methods=['DELETE'])
def delete_case(case_id):
    conn = get_db_connection()
    conn.execute('DELETE FROM cases WHERE id = ?', (case_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Case deleted successfully'}) 

@app.route('/api/import', methods=['POST'])
def import_cases():
    data = request.json
    if not isinstance(data, list):
        return jsonify({'error': 'Invalid data format, expected a list of cases'}), 400

    conn = get_db_connection()
    imported_count = 0
    updated_count = 0
    errors = []

    for case_data in data:
        case_id = case_data.get('id')
        if not case_id:
            errors.append({'case': case_data, 'error': 'Case ID is missing'}) 
            continue

        try:
            # 檢查案例是否存在
            cursor = conn.execute('SELECT id FROM cases WHERE id = ?', (case_id,))
            existing_case = cursor.fetchone()

            if existing_case:
                # 更新現有案例
                conn.execute('''
                    UPDATE cases
                    SET case_name = ?, modern_house_youtube_link = ?, searchome_link = ?, gorgeous_space_link = ?, uploaded_to_modern_house = ?, remarks = ?
                    WHERE id = ?
                ''', (
                    case_data['case_name'],
                    case_data.get('modern_house_youtube_link'),
                    case_data.get('searchome_link'),
                    case_data.get('gorgeous_space_link'),
                    case_data.get('uploaded_to_modern_house', False),
                    case_data.get('remarks'),
                    case_id
                ))
                updated_count += 1
            else:
                # 插入新案例
                conn.execute('''
                    INSERT INTO cases (id, case_name, modern_house_youtube_link, searchome_link, gorgeous_space_link, uploaded_to_modern_house, remarks)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    case_id,
                    case_data['case_name'],
                    case_data.get('modern_house_youtube_link'),
                    case_data.get('searchome_link'),
                    case_data.get('gorgeous_space_link'),
                    case_data.get('uploaded_to_modern_house', False),
                    case_data.get('remarks')
                ))
                imported_count += 1
        except Exception as e:
            errors.append({'case': case_data, 'error': str(e)}) 

    conn.commit()
    conn.close()
    return jsonify({
        'message': 'Import complete',
        'imported_count': imported_count,
        'updated_count': updated_count,
        'errors': errors
    })

@app.route('/', defaults={'path': ''}) 
@app.route('/<path:path>')
def serve(path):
    if path != '' and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))

