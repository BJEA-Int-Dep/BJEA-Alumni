import { spawn } from 'node:child_process';

const devApiPort = process.env.DEV_API_PORT || '8787';
const devEnv = { ...process.env, API_PORT: devApiPort, NODE_ENV: 'development' };

const children = [
  spawn(
    process.execPath,
    ['node_modules/tsx/dist/cli.mjs', 'watch', 'backend/index.ts'],
    { stdio: 'inherit', env: devEnv },
  ),
  spawn(
    process.execPath,
    [
      'node_modules/vite/bin/vite.js',
      '--host',
      '0.0.0.0',
      '--port',
      '5173',
      '--strictPort',
      ...process.argv.slice(2),
    ],
    { stdio: 'inherit', env: devEnv },
  ),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
}
for (const child of children) {
  child.on('error', () => stop(1));
  child.on('exit', (code) => stop(code || 0));
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
