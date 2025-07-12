from flask import Blueprint, request, jsonify
import requests
import os

youtube_bp = Blueprint(\'youtube\', __name__)

# 從環境變數獲取YouTube API金鑰
YOUTUBE_API_KEY = os.environ.get(\'YOUTUBE_API_KEY\')

@youtube_bp.route(\'/check_video_existence\", methods=[\\'POST\\'])
def check_video_existence():
    data = request.json
    video_url = data.get(\'video_url\')

    if not video_url:
        return jsonify({\'error\': \'Video URL is required\'}), 400

    video_id = None
    if \'youtube.com/watch?v=\' in video_url:
        video_id = video_url.split(\'v=\')[1].split(\'&\')[0]
    elif \'youtu.be/\' in video_url:
        video_id = video_url.split(\'youtu.be/\')[1].split(\'?\")[0]

    if not video_id:
        return jsonify({\'error\': \'Invalid YouTube video URL\'}), 400

    if not YOUTUBE_API_KEY:
        # 如果沒有API金鑰，則簡單判斷是否為YouTube連結
        # 這裡可以根據實際需求，加入更複雜的判斷邏輯
        is_youtube_link = \'youtube.com\' in video_url or \'youtu.be\' in video_url
        return jsonify({
            \'video_id\': video_id,
            \'exists\': is_youtube_link, # 這裡假設只要是YouTube連結就視為存在
            \'message\': \'YouTube API Key not configured, performing basic URL check.\'
        })

    # 使用YouTube Data API檢查影片是否存在
    api_url = f\'https://www.googleapis.com/youtube/v3/videos?id={video_id}&key={YOUTUBE_API_KEY}&part=id\'
    try:
        response = requests.get(api_url )
        response.raise_for_status() # 如果請求失敗，拋出HTTPError
        result = response.json()
        
        exists = len(result.get(\'items\', [])) > 0
        return jsonify({\'video_id\': video_id, \'exists\': exists})
    except requests.exceptions.RequestException as e:
        return jsonify({\'error\': f\'Failed to connect to YouTube API: {e}\'}), 500
    except Exception as e:
        return jsonify({\'error\': f\'An unexpected error occurred: {e}\'}), 500

@youtube_bp.route(\'/check_channel_video_existence\", methods=[\\'POST\\'])
def check_channel_video_existence():
    data = request.json
    video_url = data.get(\'video_url\')
    channel_id = data.get(\'channel_id\') # 摩登雅舍的YouTube頻道ID

    if not video_url or not channel_id:
        return jsonify({\'error\': \'Video URL and Channel ID are required\'}), 400

    video_id = None
    if \'youtube.com/watch?v=\' in video_url:
        video_id = video_url.split(\'v=\')[1].split(\'&\')[0]
    elif \'youtu.be/\' in video_url:
        video_id = video_url.split(\'youtu.be/\')[1].split(\'?\")[0]

    if not video_id:
        return jsonify({\'error\': \'Invalid YouTube video URL\'}), 400

    if not YOUTUBE_API_KEY:
        return jsonify({
            \'video_id\': video_id,
            \'exists_in_channel\': False, # 無API金鑰時無法精確判斷
            \'message\': \'YouTube API Key not configured, cannot check channel existence.\'
        })

    # 檢查影片是否屬於指定頻道
    # 注意：YouTube Data API v3沒有直接檢查影片是否屬於某個頻道的方法
    # 通常的做法是先獲取影片資訊，然後比對其channelId
    # 或者通過搜索指定頻道的影片來判斷

    # 方法一：獲取影片資訊並比對channelId
    video_info_api_url = f\'https://www.googleapis.com/youtube/v3/videos?id={video_id}&key={YOUTUBE_API_KEY}&part=snippet\'
    try:
        response = requests.get(video_info_api_url )
        response.raise_for_status()
        result = response.json()

        if not result.get(\'items\'):
            return jsonify({\'video_id\': video_id, \'exists_in_channel\': False, \'message\': \'Video not found on YouTube.\'})

        video_snippet = result[\\'items\\'][0][\\'snippet\\']
        video_channel_id = video_snippet.get(\'channelId\')

        exists_in_channel = (video_channel_id == channel_id)
        return jsonify({\'video_id\': video_id, \'exists_in_channel\': exists_in_channel})

    except requests.exceptions.RequestException as e:
        return jsonify({\'error\': f\'Failed to connect to YouTube API: {e}\'}), 500
    except Exception as e:
        return jsonify({\'error\': f\'An unexpected error occurred: {e}\'}), 500
