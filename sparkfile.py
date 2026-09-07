import os
import json
import time
import requests
import gigatoken
from dataclasses import dataclass
from dotenv import load_dotenv


@dataclass
class ColourCodes:
    REASON_CODE: str = '\x1b[38;5;28m'
    OUTPUT_CODE: str = '\x1b[38;5;49m'
    PROMPT_CODE: str = '\x1b[38;5;51m'
    INFO_CODE: str = '\x1b[38;5;245m'
    DEBUG_CODE: str = '\x1b[38;5;159m'
    CHOICE_CODE: str = '\x1b[38;5;214m'
    ERROR_CODE: str = '\x1b[38;5;196m'
    RESET_CODE: str = '\x1b[0m'


def load_config():
    load_dotenv()

    return ColourCodes(
        REASON_CODE=os.getenv('INF_REASON_CODE', ColourCodes.REASON_CODE).encode("ascii").decode("unicode_escape"),
        OUTPUT_CODE=os.getenv('INF_OUTPUT_CODE', ColourCodes.OUTPUT_CODE).encode("ascii").decode("unicode_escape"),
        PROMPT_CODE=os.getenv('INF_PROMPT_CODE', ColourCodes.PROMPT_CODE).encode("ascii").decode("unicode_escape"),
        INFO_CODE=os.getenv('INF_INFO_CODE', ColourCodes.INFO_CODE).encode("ascii").decode("unicode_escape"),
        DEBUG_CODE=os.getenv('INF_DEBUG_CODE', ColourCodes.DEBUG_CODE).encode("ascii").decode("unicode_escape"),
        CHOICE_CODE=os.getenv('INF_CHOICE_CODE', ColourCodes.CHOICE_CODE).encode("ascii").decode("unicode_escape"),
        ERROR_CODE=os.getenv('INF_ERROR_CODE', ColourCodes.ERROR_CODE).encode("ascii").decode("unicode_escape"),
    )


