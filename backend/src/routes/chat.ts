import { Elysia, t } from "elysia";
import { authPlugin } from "../middleware/auth";
import { config } from "../config";

const encoder = new TextEncoder();

type McpChatResponse = {
    resposta?: string;
    cache?: boolean;
};

function sseEvent(event: string, data: Record<string, unknown>): Uint8Array {
    return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export const chatRoutes = new Elysia({ prefix: "/chat" })
    .use(authPlugin)

    // POST /chat — proxy para o servidor MCP (Track 3)
    .post(
        "/",
        async ({ body, set }) => {
            try {
                const res = await fetch(`${config.mcp.url}/chat`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ query: body.query }),
                    signal: AbortSignal.timeout(30_000), // timeout de 30s
                });

                if (!res.ok) {
                    set.status = 502;
                    return {
                        error: "Assistente de IA indisponível no momento. Tente novamente.",
                    };
                }

                const data = await res.json();
                return data;
            } catch (err) {
                // MCP offline — retorna mensagem amigável em vez de 500
                set.status = 503;
                return {
                    error: "Assistente temporariamente indisponível",
                    details: String(err),
                };
            }
        },
        {
            body: t.Object({
                query: t.String({ minLength: 1, maxLength: 1000 }),
            }),
        },
    )

    // POST /chat/stream — proxy SSE para o servidor MCP mantendo compatibilidade com o mobile
    .post(
        "/stream",
        async ({ body }) => {
            const stream = new ReadableStream({
                async start(controller) {
                    controller.enqueue(
                        sseEvent("start", { message: "Processando pergunta" }),
                    );

                    try {
                        const res = await fetch(`${config.mcp.url}/chat`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ query: body.query }),
                            signal: AbortSignal.timeout(30_000),
                        });

                        if (!res.ok) {
                            controller.enqueue(
                                sseEvent("error", {
                                    error: "Assistente de IA indisponível no momento. Tente novamente.",
                                    status: res.status,
                                }),
                            );
                            return;
                        }

                        const data = (await res.json()) as McpChatResponse;
                        controller.enqueue(
                            sseEvent("message", {
                                content: data.resposta ?? "",
                                cache: Boolean(data.cache),
                            }),
                        );
                        controller.enqueue(
                            sseEvent("done", { cache: Boolean(data.cache) }),
                        );
                    } catch (err) {
                        controller.enqueue(
                            sseEvent("error", {
                                error: "Assistente temporariamente indisponível",
                                details: String(err),
                            }),
                        );
                    } finally {
                        controller.close();
                    }
                },
            });

            return new Response(stream, {
                headers: {
                    "Content-Type": "text/event-stream; charset=utf-8",
                    "Cache-Control": "no-cache, no-transform",
                    Connection: "keep-alive",
                    "X-Accel-Buffering": "no",
                },
            });
        },
        {
            body: t.Object({
                query: t.String({ minLength: 1, maxLength: 1000 }),
            }),
        },
    );
