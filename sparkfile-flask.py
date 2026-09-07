import json
import os
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
app = Flask(__name__)


def load_config():
    load_dotenv()


@app.route('/')
def render_index():
    return render_template(
        'index.html',
        model=os.getenv('INF_MODEL_NAME', 'UNSET'),
        base_url=os.getenv('INF_API_BASE_URL', 'UNSET'),
        greedy_temp=os.getenv('INF_GREEDY_TEMPERATURE', 0.3),
        default_temp=os.getenv('INF_DEFAULT_TEMPERATURE', 0.7),
        creative_temp=os.getenv('INF_CREATIVE_TEMPERATURE', 1.0),
        reasoning='Enabled' if os.getenv('INF_REASONING_ENABLED', True) else 'Disabled',
        reasoning_effort=os.getenv('INF_REASONING_EFFORT', 'medium'),
        max_reasoning=os.getenv('INF_MAX_REASONING_BUDGET', 4096),
        max_output=os.getenv('INF_MAX_OUTPUT', 4096),
        top_p=os.getenv('INF_TOP_P', 1.0),
        top_k=os.getenv('INF_TOP_K', 200),
        min_p=os.getenv('INF_MIN_P', 0.05),
        rep_pen=os.getenv('INF_REP_PENALTY', 1.03),
        freq_pen=os.getenv('INF_FREQ_PENALTY', 1.01),
        pres_pen=os.getenv('INF_PRES_PENALTY', 1.01),
        xtc_prob=os.getenv('INF_XTC_PROB', 0.3),
        xtc_thres=os.getenv('INF_XTC_THRES', 0.4),
        request_timeout=os.getenv('INF_REQUEST_TIMEOUT', 60)
    )


@app.route('/RequestSession', methods=['POST'])
def request_session():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    filename = file.filename

    try:
        data = json.load(file)
    except json.JSONDecodeError:
        return jsonify({"error": f"Invalid JSON in [{filename}]"}), 400

    run_sesh = []
    for index in range(len(data)):
        c_entry = data[index]
        data_type = c_entry.get('INF_TYPE')
        if data_type == 'RESPONSE':
            run_sesh.append({
                "role": 'assistant',
                'content': c_entry.get('choices')[0].get('message').get('content'),
                'reasoning': c_entry.get('choices')[0].get('message').get('reasoning'),
            })
        elif data_type == 'PROMPT':
            run_sesh.append({
                "role": 'user',
                'content': c_entry.get('INF_PROMPT')
            })
        else:
            return jsonify({"error": f"Unknown INF_TYPE: {data_type} in [{filename}]."}), 400

    return jsonify({"message": f"Session read successfully!", "content": {"data": data, "session": run_sesh}}), 200


def main():
    pass


if __name__ == '__main__':
    pass