def send_single_message(message: str, colour_config: ColourCodes, message_role: str = 'user', messages=None, msg_type: str = 'default'):
    if messages is None:
        messages: list[dict] = []

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

    temp_messages: list[dict] = []
    if messages is not None and isinstance(messages, list):
        temp_messages = messages
    temp_messages.append({"role": message_role, "content": message})

    payload = {
        "model": os.getenv('INF_MODEL_NAME'),
        "messages": temp_messages,
        "thinking": {"type": os.getenv("INF_REASONING_ENABLED", True), "budget_tokens": float(os.getenv("INF_MAX_REASONING_BUDGET", 4096))},
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
    print(f'{colour_config.DEBUG_CODE}{payload}{colour_config.RESET_CODE}')

    response = requests.post(url, json=payload, headers=headers, timeout=float(os.getenv("INF_TIMEOUT", 60)))

    if not response.ok:
        try:
            conv_to_json = response.json()
            error_reason = conv_to_json.get("error")
            detailed_error = conv_to_json.get('message')
            detail = f'{error_reason} ({detailed_error})'
        except ValueError:
            detail = response.text
        raise RuntimeError(f"{colour_config.ERROR_CODE}{response.status_code} {response.reason}: {detail}{colour_config.RESET_CODE}")

    try:
        body = response.json()
        return body
    except json.JSONDecodeError as e:
        raise RuntimeError(f"{colour_config.ERROR_CODE}ERROR (JSONDecodeError): {e}{colour_config.RESET_CODE}")


def save_session_to_file(file, data):

    split_by_slash = file.split('/')
    directory = '/'.join(split_by_slash[:-1])
    os.makedirs(directory, exist_ok=True)

    with open(file, 'w') as w_file:
        json.dump(data, w_file, indent=4)


def load_session_from_file(file, colour_config: ColourCodes):
    if not os.path.exists(file):
        raise OSError(f'{colour_config.ERROR_CODE}Path to [{file}] does not exist.{colour_config.RESET_CODE}')

    data = []
    with open(file, 'r') as r_file:
        data = json.load(r_file)

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
            raise Exception(f'{colour_config.ERROR_CODE}Error: Unknown INF_TYPE "{data_type}" in [{file}]')

    return data, run_sesh


def input_loop(ansi_config: ColourCodes):
    session = []
    running_chat = []
    print(f'{ansi_config.INFO_CODE}Loading Tokenizer...{ansi_config.RESET_CODE}')
    tokenizer = gigatoken.Tokenizer(os.getenv('INF_GIGATOKEN_TOKENIZER'))
    try:
        load_preexisting = 'Unset'
        while load_preexisting != 'Y' and load_preexisting != 'N':
            load_preexisting = input(f'\x1b[0K{ansi_config.CHOICE_CODE}Load Prior Chat? (Y/N): {ansi_config.RESET_CODE}')
            print(f'\x1b[1A{ansi_config.CHOICE_CODE}Load Prior Chat? (Y/N): {ansi_config.PROMPT_CODE}{load_preexisting}{ansi_config.RESET_CODE}\x1b[0J')
            if load_preexisting != 'Y' and load_preexisting != 'N':
                print(f'{ansi_config.ERROR_CODE}ERROR: Input only accepts "Y" and "N". Please resubmit.{ansi_config.RESET_CODE}\x1b[2A')

        session_file_name = input(f"{ansi_config.CHOICE_CODE}Name of Session (Don't include extension): {ansi_config.RESET_CODE}")
        print(f"\x1b[1A{ansi_config.CHOICE_CODE}Name of Session (Don't include extension): {ansi_config.PROMPT_CODE}{session_file_name}{ansi_config.RESET_CODE}\x1b[0J")
        if load_preexisting == 'Y':
            session, running_chat = load_session_from_file(f'{os.getenv("INF_SESSION_DIR", "data")}/{session_file_name}.json', ansi_config)

        print(f'{ansi_config.INFO_CODE}Entering Input Loop...{ansi_config.RESET_CODE}')
    except Exception as e:
        raise Exception(f'{ansi_config.ERROR_CODE}Exception: {e}{ansi_config.RESET_CODE}')

    try:
        while True:
            prompt = input(f'{ansi_config.CHOICE_CODE}Enter Prompt: {ansi_config.RESET_CODE}')
            num_newline = len(prompt.split('\n'))
            print(f'\x1b[{num_newline}A{ansi_config.CHOICE_CODE}Enter Prompt: {ansi_config.PROMPT_CODE}{prompt}{ansi_config.RESET_CODE}\x1b[0J')

            session.append({
                'INF_TYPE': 'PROMPT',
                'INF_PROMPT': prompt,
                'created': round(time.time()),
                'INF_TOKENS': len(tokenizer.encode(prompt))
            })
            response = send_single_message(prompt, message_role='user', messages=running_chat, colour_config=ansi_config)
            response['INF_TYPE'] = 'RESPONSE'
            session.append(response)
            temp = response.get('choices')[0].get('message')
            recieved_message = temp.get('content').lstrip('\n')
            reasoning = temp.get('reasoning').lstrip('\n')

            running_chat.append({'role': 'user', 'content': prompt})
            running_chat.append({'role': 'assistant', 'content': recieved_message, 'reasoning': reasoning})

            print(f'{ansi_config.INFO_CODE}REASONING: {ansi_config.REASON_CODE}{reasoning}{ansi_config.RESET_CODE}')
            print(f'{ansi_config.INFO_CODE}OUTPUT: {ansi_config.OUTPUT_CODE}{recieved_message}{ansi_config.RESET_CODE}')
            print('\n')
    except KeyboardInterrupt:
        print(f'{ansi_config.DEBUG_CODE}Recieved KeyboardInterrupt, Saving...{ansi_config.RESET_CODE}')
        interrupt_count = 0
        max_interrupt = 5
        while interrupt_count < max_interrupt:
            try:
                save_session_to_file(f'{os.getenv("INF_SESSION_DIR", "data")}/{session_file_name}.json', session)
                print(f'{ansi_config.INFO_CODE}Finished Saving.{ansi_config.RESET_CODE}')
                break
            except KeyboardInterrupt:
                interrupt_count += 1
                print(f'{ansi_config.DEBUG_CODE}Recieved KeyboardInterrupt {interrupt_count} of 5 needed to abort Save{ansi_config.RESET_CODE}')
        if interrupt_count >= max_interrupt:
            print(f'{ansi_config.DEBUG_CODE}Save was aborted by KeyboardInterrupt.{ansi_config.RESET_CODE}')
    except Exception as e:
        raise Exception(f'{ansi_config.ERROR_CODE}Exception: {e}{ansi_config.RESET_CODE}')
    print(f'{ansi_config.INFO_CODE}Closing Program...{ansi_config.RESET_CODE}')


def main():
    colour_config = load_config()
    input_loop(colour_config)


if __name__ == '__main__':
    main()
