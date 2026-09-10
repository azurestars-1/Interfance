const input = document.querySelector("#file-upload");
const fileName = document.querySelector("#file-name");
const sessionLoaderButton = document.querySelector("#session-loader-button");
const fakeLoaderButton = document.querySelector("#FakeButton");
const MainBody = document.querySelector("#MainBody");
const sessionChat = document.querySelector("#session-chat");
const sessionChatHTML = document.querySelector("#session-chat-html");
const messageSubmitBTN = document.querySelector('#message-button');
const messageSubmitInput = document.querySelector("#message-input");
const clearSessionBTN = document.querySelector("#session-clear-button");
const saveSessionBTN = document.querySelector("#session-saver-button");
const formatRadio = document.querySelector("#save-format");

function updateSessionSelection() {
    const hasFile = input.files.length > 0;

    fileName.textContent = hasFile
        ? input.files[0].name
        : "No session chosen";

    sessionLoaderButton.style.display = hasFile ? "block" : "none";
    fakeLoaderButton.style.display = hasFile ? "none" : "block";
}

function sessionChatFocus() {
    sessionChatHTML.innerHTML = '';
    sessionChatHTML.style.display = 'none';
    sessionChat.style.display = 'block';
    sessionChat.focus();
}
function sessionChatFocus_HTMLClick() {
    sessionChatHTML.innerHTML = '';
    sessionChatHTML.style.display = 'none';
    sessionChat.style.display = 'block';
    sessionChat.focus();
}

// Attribution to Gemma4 31B for this function
function gemma4_31B_interceptTab(event, selector) {
    if (event.key === 'Tab') {
        event.preventDefault();

        // Get the current cursor position
        const start = selector.selectionStart;
        const end = selector.selectionEnd;

        // Set the value to: text before cursor + tab + text after cursor
        selector.value = selector.value.substring(0, start) +
                         "\t" +
                         selector.value.substring(end);

        // Put the cursor back in the right place (after the inserted tab)
        selector.selectionStart = selector.selectionEnd = start + 1;
  }
}

// Attribution to Gemma4 31B for this function
function gemma4_31B_countStr(text, search) {
    if (!search) {
        return 0;
    }

    let count = 0;
    let index = 0;
    while ((index = text.indexOf(search, index)) !== -1) {
        count += 1;
        index += search.length;
    }
    return count
}

// Attribution to Gemma4 31B for this function
function gemma4_31B_replaceFromIndex(initialText, searchStr, replacement, index) {
    return initialText.slice(0, index) + initialText.slice(index).replace(searchStr, replacement);
}

// Attribution to Gemma4 31B for this function
function gemma4_31B_escape_innerhtml(longString) {
    const allowedTags = ['div', 'span', 'details', 'summary'];
    // Create a regex pattern: (div|span|details|summary)
    const tagPattern = new RegExp(`(<\\/?(${allowedTags.join('|')})\\b[^>]*>)`, 'gi');

    // 1. Temporarily replace allowed tags with a unique placeholder
    const placeholders = [];
    const protectedString = longString.replace(tagPattern, (match) => {
      placeholders.push(match);
      return `__TAG_${placeholders.length - 1}__`;
    });

    // 2. Escape all remaining < and > characters
    const escapedString = protectedString
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 3. Restore the allowed tags from the placeholders
    return escapedString.replace(/__TAG_(\d+)__/g, (_, index) => {
      return placeholders[index];
    });
}

function think_replace(initialText, interiorName, index, secondIndex) {
    initialText = gemma4_31B_replaceFromIndex(initialText, '<think>', `<details><summary>${interiorName}</summary><span class="${interiorName}">`, index);
    return gemma4_31B_replaceFromIndex(initialText, '</think>', '</span></details>', secondIndex);
}

