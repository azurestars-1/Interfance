import json
import os
import requests
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


def send_for_message(messages:list, msg_type='default'):
    url: str = os.getenv('INF_API_BASE_URL', 'NotSet')
    headers = {
        "Authorization": f'Bearer {os.getenv("INF_API_KEY")}',
        "Content-Type": "application/json"
    }

    temperature = float(os.getenv('INF_DEFAULT_TEMPERATURE', 0.70))
    if msg_type == 'deterministic':
        temperature = float(os.getenv('INF_GREEDY_TEMPERATURE', 0.30))
    elif msg_type == 'creative':
        temperature = float(os.getenv('INF_CREATIVE_TEMPERATURE', 1.00))

    payload = {
        "model": os.getenv('INF_MODEL_NAME'),
        "messages": messages,
        "thinking": {"type": os.getenv("INF_REASONING_ENABLED", True),
                     "budget_tokens": float(os.getenv("INF_MAX_REASONING_BUDGET", 4096))},
        "thinking_token_budget": float(os.getenv("INF_MAX_REASONING_BUDGET", 4096)),
        "enable_thinking": os.getenv('INF_REASONING_ENABLED', True),
        "reasoning_effort": os.getenv("INF_REASONING_EFFORT", 'medium'),
        "max_tokens": float(os.getenv("INF_MAX_OUTPUT", 4096)),
        "temperature": float(temperature),
        "top_p": float(os.getenv("INF_TOP_P", 1.0)),
        "top_k": int(os.getenv("INF_TOP_K", 200)),
        "min_p": float(os.getenv("INF_MIN_P", 0.05)),
        "xtc-probability": float(os.getenv("INF_XTC_PROB", 0.3)),
        "xtc-threshold": float(os.getenv("INF_XTC_THRES", 0.4)),
        "repeat_penalty": float(os.getenv("INF_REP_PENALTY", 1.03)),
        "pressence_penalty": float(os.getenv("INF_PRES_PENALTY", 1.01)),
        "frequency_penalty": float(os.getenv("INF_FREQ_PENALTY", 1.01)),
    }
    #print(f'{colour_config.DEBUG_CODE}{payload}{colour_config.RESET_CODE}')

    response = requests.post(url, json=payload, headers=headers, timeout=float(os.getenv("INF_TIMEOUT", 60)))

    if not response.ok:
        try:
            conv_to_json = response.json()
            error_reason = conv_to_json.get("error")
            detailed_error = conv_to_json.get('message')
            detail = f'{error_reason} ({detailed_error})'
        except ValueError:
            detail = response.text
        #raise RuntimeError(
        #    f"{colour_config.ERROR_CODE}{response.status_code} {response.reason}: {detail}{colour_config.RESET_CODE}")
        raise RuntimeError(f'{response.status_code} {response.reason}: {detail}')

    try:
        body = response.json()
        return body
    except json.JSONDecodeError as e:
        #raise RuntimeError(f"{colour_config.ERROR_CODE}ERROR (JSONDecodeError): {e}{colour_config.RESET_CODE}")
        raise RuntimeError(f"ERROR (JSONDecodeError): {e}")


@app.route('/processAtIndex', methods=['POST'])
def processAtIndex():
    try:
        data = request.get_json()
        data = data.get('content')
        message_split = data.split('<div class="Message">')
        fin_arr = []

        mapping = {
            'LLM': {
                'mainDivName': 'LLM-MSG',
                'secondDivName': 'LLM-Output'
            },
            'User': {
                'mainDivName': 'User-MSG',
                'secondDivName': 'User-Prompt'

            },
            'System': {
                'mainDivName': 'System-MSG',
                'secondDivName': 'System-Prompt'

            }
        }
        for message in message_split:
            mainDivName = ''
            secondDivName = ''
            reasoningName = ''
            if message.startswith('<div class="LLM-MSG">'):
                mainDivName = 'LLM-MSG'
                secondDivName = 'LLM-Output'
                reasoningName = 'LLM-Reasoning'
            elif message.startswith('<div class="User-MSG">'):
                mainDivName = 'User-MSG'
                secondDivName = 'User-Prompt'
                reasoningName = 'User-Reasoning'
            elif message.startswith('<div class="System-MSG">'):
                mainDivName = 'System-MSG'
                secondDivName = 'System-Prompt'
                reasoningName = 'System-Reasoning'
            else:
                if message != '':
                    fin_arr.append('<div class="Message">'+message)
                continue

            rem_front = message.split(f'<div class="{mainDivName}">')[-1]
            rem_front = rem_front.split('<details>')
            arav = []
            for splitter in rem_front:
                resStr = f'<summary>{reasoningName}</summary><span class="{reasoningName}">'
                if not splitter.startswith(resStr):
                    if len(splitter) > 1:
                        arav.append(f'<span class ="{secondDivName}">{splitter}</span>')
                else:
                    rem_end = splitter.split('</details>')
                    res_content = rem_end[0].split(resStr)[-1].split('</span>')[0]
                    arav.append(f'<details><summary>{reasoningName}</summary><span class="{reasoningName}">{res_content}</span></details>')
                    if len(rem_end) > 1:
                        # We got regular text right after
                        arav.append(f'<span class="{secondDivName}">{rem_end[1]}</span>')
            if len(arav) > 1 and arav[-1] == f'<span class="{secondDivName}">\n</span>':
                arav = arav[:-1]
            fin_arr.append(f'<div class="Message"><div class={mainDivName}>'+''.join(arav)+'</div></div>')
        fin_arr = '\n'.join(fin_arr)
        return jsonify({'content': fin_arr}), 200
    except Exception as e:
        print(f'Caught {e}')
        return jsonify({'error': str(e)}), 400


