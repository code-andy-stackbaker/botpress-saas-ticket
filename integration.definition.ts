import { IntegrationDefinition, z } from "@botpress/sdk";

export default new IntegrationDefinition({
	name: "support-tickets",
	version: "0.1.1",
	title: "Support Tickets (Beeceptor)",
	description: "Creates support tickets via a Beeceptor mock endpoint.",

	configuration: {
		schema: z.object({
			// Default points to your Beeceptor base; runtime will append /tickets if missing
			SUPPORT_API_URL: z
				.string()
				.url()
				.default("https://saas-ticket.free.beeceptor.com")
				.describe(
					"Beeceptor base or full URL. Example base: https://saas-ticket.free.beeceptor.com (the integration will call /tickets)."
				),
			SUPPORT_API_TOKEN: z
				.string()
				.optional()
				.describe("Optional token if you add an auth rule on Beeceptor"),
			AUTH_HEADER_NAME: z
				.string()
				.default("Authorization")
				.describe("Header name for auth, defaults to Authorization"),
			TIMEOUT_MS: z
				.number()
				.int()
				.positive()
				.default(10000)
				.describe("Network timeout in milliseconds (default 10000)"),
		}),
	},

	actions: {
		createSupportTicket: {
			title: "Create Support Ticket",
			description: "Creates a ticket and returns a ticketId.",
			input: {
				schema: z.object({
					userName: z.string().min(1).describe("End user name"),
					userEmail: z.string().email().describe("End user email"),
					problemDescription: z
						.string()
						.min(5)
						.describe("Brief description (1–3 sentences)"),
				}),
			},
			output: {
				schema: z.object({
					ticketId: z
						.string()
						.describe("Ticket identifier (from API or generated fallback)"),
				}),
			},
		},
	},

	channels: {},
	events: {},
});