async function sessionChatUnFocused() {
    let content = sessionChat.value;

    if (content.length < 1) {
        return;
    }


    let potentialMSGs = gemma4_31B_countStr(content, "{{[OUTPUT]}}") + gemma4_31B_countStr(content, "{{[INPUT]}}") + gemma4_31B_countStr(content, "{{[SYSTEM]}}")

    let finished = 0;
    let mv_index = 0;
    while (finished === 0) {
        let frst_think = content.indexOf('<think>', mv_index);
        let second_think = content.indexOf('<think>', frst_think + 7);
        let frst_close_think = content.indexOf('</think>', mv_index);
        //console.log('OPEN: ' + `${frst_think}` + '; CLOSE: ' + `${frst_close_think}`);

        if (frst_think === -1 && frst_close_think === -1) {
            finished = 1;
            break;
        } else if (frst_think === -1 && frst_close_think > -1) {
            // Don't need to move index here.
            content = gemma4_31B_replaceFromIndex(content, '</think>', '<|EXTRA_CLOSING_THINK|>', mv_index);
            mv_index = frst_close_think + 23;
        } else if (frst_close_think === -1 && frst_think > -1) {
            content = gemma4_31B_replaceFromIndex(content, '<think>', '<|UNCLOSED_THINK|>', mv_index);
            mv_index = frst_think + 18;
        } else if (second_think !== -1 && frst_close_think !== -1 && frst_close_think > second_think) {
            content = gemma4_31B_replaceFromIndex(content, '<think>', '<|UNCLOSED_THINK|>', mv_index);
            mv_index = frst_think + 18;
        } else {
            if (frst_close_think < frst_think) {
                content = gemma4_31B_replaceFromIndex(content, '</think>', '<|MALFORMED_CLOSING_THINK|>', mv_index);
                mv_index = frst_think + 27;
            } else {
                mv_index = frst_close_think + 8;
            }
        }
    }

    let mostRecentType = '';
    let lastsetlabel = '';
    let numThinks = gemma4_31B_countStr(content, "<think>")
    let prevdex = 0;
    for (let index = 0; index < numThinks; index++) {
        let curdex = content.indexOf('<think>', prevdex);

        let closingdex = content.indexOf('</think>', curdex);
        let next_output = content.indexOf('{{[OUTPUT]}}', prevdex);
        let next_system = content.indexOf('{{[SYSTEM]}}', prevdex);
        let next_input = content.indexOf('{{[INPUT]}}', prevdex);

        if (curdex === -1) {
            console.log('ABORTING');
            break
        }

        // If any are less than the index, find the one that happens most recently
        if ((next_system !== -1 && next_system < curdex) || (next_output !== -1 && next_output < curdex) || (next_input !== -1 && next_input < curdex)) {
            if (next_system !== -1 && next_system < curdex && (next_system > next_output || next_output === -1 || next_output > curdex) && (next_system > next_input || next_input === -1 || next_input > curdex)) {
                mostRecentType = 'System';
            } else if (next_output !== -1 && next_output < curdex && (next_output > next_system || next_system === -1 || next_system > curdex) && (next_output > next_input || next_input === -1 || next_input > curdex)) {
                mostRecentType = 'Output';
            } else if (next_input !== -1 && next_input < curdex && (next_input > next_output || next_output === -1 || next_output > curdex) && (next_input > next_system || next_system === -1 || next_system > curdex)) {
                mostRecentType = 'Input';
            }
        } else {
            // To land in this loop, they must all be happening after curdex, meaning we need to look at the last used label.
            if (lastsetlabel === 'System') {
                mostRecentType = 'System';
            } else if (lastsetlabel === 'Input') {
                mostRecentType = 'Input';
            } else if (lastsetlabel === 'Output') {
                mostRecentType = 'Output';
            }
        }

        let name_to_use = ''
        if (mostRecentType === 'System') {
            name_to_use = 'System-Reasoning';
        } else if (mostRecentType === 'Input') {
            name_to_use = 'User-Reasoning';
        } else if (mostRecentType === 'Output') {
            name_to_use = 'LLM-Reasoning';
        }

        content = think_replace(content, name_to_use, curdex, closingdex);

        prevdex = curdex;
    }

    for (let index = 0; index < potentialMSGs; index++) {
        let next_output = content.indexOf('{{[OUTPUT]}}');
        let next_system = content.indexOf('{{[SYSTEM]}}');
        let next_input = content.indexOf('{{[INPUT]}}');

        if (next_system === -1 && next_output === -1 && next_input === -1) {
            break;
        }

        let templateMSG = '';
        let mainDivName = '';
        let secondDivName = '';
        let prev_index = next_output;

        if (next_output !== -1 && (next_input === -1 || next_output < next_input) && (next_system === -1 || next_output < next_system)) {
            templateMSG = '{{[OUTPUT]}}';
            mainDivName = 'LLM-MSG';
            secondDivName = 'LLM-Output';
            prev_index = next_output;
        } else if (next_input !== -1 && (next_output === -1 || next_input < next_output) && (next_system === -1 || next_input < next_system)) {
            templateMSG = '{{[INPUT]}}';
            mainDivName = 'User-MSG';
            secondDivName = 'User-Prompt';
            prev_index = next_input;
        } else if (next_system !== -1 && (next_output === -1 || next_system < next_output) && (next_input === -1 || next_system < next_input)) {
            templateMSG = '{{[SYSTEM]}}';
            mainDivName = 'System-MSG';
            secondDivName = 'System-Prompt';
            prev_index = next_system;
        } else {
            console.log(`UNPLANNED FOR????? We slipped past the break; Index: ${index}; Output: ${next_output}; Input: ${next_input}; System: ${next_system}`);
            break;
        }

        content = content.replace(templateMSG, `<div class="Message"><div class="${mainDivName}">`);
        let min_short_index = -1;
        next_output = content.indexOf('{{[OUTPUT]}}');
        next_system = content.indexOf('{{[SYSTEM]}}');
        next_input = content.indexOf('{{[INPUT]}}');


        let next_close_span = content.indexOf('</details>', prev_index);
        let anchor = '';

        if (next_output !== -1 && (next_input === -1 || next_output < next_input) && (next_system === -1 || next_output < next_system)) {
            anchor = '{{[OUTPUT]}}';
            min_short_index = next_output;
        } else if (next_input !== -1 && (next_output === -1 || next_input < next_output) && (next_system === -1 || next_input < next_system)) {
            anchor = '{{[INPUT]}}';
            min_short_index = next_input;
        } else if (next_system !== -1 && (next_output === -1 || next_system < next_output) && (next_input === -1 || next_system < next_input)) {
            anchor = '{{[SYSTEM]}}';
            min_short_index = next_system;
        }
    }

    const response = await fetch('/processAtIndex', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
                'content': content,
        })
    });
    const result = await response.json();
    content = result.content;

    sessionChatHTML.innerHTML = gemma4_31B_escape_innerhtml(content);
    sessionChatHTML.style.display = 'block';
    sessionChat.style.display = 'none';

}

