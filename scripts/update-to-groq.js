const fs = require('fs');
const path = require('path');

const files = [
  'app/api/chat/messages/route.ts',
  'app/api/ai/enhance/route.ts'
];

const replacements = [
  {
    from: /const GEMINI_API_KEY = process\.env\.GEMINI_API_KEY;/g,
    to: 'const GROQ_API_KEY = process.env.GROQ_API_KEY;'
  },
  {
    from: /const GEMINI_MODEL = process\.env\.GEMINI_MODEL \|\| ['"]gemini-[^'"]+['"];/g,
    to: "const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';"
  },
  {
    from: /GEMINI_API_KEY/g,
    to: 'GROQ_API_KEY'
  },
  {
    from: /GEMINI_MODEL/g,
    to: 'GROQ_MODEL'
  },
  {
    from: /`https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/\$\{GROQ_MODEL\}:generateContent\?key=\$\{GROQ_API_KEY\}`/g,
    to: '`https://api.groq.com/openai/v1/chat/completions`'
  },
  {
    from: /headers: \{ ['"]Content-Type['"]: ['"]application\/json['"] \},\s*body: JSON\.stringify\(\{\s*contents: \[\{ parts: \[\{ text: ([^}]+) \}\] \}\],?\s*generationConfig: \{ temperature: ([\d.]+), maxOutputTokens: (\d+) \}\s*\}\)/gs,
    to: `headers: { 'Authorization': \`Bearer \${GROQ_API_KEY}\`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: 'user', content: $1 }],
          temperature: $2,
          max_tokens: $3
        })`
  },
  {
    from: /data\.candidates\?\.\[0\]\?\.content\?\.parts\?\.\[0\]\?\.text/g,
    to: 'data.choices?.[0]?.message?.content'
  },
  {
    from: /Gemini API/g,
    to: 'Groq API'
  }
];

console.log('🔄 Updating files to use Groq API...\n');

files.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  replacements.forEach(({ from, to }) => {
    if (content.match(from)) {
      content = content.replace(from, to);
      changed = true;
    }
  });
  
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated: ${file}`);
  } else {
    console.log(`⏭️  Skipped: ${file} (no changes needed)`);
  }
});

console.log('\n✅ All files updated to Groq API!');
