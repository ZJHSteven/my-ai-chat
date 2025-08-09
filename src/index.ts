/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

interface Env {
        BASE_URL: string;
        OPENAI_API_KEY: string;
}

export default {
        async fetch(request, env): Promise<Response> {
                const url = new URL(request.url);

                if (request.method === 'POST' && url.pathname === '/api/chat') {
                        try {
                                const { messages, model } = await request.json();
                                if (!messages || !model) {
                                        return new Response('Missing messages or model', { status: 400 });
                                }

                                const upstream = `${env.BASE_URL.replace(/\/$/, '')}/chat/completions`;
                                const apiResp = await fetch(upstream, {
                                        method: 'POST',
                                        headers: {
                                                'content-type': 'application/json',
                                                authorization: `Bearer ${env.OPENAI_API_KEY}`,
                                        },
                                        body: JSON.stringify({ model, messages, stream: true }),
                                });

                                return new Response(apiResp.body, {
                                        status: apiResp.status,
                                        headers: {
                                                'content-type': apiResp.headers.get('content-type') || 'text/event-stream',
                                        },
                                });
                        } catch (err) {
                                return new Response('Invalid JSON', { status: 400 });
                        }
                }

                if (request.method === 'GET' && url.pathname === '/') {
                        return new Response(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>AI Chat Test</title></head>
<body>
        <h1>AI Chat Test</h1>
        <textarea id="messages" rows="10" cols="50">[{"role":"user","content":"Hello"}]</textarea><br/>
        <input id="model" value="gpt-3.5-turbo"/><br/>
        <button id="send">Send</button>
        <pre id="response"></pre>
        <script>
        document.getElementById('send').addEventListener('click', async () => {
                const msgs = JSON.parse(document.getElementById('messages').value);
                const model = document.getElementById('model').value;
                const res = await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ messages: msgs, model })
                });
                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let done = false;
                let text = '';
                while (!done) {
                        const { value, done: doneReading } = await reader.read();
                        done = doneReading;
                        text += decoder.decode(value || new Uint8Array(), { stream: !done });
                        document.getElementById('response').textContent = text;
                }
        });
        </script>
</body>
</html>`, {
                                headers: { 'content-type': 'text/html; charset=utf-8' },
                        });
                }

                return new Response('Not found', { status: 404 });
        },
} satisfies ExportedHandler<Env>;
