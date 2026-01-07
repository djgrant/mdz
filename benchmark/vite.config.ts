import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import { readdirSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Dynamically import the run module
async function getRunBenchmark() {
  const mod = await import('./scripts/run.ts');
  return mod.runBenchmark;
}

function findCases(dir: string, prefix = ''): { path: string; tests: string[] }[] {
  const cases: { path: string; tests: string[] }[] = [];
  if (!existsSync(dir)) return cases;
  
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const fullPath = join(dir, entry.name);
      const testsDir = join(fullPath, 'tests');
      
      if (existsSync(testsDir)) {
        const tests = readdirSync(testsDir, { withFileTypes: true })
          .filter(t => t.isDirectory())
          .map(t => t.name);
        
        cases.push({
          path: prefix ? `${prefix}/${entry.name}` : entry.name,
          tests,
        });
      } else {
        cases.push(...findCases(fullPath, prefix ? `${prefix}/${entry.name}` : entry.name));
      }
    }
  }
  return cases;
}

export default defineConfig({
  plugins: [
    solid(),
    {
      name: 'api-routes',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url === '/api/cases' && req.method === 'GET') {
            const casesDir = join(__dirname, 'cases');
            const cases = findCases(casesDir, 'cases');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ cases }));
            return;
          }
          
          if (req.url === '/api/run' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
              try {
                const { casePath, testName } = JSON.parse(body);
                
                if (!casePath || !testName) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Missing casePath or testName' }));
                  return;
                }
                
                const runBenchmark = await getRunBenchmark();
                const result = await runBenchmark(casePath, testName);
                
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(result));
              } catch (error) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ 
                  error: error instanceof Error ? error.message : String(error) 
                }));
              }
            });
            return;
          }
          
          next();
        });
      },
    },
  ],
  server: {
    port: 4321,
  },
});
