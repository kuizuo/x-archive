const ALLOWED_HOSTS = new Set(["pbs.twimg.com"]);

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

const buildUpstreamUrl = (requestUrl: string) => {
	const url = new URL(requestUrl);
	const raw = url.searchParams.get("url");
	if (!raw) return null;

	let upstream: URL;
	try {
		upstream = new URL(raw);
	} catch {
		return null;
	}

	if (upstream.protocol !== "https:") return null;
	if (!ALLOWED_HOSTS.has(upstream.hostname)) return null;

	return upstream;
};

const buildUpstreamHeaders = (request: Request) => {
	const headers = new Headers();
	const passThrough = [
		"accept",
		"accept-language",
		"range",
		"if-none-match",
		"if-modified-since",
		"user-agent",
	];

	for (const name of passThrough) {
		const value = request.headers.get(name);
		if (value) headers.set(name, value);
	}

	if (!headers.has("accept")) {
		headers.set("accept", "*/*");
	}

	return headers;
};

export const onRequest: PagesFunction = async ({ request, waitUntil }) => {
	const url = new URL(request.url);

	if (url.pathname !== "/img-proxy") {
		return new Response("Not Found", { status: 404 });
	}

	if (request.method !== "GET" && request.method !== "HEAD") {
		return new Response("Method Not Allowed", {
			status: 405,
			headers: { Allow: "GET, HEAD" },
		});
	}

	const upstreamUrl = buildUpstreamUrl(request.url);
	if (!upstreamUrl) {
		return new Response("Bad Request", { status: 400 });
	}

	const cache = caches.default;
	const cacheKey = new Request(request.url, { method: "GET" });

	if (request.method === "GET") {
		const cached = await cache.match(cacheKey);
		if (cached) {
			return withCors(cached);
		}
	}

	const upstreamRequest = new Request(upstreamUrl, {
		method: request.method,
		headers: buildUpstreamHeaders(request),
		redirect: "follow",
	});

	const upstreamResponse = await fetch(upstreamRequest);
	const response = withCors(upstreamResponse);

	if (request.method === "GET" && response.ok) {
		waitUntil(cache.put(cacheKey, response.clone()));
	}

	return response;
};
