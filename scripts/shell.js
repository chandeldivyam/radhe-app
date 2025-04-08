// scripts/shell.js
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Function to read and parse .env file
function parseEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env');
  const content = fs.readFileSync(envPath, 'utf8');
  
  const envVars = {};
  content.split('\n').forEach(line => {
    // Skip comments and empty lines
    if (!line || line.startsWith('#')) return;
    
    const [key, value] = line.split('=');
    if (key && value) {
      envVars[key.trim()] = value.trim();
    }
  });
  
  return envVars;
}

const container = process.argv[2];
if (!container) {
  console.error('Please specify a container name. Usage: pnpm shell <container>');
  process.exit(1);
}

const validContainers = ['backend', 'frontend', 'db', 'zero_cache'];
if (!validContainers.includes(container)) {
  console.error(`Invalid container name. Valid options are: ${validContainers.join(', ')}`);
  process.exit(1);
}

// Read environment variables from .env file
const envVars = parseEnvFile();

let args = ['-f', 'docker-compose.dev.yml', 'exec'];

// For the database container, use psql with credentials from .env
if (container === 'db') {
  args = [...args, 'db', 'psql', 
    '-U', envVars.POSTGRES_USER, 
    '-d', envVars.POSTGRES_DB
  ];
} else {
  args = [...args, container, 'sh'];
}

const subprocess = spawn('docker-compose', args, { stdio: 'inherit' });

subprocess.on('error', (err) => {
  console.error(`Failed to start shell in ${container}: ${err.message}`);
});