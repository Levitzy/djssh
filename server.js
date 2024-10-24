const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const base64 = require('base-64');

const app = express();
app.use(bodyParser.json());

const KEY = "X25ldHN5bmFfbmV0bW9kXw=="; // The same key used in the Python file

// Function to decrypt the data
function decrypt(encryptedData) {
  try {
    const keyBytes = Buffer.from(base64.decode(KEY), 'base64');
    const cipher = crypto.createDecipheriv('aes-128-ecb', keyBytes, null);
    let decrypted = cipher.update(Buffer.from(base64.decode(encryptedData), 'base64'), 'binary', 'utf8');
    decrypted += cipher.final('utf8');
    return formatDecryptedData(decrypted.trim());
  } catch (err) {
    return `Error during decryption: ${err.message}`;
  }
}

// Function to format decrypted data
function formatDecryptedData(decryptedData) {
  let formattedData = [];

  try {
    const jsonData = JSON.parse(decryptedData);
    formattedData.push(formatJson(jsonData));
  } catch (err) {
    const jsonObjects = findJsonObjects(decryptedData);
    if (jsonObjects.length === 0) {
      formattedData.push("No valid JSON objects found.");
    }
    jsonObjects.forEach((obj, index) => {
      try {
        const jsonData = JSON.parse(obj);
        formattedData.push(formatJson(jsonData));
      } catch (e) {
        formattedData.push(`Error parsing JSON data in object ${index + 1}: ${e.message}`);
      }
    });
  }

  return formattedData.join('\n\n');
}

// Function to find JSON objects within decrypted string
function findJsonObjects(text) {
  const jsonObjects = [];
  let braceCount = 0;
  let startIndex = 0;
  let inString = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && (i === 0 || text[i - 1] !== '\\')) {
      inString = !inString;
    }
    if (!inString) {
      if (char === '{') {
        if (braceCount === 0) {
          startIndex = i;
        }
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          jsonObjects.push(text.slice(startIndex, i + 1));
        }
      }
    }
  }

  return jsonObjects;
}

// Function to format JSON data
function formatJson(data) {
  const result = [];
  function recurse(obj, prefix = "") {
    if (typeof obj === 'object' && !Array.isArray(obj)) {
      for (const key in obj) {
        if (typeof obj[key] === 'object') {
          result.push(`${prefix}[</>] [${key}]:`);
          recurse(obj[key], prefix);
        } else {
          result.push(`${prefix}[</>] [${key}]: ${obj[key]}`);
        }
      }
    } else if (Array.isArray(obj)) {
      obj.forEach(item => recurse(item, prefix));
    }
  }
  recurse(data);
  return result.join('\n');
}

// API Endpoint for decryption
app.put('/api/decrypt', (req, res) => {
  const encryptedData = req.body.user_encrypt_put;
  if (!encryptedData) {
    return res.status(400).json({ error: 'No encrypted data provided' });
  }

  const decryptedData = decrypt(encryptedData);
  return res.json({ decrypted_data: decryptedData });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
