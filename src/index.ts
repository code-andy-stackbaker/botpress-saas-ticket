import * as bp from ".botpress";
import { z } from "zod";

/** Accept common Beeceptor response shapes. */
const ResSimple = z.object({ ticketId: z.string() });
const ResId = z.object({ id: z.string() });
const ResNested = z.object({
	data: z.object({
		ticketId: z.string().optional(),
		id: z.string().optional(),
	}),
});
const ResAny = z.union([ResSimple, ResId, ResNested]);

type Cfg = {
	SUPPORT_API_URL: string;
	SUPPORT_API_TOKEN?: string;
	AUTH_HEADER_NAME?: string;
	TIMEOUT_MS?: number;
};

type Ctx = { configuration: Cfg };
type Input = {
	userName: string;
	userEmail: string;
	problemDescription: string;
};
type Logger = {
	forBot(): {
		info(msg: string): void;
		error(msg: string): void;
		warn?(msg: string): void;
	};
};

async function runtimeError(message: string) {
	const { RuntimeError } = await import("@botpress/sdk");
	return new RuntimeError(message);
}

function ensureTicketsPath(urlStr: string): string {
	try {
		const u = new URL(urlStr);
		const path = u.pathname || "/";
		if (path === "/" || path === "") {
			u.pathname = "/tickets";
		} else if (!/\/tickets\/?$/.test(path)) {
			u.pathname = path.replace(/\/+$/, "") + "/tickets";
		}
		return u.toString();
	} catch {
		return urlStr.endsWith("/tickets")
			? urlStr
			: `${urlStr.replace(/\/+$/, "")}/tickets`;
	}
}

async function fetchWithTimeout(
	input: string | URL,
	init: RequestInit,
	timeoutMs: number
) {
	const controller = new AbortController();
	const t = setTimeout(() => controller.abort(), Math.max(1, timeoutMs));
	try {
		return await fetch(input, { ...init, signal: controller.signal });
	} finally {
		clearTimeout(t);
	}
}

export default new bp.Integration({
	register: async ({ logger }: { logger: Logger }) => {
		logger.forBot().info("[support-tickets] register() called");
	},
	unregister: async ({ logger }: { logger: Logger }) => {
		logger.forBot().info("[support-tickets] unregister() called");
	},

	actions: {
		async createSupportTicket({
			ctx,
			input,
			logger,
		}: {
			ctx: Ctx;
			input: Input;
			logger: Logger;
		}): Promise<{ ticketId: string }> {
			const cfg = ctx.configuration;
			if (!cfg.SUPPORT_API_URL) {
				throw await runtimeError("Missing SUPPORT_API_URL");
			}

			const finalUrl = ensureTicketsPath(cfg.SUPPORT_API_URL);
			const headers: Record<string, string> = {
				"Content-Type": "application/json",
			};
			const authHeaderName = (cfg.AUTH_HEADER_NAME || "Authorization").trim();
			if (cfg.SUPPORT_API_TOKEN) {
				headers[authHeaderName] = `Bearer ${cfg.SUPPORT_API_TOKEN}`;
			}

			const payload = {
				name: input.userName,
				email: input.userEmail,
				problem: input.problemDescription,
			};

			logger.forBot().info(`[support-tickets] POST ${finalUrl}`);

			let json: unknown = undefined;
			try {
				const res = await fetchWithTimeout(
					finalUrl,
					{ method: "POST", headers, body: JSON.stringify(payload) },
					cfg.TIMEOUT_MS ?? 10000
				);

				if (!res.ok) {
					logger
						.forBot()
						.error(`[support-tickets] HTTP ${res.status} from Beeceptor`);
					throw await runtimeError(`Support API returned HTTP ${res.status}`);
				}

				const text = await res.text();
				json = text ? JSON.parse(text) : {};
			} catch (e: any) {
				logger
					.forBot()
					.error(`[support-tickets] Network/parse error: ${String(e)}`);
				const fallbackId = `TICKET-${Math.random()
					.toString(36)
					.slice(2, 10)
					.toUpperCase()}`;
				return { ticketId: fallbackId };
			}

			const parsed = ResAny.safeParse(json);
			let ticketId: string | undefined;
			if (parsed.success) {
				if ("ticketId" in parsed.data) ticketId = (parsed.data as any).ticketId;
				else if ("id" in parsed.data) ticketId = (parsed.data as any).id;
				else if ("data" in parsed.data) {
					const d = (parsed.data as any).data;
					ticketId = d.ticketId ?? d.id;
				}
			}

			if (!ticketId) {
				logger
					.forBot()
					.warn?.(
						"[support-tickets] No ticketId in response; generating fallback"
					);
				ticketId = `TICKET-${Math.random()
					.toString(36)
					.slice(2, 10)
					.toUpperCase()}`;
			}

			logger.forBot().info(`[support-tickets] Created ticket ${ticketId}`);
			return { ticketId };
		},
	},

	channels: {},
	handler: async () => {
		/* no-op */
	},
});
