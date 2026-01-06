import type { APIRoute } from 'astro';
import { runBenchmark } from '../../../scripts/run';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { casePath, testName } = await request.json();
    
    if (!casePath || !testName) {
      return new Response(
        JSON.stringify({ error: 'Missing casePath or testName' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await runBenchmark(casePath, testName);

    return new Response(
      JSON.stringify(result),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : String(error) 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
