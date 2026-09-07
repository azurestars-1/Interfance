const input = document.querySelector("#file-upload");
const fileName = document.querySelector("#file-name");
const sessionLoaderButton = document.querySelector("#session-loader-button");
const fakeLoaderButton = document.querySelector("#FakeButton");
const mainbody = document.querySelector("#MainBody");
const sessionChat = document.querySelector("#session-chat");
const sessionChatHTML = document.querySelector("#session-chat-html");

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
function sessionChatFocus_HTMLClick(event) {

    sessionChatHTML.innerHTML = '';
    sessionChatHTML.style.display = 'none';
    sessionChat.style.display = 'block';
    sessionChat.focus();
}

// Attribution to Gemma4 31B for this function
function countStr(text, search) {
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

function sessionChatUnFocused() {
    let content = sessionChat.value;
    let potentialMSGs = countStr(content, "{{[OUTPUT]}}") + countStr(content, "{{[INPUT]}}") + countStr(content, "{{[SYSTEM]}}")
    for (let index=0; index < potentialMSGs; index++) {
        next_output = content.indexOf('{{[OUTPUT]}}')
        next_input = content.indexOf('{{[INPUT]}}')
        next_system = content.indexOf('{{[SYSTEM]}}')

        if (next_input == -1 && next_output == -1 && next_system == -1) {
            break
        }
        else if (next_input == -1 && next_output == -1) {
            content = content.replace('{{[SYSTEM]}}', '<div class="Message"><p class="System-MSG">')
            content += '</p></div>'
        } else if (next_input == -1 && next_system == -1) {
            content = content.replace('{{[OUTPUT]}}', '<div class="Message"><p class="LLM-MSG">')
            content = content.replace('<think>', '<details><summary>LLM-Reasoning</summary><span class="LLM-Reasoning">')
            content = content.replace('</think>', '</span></details><span class="LLM-Output">')
            content += '</span></p></div>'
        } else if (next_output == -1 && next_system == -1) {
            content = content.replace('{{[INPUT]}}', '<div class="Message"><p class="User-MSG">')
            content += '</p></div>'
        } else if (next_input == -1) {
            if (next_output < next_system) {
                content = content.replace('{{[OUTPUT]}}', '<div class="Message"><p class="LLM-MSG">')
                content = content.replace('<think>', '<details><summary>LLM-Reasoning</summary><span class="LLM-Reasoning">')
                content = content.replace('</think>', '</span></details><span class="LLM-Output">')
                temp1 = content.indexOf('{{[OUTPUT]}}')
                temp2 = content.indexOf('{{[SYSTEM]}}')
                if (temp1 == -1 || temp2 < temp1) {
                    content = content.replace('{{[SYSTEM]}}', '</span></p></div>{{[SYSTEM]}}');
                } else {
                    content = content.replace('{{[OUTPUT]}}', '</span></p></div>{{[OUTPUT]}}');
                }
            } else {
                content = content.replace('{{[SYSTEM]}}', '<div class="Message"><p class="System-MSG">')
                temp1 = content.indexOf('{{[OUTPUT]}}')
                temp2 = content.indexOf('{{[SYSTEM]}}')
                if (temp2 == -1 || temp1 < temp2) {
                    content = content.replace('{{[OUTPUT]}}', '</p></div>{{[OUTPUT]}}');
                } else {
                    content = content.replace('{{[SYSTEM]}}', '</p></div>{{[SYSTEM]}}');
                }
            }
        } else if (next_output == -1) {
            if (next_input < next_system) {
                content = content.replace('{{[INPUT]}}', '<div class="Message"><p class="User-MSG">')
                temp1 = content.indexOf('{{[INPUT]}}')
                temp2 = content.indexOf('{{[SYSTEM]}}')
                if (temp1 == -1 || temp2 < temp1) {
                    content = content.replace('{{[SYSTEM]}}', '</span></p></div>{{[SYSTEM]}}');
                } else {
                    content = content.replace('{{[INPUT]}}', '</span></p></div>{{[INPUT]}}');
                }
            } else {
                content = content.replace('{{[SYSTEM]}}', '<div class="Message"><p class="System-MSG">')
                temp1 = content.indexOf('{{[INPUT]}}')
                temp2 = content.indexOf('{{[SYSTEM]}}')
                if (temp2 == -1 || temp1 < temp2) {
                    content = content.replace('{{[INPUT]}}', '</p></div>{{[INPUT]}}');
                } else {
                    content = content.replace('{{[SYSTEM]}}', '</p></div>{{[SYSTEM]}}');
                }
            }
        } else if (next_system == -1) {
            if (next_input < next_output) {
                content = content.replace('{{[INPUT]}}', '<div class="Message"><p class="User-MSG">');
                temp1 = content.indexOf('{{[INPUT]}}')
                temp2 = content.indexOf('{{[OUTPUT]}}')
                if (temp1 == -1 || temp2 < temp1) {
                    content = content.replace('{{[OUTPUT]}}', '</span></p></div>{{[OUTPUT]}}');
                } else {
                    content = content.replace('{{[INPUT]}}', '</span></p></div>{{[INPUT]}}');
                }
            } else {
                content = content.replace('{{[OUTPUT]}}', '<div class="Message"><p class="LLM-MSG">')
                content = content.replace('<think>', '<details><summary>LLM-Reasoning</summary><span class="LLM-Reasoning">')
                content = content.replace('</think>', '</span></details><span class="LLM-Output">')
                temp1 = content.indexOf('{{[OUTPUT]}}')
                temp2 = content.indexOf('{{[INPUT]}}')
                if (temp1 == -1 || temp2 < temp1) {
                    content = content.replace('{{[INPUT]}}', '</span></p></div>{{[INPUT]}}');
                } else {
                    content = content.replace('{{[OUTPUT]}}', '</span></p></div>{{[OUTPUT]}}');
                }
            }
        } else {
            if (next_input < next_output && next_input < next_system) {
                content = content.replace('{{[INPUT]}}', '<div class="Message"><p class="User-MSG">')
                temp1 = content.indexOf('{{[INPUT]}}')
                temp2 = content.indexOf('{{[OUTPUT]}}')
                temp3 = content.indexOf('{{[SYSTEM]}}')
                if (temp1 == -1) {
                    if (temp2 < temp3) {
                        content = content.replace('{{[OUTPUT]}}', '</span></p></div>{{[OUTPUT]}}');
                    } else {
                        content = content.replace('{{[SYSTEM]}}', '</span></p></div>{{[SYSTEM]}}');
                    }
                } else {
                    if (temp1 < temp2 && temp1 < temp3) {
                        content = content.replace('{{[INPUT]}}', '</span></p></div>{{[INPUT]}}');
                    } else if (temp2 < temp1 && temp2 < temp3) {
                        content = content.replace('{{[OUTPUT]}}', '</span></p></div>{{[OUTPUT]}}');
                    } else {
                        content = content.replace('{{[SYSTEM]}}', '</span></p></div>{{[SYSTEM]}}');
                    }
                }
            } else if (next_output < next_input && next_output < next_system) {
                content = content.replace('{{[OUTPUT]}}', '<div class="Message"><p class="LLM-MSG">')
                content = content.replace('<think>', '<details><summary>LLM-Reasoning</summary><span class="LLM-Reasoning">')
                content = content.replace('</think>', '</span></details><span class="LLM-Output">')

                temp1 = content.indexOf('{{[INPUT]}}')
                temp2 = content.indexOf('{{[OUTPUT]}}')
                temp3 = content.indexOf('{{[SYSTEM]}}')
                if (temp2 == -1) {
                    if (temp1 < temp3) {
                        content = content.replace('{{[INPUT]}}', '</span></p></div>{{[INPUT]}}');
                    } else {
                        content = content.replace('{{[SYSTEM]}}', '</span></p></div>{{[SYSTEM]}}');
                    }
                } else {
                    if (temp1 < temp2 && temp1 < temp3) {
                        content = content.replace('{{[INPUT]}}', '</span></p></div>{{[INPUT]}}');
                    } else if (temp2 < temp1 && temp2 < temp3) {
                        content = content.replace('{{[OUTPUT]}}', '</span></p></div>{{[OUTPUT]}}');
                    } else {
                        content = content.replace('{{[SYSTEM]}}', '</span></p></div>{{[SYSTEM]}}');
                    }
                }
            } else {
                content = content.replace('{{[SYSTEM]}}', '<div class="Message"><p class="System-MSG">')
                temp1 = content.indexOf('{{[INPUT]}}')
                temp2 = content.indexOf('{{[OUTPUT]}}')
                temp3 = content.indexOf('{{[SYSTEM]}}')

                if (temp3 == -1) {
                    if (temp1 < temp2) {
                        content = content.replace('{{[INPUT]}}', '</span></p></div>{{[INPUT]}}');
                    } else {
                        content = content.replace('{{[OUTPUT]}}', '</span></p></div>{{[OUTPUT]}}');
                    }
                } else {
                    if (temp1 < temp2 && temp1 < temp3) {
                        content = content.replace('{{[INPUT]}}', '</span></p></div>{{[INPUT]}}');
                    } else if (temp2 < temp1 && temp2 < temp3) {
                        content = content.replace('{{[OUTPUT]}}', '</span></p></div>{{[OUTPUT]}}');
                    } else {
                        content = content.replace('{{[SYSTEM]}}', '</span></p></div>{{[SYSTEM]}}');
                    }
                }
            }
        }
    }
    sessionChatHTML.innerHTML = content;
    sessionChatHTML.style.display = 'block';
    sessionChat.style.display = 'none';

}


async function sendSessionToFlask() {
    console.log(input);
    console.log(input.files);
    const file = input.files[0];

    if (!file) {
        alert("Please select a file first!");
        return;
    }

    const formData = new FormData();
    // 'file' is the key Flask will use to find the file in request.files
    formData.append('file', file);

    try {
        const response = await fetch('/RequestSession', {
            method: 'POST',
            body: formData
            // Note: Do NOT set the 'Content-Type' header manually.
            // The browser will automatically set it to 'multipart/form-data'
            // with the correct boundary string.
        });
        const result = await response.json();

        // No Attribution for LLMs past here
        MainBody.style.display = "block";

        const length = result.content.session.length
        let update_str = "";
        for (let index=0; index < length; index++) {
            if (result.content.session[index].role === "assistant") {
                update_str += "\n{{[OUTPUT]}}<think>";
                update_str += `${result.content.session[index].reasoning}`;
                update_str += "</think>";
                update_str += `${result.content.session[index].content}`;
            } else if (result.content.session[index].role === 'user'){
                update_str += "\n{{[INPUT]}}";
                update_str += `${result.content.session[index].content}`;
            } else if (result.content.session[index].role === 'system'){
                update_str += "\n{{[SYSTEM]}}";
                update_str += `${result.content.session[index].content}`;
            }
        }
        sessionChat.textContent = update_str;
        sessionChatFocus();
        sessionChatUnFocused();

        console.log(result);
        console.log(result.content.data);
    } catch (error) {
        console.error("Error uploading file:", error);
    }
}




// Event Listeners
input.addEventListener("change", updateSessionSelection);
sessionLoaderButton.addEventListener("click", sendSessionToFlask);
sessionChat.addEventListener("focus", sessionChatFocus);
sessionChatHTML.addEventListener("dblclick", sessionChatFocus_HTMLClick);
sessionChat.addEventListener("blur", sessionChatUnFocused);


// Set Initial States
updateSessionSelection();