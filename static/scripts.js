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

function gemma4_31B_replaceFromIndex(initialText, searchStr, replacement, index) {
    return initialText.slice(0, index) + initialText.slice(index).replace(searchStr, replacement);
}

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

function sessionChatUnFocused() {
    let content = sessionChat.value;
    let potentialMSGs = gemma4_31B_countStr(content, "{{[OUTPUT]}}") + gemma4_31B_countStr(content, "{{[INPUT]}}") + gemma4_31B_countStr(content, "{{[SYSTEM]}}")

    let finished = 0;
    let mv_index = 0;
    while (finished===0) {
        let frst_think = content.indexOf('<think>', mv_index);
        let second_think = content.indexOf('<think>', frst_think+7);
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
    for (let index=0; index < numThinks; index++) {
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
            if (next_system !== -1 && next_system < curdex &&  (next_system > next_output || next_output === -1 || next_output > curdex) && (next_system > next_input || next_input === -1 || next_input > curdex)) {
                mostRecentType = 'System';
            } else if (next_output !== -1 && next_output < curdex && (next_output > next_system || next_system === -1 || next_system > curdex) && (next_output > next_input || next_input === -1 || next_input > curdex)) {
                mostRecentType = 'Output';
            } else if (next_input !== -1 && next_input < curdex &&  (next_input > next_output || next_output === -1 || next_output > curdex) && (next_input > next_system || next_system === -1 || next_system > curdex)) {
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

    mv_index = 0;
    for (let index=0; index<potentialMSGs; index++) {
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
        if (anchor !== '') {
            if (next_close_span === -1 || next_close_span > min_short_index) {
                content = gemma4_31B_replaceFromIndex(content, `<div class="Message"><div class="${mainDivName}">`, `<div class="Message"><div class="${mainDivName}"><span class="${secondDivName}">`, prev_index);
                content = gemma4_31B_replaceFromIndex(content, anchor, `</span></div></div>${anchor}`, prev_index);
            } else {
                content = gemma4_31B_replaceFromIndex(content, '</details>', `</details><span class="${secondDivName}">`, prev_index);
                content = gemma4_31B_replaceFromIndex(content, anchor, `</span></div></div>${anchor}`, prev_index);
            }
        } else {
            if (next_close_span === -1 || next_close_span > min_short_index) {
                content = gemma4_31B_replaceFromIndex(content, `<div class="Message"><div class="${mainDivName}">`, `<div class="Message"><div class="${mainDivName}"><span class="${secondDivName}">`, prev_index);
            } else {
                content = gemma4_31B_replaceFromIndex(content, '</details>', `</details><span class="${secondDivName}">`, prev_index);
            }
            content += '</span></div></div>'
        }
    }

    sessionChatHTML.innerHTML = gemma4_31B_escape_innerhtml(content);
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