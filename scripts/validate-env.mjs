import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const envPath = path.join(root, '.env');
const envExamplePath = path.join(root, '.env.example');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const raw = fs.readFileSync(filePath, 'utf8');

  return raw
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trim().startsWith('#'))
    .reduce((acc, line) => {
      const index = line.indexOf('=');

      if (index === -1) {
        return acc;
      }

      const key = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim();

      acc[key] = value;
      return acc;
    }, {});
}

const requiredVars = [
  'API_PREFIX',
  'NODE_ENV'
];

const optionalOneOf = ['FRONTEND_URL', 'FRONTEND_URLS'];

const envValues = {
  ...parseEnvFile(envExamplePath),
  ...parseEnvFile(envPath),
  ...process.env
};

const missingRequired = requiredVars.filter((key) => {
  const value = envValues[key];
  return value === undefined || String(value).trim() === '';
});

const hasFrontendOrigin =
  optionalOneOf.some((key) => {
    const value = envValues[key];
    return value !== undefined && String(value).trim() !== '';
  });

console.log('========================================');
console.log(' SmartOps Backend Environment Validation');
console.log('========================================');
console.log(`Root: ${root}`);
console.log('');

for (const key of requiredVars) {
  const ok = !missingRequired.includes(key);
  console.log(`${ok ? 'OK   ' : 'MISS '} ${key}`);
}

console.log(`${hasFrontendOrigin ? 'OK   ' : 'MISS '} FRONTEND_URL or FRONTEND_URLS`);
console.log('');

if (missingRequired.length > 0 || !hasFrontendOrigin) {
  console.error('Backend environment validation failed.');

  if (missingRequired.length > 0) {
    console.error('Missing required variables:');
    for (const key of missingRequired) {
      console.error(` - ${key}`);
    }
  }

  if (!hasFrontendOrigin) {
    console.error('At least one of these must be set: FRONTEND_URL or FRONTEND_URLS');
  }

  process.exit(1);
}

console.log('Backend environment validation passed.');