function build_message_template() {
    const message_arr = document.querySelectorAll('div.Message');
    const message_dict = [];
    message_arr.forEach(element => {
        // We skip the role container
        let element_children = element.children[1];

        let split_arr = [];
        let mainContent = '';
        let mainReasoning = '';
        let role = 'UNSET-ROLE';
        let reason_name = 'UNSET-REASONING';
        let output_name = 'UNSET-OUTPUT'


        if (element_children.className === 'System-MSG') {
            role = 'system';
            reason_name = 'System-Reasoning';
            output_name = 'System-Prompt';
        } else if (element_children.className === 'User-MSG') {
            role = 'user';
            reason_name = 'User-Reasoning';
            output_name = 'User-Prompt';
        } else if (element_children.className === 'LLM-MSG') {
            role = 'assistant';
            reason_name = 'LLM-Reasoning';
            output_name = 'LLM-Output';
        }
        let elements_children = [...element_children.children];

        elements_children.forEach(child_element => {
            if (child_element.tagName === 'DETAILS') {
                let sub_children = [...child_element.children];
                sub_children.forEach(subchild_child => {
                    if (subchild_child.className === reason_name) {
                        split_arr.push({'type':'Reasoning', 'content':subchild_child.textContent});
                        mainReasoning += subchild_child.textContent;
                    }
                });
           } else if (child_element.className === output_name) {
                split_arr.push({'type':'Text', 'content':child_element.textContent});
                mainContent += child_element.textContent;
           }
        });
        message_dict.push({
            'INF_TYPE': 'WEBUI',
            'role': role,
            'split_arr': split_arr,
        });

    });

    return message_dict;
}

function sessionClear() {
    MainBody.style.display = "block";
    sessionChat.value = '';
    sessionChatHTML.innerHTML = '';
    sessionChat.style.display = 'block';
    sessionChatHTML.style.display = 'none';
    sessionChat.focus();
}

async function sessionSave() {
    const selectedOption = document.querySelector('input[name="save-format"]:checked');
    if (selectedOption) {
        const value = selectedOption.value;

        if (value === 'Plain-Text') {
            const blob = new Blob([sessionChat.value], {type: 'text/plain'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "interfance_session.txt";
            a.click();
            URL.revokeObjectURL(url);
        } else if (value === 'Interfance') {
            let jsonned = JSON.stringify(build_message_template())
            const blob = new Blob([jsonned], {type: "application/json"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "interfance_session.json";
            a.click();
            URL.revokeObjectURL(url);
        } else if (value === 'OAI') {
            try {
                const temp_dict = build_message_template();
                const response = await fetch('/convert_to_openAI_format', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        'template': temp_dict,
                    })
                });
                const result = await response.json();
                const blob = new Blob([JSON.stringify(result.content)], {type: "application/json"});
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "interfance_session.json";
                a.click();
                URL.revokeObjectURL(url);
            } catch (error) {
                console.error("Error sending prompt for generation:", error);
            }
        }
    }
}

async function sendForGeneration() {
    const temp_dict = build_message_template();
    temp_dict.push({
        'INF_TYPE': 'WEBUI',
        'role': 'user',
        'split_arr': [{'type': 'Text', 'content': messageSubmitInput.value}],
    });
    messageSubmitInput.disabled = true;
    messageSubmitBTN.disabled = true;

    try {
        const response = await fetch('/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                'template': temp_dict,
            })
        });
        const result = await response.json();
        sessionChat.value = result.content;
        await sessionChatUnFocused();
        messageSubmitInput.value = '';
        messageSubmitInput.disabled = false;
        messageSubmitBTN.disabled = false;
        messageSubmitInput.focus();

    } catch (error) {
        console.error("Error sending prompt for generation:", error);
    }

}

