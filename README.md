# README.md

## Notice
This is (at the moment) a command-line inference script for interferencing with Large Language Models. This is purely set for TEXT. No other modalities are implemented nor planned really.

To be more specific, this DOES NOT do any actual inference on it's own. This repository instead sends API requests to your provider of choice (specified in .env).
NOTE: Also no tool-calls or what-not, none of that is handled.
NOTE: the biggest requirement in this repository, gigatoken, is only for tallying up token-counts for user-prompts. If you don't want the extra requirements, you can remove gigatoken from requirements.txt and switch out "'INF_TOKENS': len(tokenizer.encode(prompt))" in sparkfile.py to "'INF_TOKENS': round(len(prompt) / 3.4)" (or some value similar to 3.4)

## Installation
Step 1. Open your commandline of choice and navigate to the parent directory you wish for this repository to be in
Step 2. Run: 'git clone https://github.com/azurestars-1/Interfance.git'
Step 3. Enter the directory you just created via: 'cd Interfance'
Step 4. Create a virtual environment using: 'python -m venv venv'
Step 5. Activate the virtual environment via: 'venv/Scripts/activate'
Step 6. Install the packages needed to run the repository via: 'pip install -r requirements.txt'
Step 7. Create a copy of '.env.example', rename it to '.env'
Step 8. Set INF_API_BASE_URL, INF_API_KEY, and INF_MODEL_NAME accordingly for your model/provider of choice.
Step 9. (Make sure you saved the .env file)
Step 10. Run the script via 'python sparkfile.py'

NOTE: You can save the current session by performing a keyboard-interrupt (however you would normally cancel a script in your terminal of choice)

## Capabilities
- Colour-coded Terminal Readout (not much of a capability, I just think it looks neat)
- Save/Resume chat sessions with LLMs
- Use provider/model of choice via .env
- Store all metadata from LLM responses (so you can do analytics)
- - Cause it's in plain json this also means you can change/edit the LLM responses. Prefill not set up right now though.