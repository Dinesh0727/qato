// Test the curl parser with the provided curl command

const testCurl = `curl --location 'https://rcmqa.karix.com/services/rcm/sendMessage' \\
--header 'Authentication: Bearer Cv4zdo706u0P7YrwUMwRZA==' \\
--header 'Content-Type: application/json' \\
--data '{"message": {"channel": "WABA","content": {"preview_url": true,"shorten_url": false,"type": "TEMPLATE","template": {"templateId": "payment_u","parameterValues": {"0": "5644,23","1": "[~VL:72000~]","2": "https://www.google.com/search?client=firefox-b-d&q=drivers"},"language": "en"}},"recipient": {"to": "919398712957","recipient_type": "individual","reference": {"cust_ref": "cust ref test new ","conversationId": "conversation id test new","batchId": "410130031031145835340211","messageTag1": "livedelivery","messageTag2": "uniqueid message","messageTag3": "tag3","messageTag4": "tag4","messageTag5": "tag5"}},"sender": {"from": "917391093716"},"preferences": {"webHookDNId": "1001"},"smsFallback": {"sender": "Alerts","destination": "919176479549","message": "qa test message for testing lounge"}},"metaData": {"version": "v1.0.9","originator": "API"}}'`;

// Simulate the parsing logic
let command = testCurl.trim();
if (command.startsWith('curl ')) {
    command = command.substring(5);
}

// Handle line continuations (backslash)
command = command.replace(/\\\s*\n\s*/g, ' ');

console.log('=== PROCESSED COMMAND ===');
console.log(command);
console.log('\n=== TESTING DATA REGEX ===');

// Test the regex pattern
const dataMatch = command.match(/(?:--data-raw|--data-binary|--data|-d)\s+(['"])([\s\S]*?)\1(?:\s|$)/);

if (dataMatch) {
    console.log('Match found!');
    console.log('Full match:', dataMatch[0].substring(0, 100) + '...');
    console.log('Quote type:', dataMatch[1]);
    console.log('Body length:', dataMatch[2].length);
    console.log('\n=== FULL BODY ===');
    console.log(dataMatch[2]);
    console.log('\n=== PARSED JSON ===');
    try {
        const parsed = JSON.parse(dataMatch[2]);
        console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
        console.log('Failed to parse JSON:', e.message);
    }
} else {
    console.log('NO MATCH FOUND!');
    
    // Try alternative patterns
    console.log('\n=== TRYING ALTERNATIVE PATTERNS ===');
    
    // Pattern 1: Non-greedy with any content
    const alt1 = command.match(/--data\s+'([^']*?)'/);
    console.log('Alt 1 (simple single quote):', alt1 ? 'MATCH' : 'NO MATCH');
    
    // Pattern 2: Greedy match
    const alt2 = command.match(/--data\s+'(.*)'/);
    console.log('Alt 2 (greedy single quote):', alt2 ? 'MATCH' : 'NO MATCH');
    if (alt2) {
        console.log('Body length:', alt2[1].length);
        console.log('Body ends with:', alt2[1].slice(-20));
    }
}