@app.route('/generate', methods=['POST'])
def generate():
    try:
        data = request.get_json()
        active_template = data.get('template')
        built_arr = []
        for entry in active_template:
            role = entry.get('role')
            split_arr = entry.get('split_arr')
            temp_reasoning = []
            temp_text = []
            active_type = 'UNSET-ROLE'
            added_at_least_one = False
            for index in range(len(split_arr)):
                split_type = split_arr[index].get('type')
                cnt = split_arr[index].get('content')
                if active_type == 'UNSET-ROLE':
                    active_type = split_type

                if active_type != split_type:
                    if (split_type == 'Text' and len(temp_text) > 0) or (split_type == 'Reasoning' and len(temp_reasoning) > 0):
                        temp_dict = {
                            'role': role,
                            'content': '\n\n'.join(temp_text)
                        }
                        if len(temp_reasoning) > 0 and role == 'assistant':
                            # Including user-reasoning/system-reasoning will throw provider errors
                            temp_dict['reasoning'] = '\n\n'.join(temp_reasoning)
                        built_arr.append(temp_dict)
                        temp_text = []
                        temp_reasoning = []
                        added_at_least_one = True
                    active_type = split_type

                if split_type == 'Reasoning':
                    temp_reasoning.append(cnt)
                elif split_type == 'Text':
                    temp_text.append(cnt)
            t_len = len(temp_text)
            r_len = len(temp_reasoning)
            if role != 'UNSET-ROLE':
                if not added_at_least_one or t_len > 0:
                    temp_dict = {
                        'role': role,
                        'content': '\n\n'.join(temp_text)
                    }
                    if r_len > 0 and role == 'assistant':
                        temp_dict['reasoning'] = '\n\n'.join(temp_reasoning)
                    built_arr.append(temp_dict)
                elif r_len > 0 and role == 'assistant':
                    temp_dict = {
                        'role': role,
                        'content': '',
                        'reasoning': '\n\n'.join(temp_reasoning)
                    }
                    built_arr.append(temp_dict)
                else:
                    built_arr.append({
                        'role': role,
                        'content': ''
                    })
        #print(f'Built Template Data: {built_arr}')

        temp = send_for_message(built_arr).get('choices')[0].get('message')
        sel_role = temp.get('role')
        recieved_message = temp.get('content').lstrip('\n')
        reasoning = temp.get('reasoning').lstrip('\n')
        print(f'Recieved Reasoning: {reasoning}')
        print(f'Recieved Message: {recieved_message}')

        spli_arr = []
        if len(reasoning) > 0:
            spli_arr.append({'type': 'Reasoning', 'content': reasoning})
        spli_arr.append({'type': 'Text', 'content': recieved_message})

        active_template.append({
            'INF_TYPE': 'WEBUI',
            'role': sel_role,
            'split_arr': spli_arr,
        })
        print(active_template)
        msgs = []
        for msg in active_template:
            role = msg['role']
            built_str = ''
            if role == 'assistant':
                built_str += '{{[OUTPUT]}}'
            elif role == 'user':
                built_str += '{{[INPUT]}}'
            elif role == 'system':
                built_str += '{{[SySTEM]}}'

            ara = msg['split_arr']
            for entry in ara:
                is_reasoning = True if entry.get('type') == 'Reasoning' else False
                if is_reasoning:
                    built_str += '<think>' + entry.get('content') + '</think>'
                else:
                    built_str += entry.get('content')
            msgs.append(built_str)
        msgs = '\n'.join(msgs)

        return jsonify({'content': msgs}), 200
    except Exception as e:
        print(f'Error: {e}')
        return jsonify({'error': str(e)}), 400

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