async function sendSessionToFlask() {
    const file = input.files[0];

    if (!file) {
        alert("Please select a file first!");
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/RequestFile', {
            method: 'POST',
            body: formData
            // Note: Do NOT set the 'Content-Type' header manually.
            // The browser will automatically set it to 'multipart/form-data'
            // with the correct boundary string.
        });

        MainBody.style.display = "block";
        const result = await response.json();

        try {
            let finstr = '';
            result.content.data.forEach(element => {
                let mster_str = '';
                let role = element.role;
                if (role === 'user') {
                    mster_str += '{{[INPUT]}}';
                } else if (role === 'assistant') {
                    mster_str += '{{[OUTPUT]}}';
                } else if (role === 'system') {
                    mster_str += '{{[SYSTEM]}}';
                } else {
                    mster_str += '{{[SYSTEM]}}';
                }

                element.split_arr.forEach(entry => {
                    let rtype = entry.type;
                    if (rtype === 'Reasoning') {
                        mster_str += `<think>{entry.content}</think>`;
                    } else if (rtype === 'Text') {
                        mster_str += `${entry.content}`;
                    }
                });
                mster_str = mster_str.trim()
                finstr += `\n${mster_str}`;
            });
            finstr = finstr.trim();
            sessionChat.value = finstr;
            await sessionChatUnFocused();
        } catch (error) {
            console.log(`Not an Interfance Save; ${error}`);
            try {
                let finstr = '';
                result.content.data.forEach(element => {
                    let mster_str = '';
                    let role = element.role;
                    if (role === 'user') {
                        mster_str += '{{[INPUT]}}';
                    } else if (role === 'assistant') {
                        mster_str += '{{[OUTPUT]}}';
                    } else if (role === 'system') {
                        mster_str += '{{[SYSTEM]}}';
                    } else {
                        mster_str += '{{[SYSTEM]}}';
                    }

                    if ('reasoning' in element) {
                        mster_str += `<think>${element.reasoning}</think>`
                    }
                    // purposeful to throw an error if this isn't an OAI save.
                    let templen = element.content.length;

                    mster_str += `${element.content}`;
                    mster_str = mster_str.trim()
                    finstr += `\n${mster_str}`;
                });
                finstr = finstr.trim();
                sessionChat.value = finstr;
                await sessionChatUnFocused();
            } catch (error) {
                console.log(`Not an OAI Save; ${error}`);
                try {
                    let finstr = '';
                    let temp = sessionChat.value = result.content.data;
                    temp.forEach(element => {
                        let mster_str = '';
                        if (element.INF_TYPE === 'PROMPT') {
                            mster_str += `{{[INPUT]}}${element.INF_PROMPT}`;
                        } else if (element.INF_TYPE === 'RESPONSE') {
                            let msg = element.choices[0].message;
                            if (msg.role === 'user') {
                                mster_str += '{{[INPUT]}}';
                            } else if (msg.role === 'assistant') {
                                mster_str += '{{[OUTPUT]}}';
                            } else {
                                mster_str += '{{[SYSTEM]}}'
                            }
                            if ('reasoning' in msg) {
                                mster_str += `<think>${msg.reasoning}</think>`
                            }
                            mster_str += `${msg.content}`;
                        }
                        finstr += '\n' + mster_str.trim();
                    });
                    finstr = finstr.trim()
                    sessionChat.value = finstr;
                    await sessionChatUnFocused();

                } catch (error) {
                    console.log(`Not a terminal Save; ${error}`);
                    sessionChat.value = result.content.data;
                    await sessionChatUnFocused();
                }
            }
        }
    } catch (error) {
        console.error("Error uploading file:", error);
    }
}



// Event Listeners
input.addEventListener("change", updateSessionSelection);
sessionLoaderButton.addEventListener("click", sendSessionToFlask);
messageSubmitBTN.addEventListener("click", sendForGeneration);
sessionChat.addEventListener("focus", sessionChatFocus);
sessionChatHTML.addEventListener("dblclick", sessionChatFocus_HTMLClick);
sessionChat.addEventListener("blur", sessionChatUnFocused);

clearSessionBTN.addEventListener("click", sessionClear);
saveSessionBTN.addEventListener("click", sessionSave);

messageSubmitInput.addEventListener("keydown", (event) => {gemma4_31B_interceptTab(event, messageSubmitInput)});
sessionChat.addEventListener("keydown", (event) => {gemma4_31B_interceptTab(event, sessionChat)});

// Set Initial States
updateSessionSelection();