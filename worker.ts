const buildUpstreamFromPath = (requestUrl: string) => {
	const url = new URL(requestUrl);
	return new URL(`${url.protocol}//${url.host}${url.pathname}${url.search}`);
};

const buildUpstreamFromQuery = (requestUrl: string) => {
	const url = new URL(requestUrl);
	const raw = url.searchParams.get("url");
	if (!raw) {
		return null;
	}

	let upstream: URL;
	try {
		upstream = new URL(raw);
	} catch {
		return null;
	}

	// 允许任何 protocol (http/https)
	return upstream;
};

const withCors = (response: Response) => {
	const headers = new Headers(response.headers);
	headers.set("Access-Control-Allow-Origin", "*");
	headers.set("Access-Control-Allow-Methods", "GET, HEAD");
	headers.set("Timing-Allow-Origin", "*");
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
};

export default {
	async fetch(request: Request, _env: unknown, ctx: ExecutionContext) {
		if (request.method !== "GET" && request.method !== "HEAD") {
			return new Response("Method Not Allowed", {
				status: 405,
				headers: { Allow: "GET, HEAD" },
			});
		}

		const url = new URL(request.url);
		let upstreamUrl: URL | null = null;

		if (url.pathname === "/img-proxy") {
			upstreamUrl = buildUpstreamFromQuery(request.url);
			if (!upstreamUrl) {
				return new Response("Bad Request", { status: 400 });
			}
		} else if (url.pathname === "/") {
			return new Response("Not Found", { status: 404 });
		} else {
			upstreamUrl = buildUpstreamFromPath(request.url);
		}
		const cacheKey = new Request(request.url, request);
		const cache = caches.default;

		const cached = await cache.match(cacheKey);
		if (cached) {
			return withCors(cached);
		}

		const upstreamRequest = new Request(upstreamUrl, {
			method: request.method,
			headers: request.headers,
			redirect: "follow",
		});

		const upstreamResponse = await fetch(upstreamRequest);
		const response = withCors(upstreamResponse);

		if (response.ok) {
			ctx.waitUntil(cache.put(cacheKey, response.clone()));
		}

		return response;
	},
};
