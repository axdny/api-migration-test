/**
 * Serves the Cucumber reports folder over HTTP and opens the HTML report in the browser.
 *
 *   npm run report                 # http://localhost:5000
 *   npm run report -- --no-open    # do not launch a browser
 *   npm run report -- --port 8080  # custom port (or REPORT_PORT=8080)
 *   npm run test:report            # run the suite first, then serve the fresh report
 *
 * Zero dependencies: only Node's built-in modules.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, createReadStream, statSync } from 'node:fs';
import http from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(import.meta.url), '../../reports');
const entry = 'report.html';

const args = process.argv.slice(2);
const portFlag = args.indexOf('--port');
const port = Number(portFlag >= 0 ? args[portFlag + 1] : (process.env.REPORT_PORT ?? 5000));
const shouldOpen = !args.includes('--no-open');

// --run-tests: execute the suite first. A failing suite still produces a report, so the exit
// code is ignored here (shell: true keeps `npm` resolvable on Windows too).
if (args.includes('--run-tests')) {
  spawnSync('npm', ['test'], { stdio: 'inherit', shell: true });
}

if (!existsSync(join(root, entry))) {
  console.error(`No report found at reports/${entry}.\nRun the tests first:  npm test`);
  process.exit(1);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  const relative = pathname === '/' ? entry : pathname.slice(1);
  const file = normalize(join(root, relative));

  // Never serve anything outside the reports folder.
  if (file !== root && !file.startsWith(root + sep)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  if (!existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404).end('Not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Try:  npm run report -- --port ${port + 1}`);
  } else {
    console.error(error.message);
  }
  process.exit(1);
});

server.listen(port, () => {
  const url = `http://localhost:${port}`;
  console.log(`Serving reports/ at ${url}  (Ctrl+C to stop)`);
  console.log(`  HTML report  ${url}/${entry}`);
  console.log(`  JUnit XML    ${url}/junit-results.xml`);
  console.log(`  JSON         ${url}/cucumber-report.json`);
  if (shouldOpen) openBrowser(url);
});

function openBrowser(url) {
  const [command, commandArgs] =
    process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '', url]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]];
  // Opening the browser is a convenience: ignore failures (headless machines, CI).
  const child = spawn(command, commandArgs, { stdio: 'ignore', detached: true });
  child.on('error', () => {});
  child.unref();
}
