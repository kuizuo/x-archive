import { Suspense, useRef, useState } from "react";
import {
	type TwitterComponents,
	TweetContainer,
	TweetHeader,
	TweetMedia,
	TweetInfo,
	enrichTweet,
	TweetNotFound,
	TweetSkeleton,
	TweetInReplyTo,
	QuotedTweet,
} from "react-tweet";
import type { EnrichedTweet } from "react-tweet";
import { TweetBody } from "./tweet-body";
import { TweetActions } from "./tweet-actions";
import type { Tweet as RTweet } from "react-tweet/api";
import { toPng } from "html-to-image";
import { IMG_PROXY_URL, ENABLE_IMAGE_PROXY } from "../consts";

// 自定义 MediaImg：img.x.kuizuo.me 的 URL 被 react-tweet 的 getMediaUrl 去掉扩展名并加了 ?format=xxx&name=xxx，
// 代理可能无法解析，需要还原为带扩展名的完整路径
const MediaImg = (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
	const src = props.src;
	let resolvedSrc = src;
	if (typeof src === "string" && src.includes("img.x.kuizuo.me")) {
		try {
			const url = new URL(src);
			const format = url.searchParams.get("format");
			if (format && !url.pathname.endsWith(`.${format}`)) {
				resolvedSrc = `${url.origin}${url.pathname}.${format}`;
			}
		} catch {
			// 解析失败则使用原 src
		}
	}
	return <img {...props} src={resolvedSrc} />;
};

const waitForImages = async (root: HTMLElement) => {
	const images = Array.from(root.querySelectorAll("img"));
	images.forEach((img) => {
		if (!img.crossOrigin) {
			img.crossOrigin = "anonymous";
		}
		img.decoding = "sync";
	});

	await Promise.all(
		images.map(
			(img) =>
				new Promise<void>((resolve) => {
					if (img.complete) {
						resolve();
						return;
					}
					const onDone = () => resolve();
					img.onload = onDone;
					img.onerror = onDone;
				}),
		),
	);

	if ("decode" in HTMLImageElement.prototype) {
		await Promise.all(
			images.map(async (img) => {
				try {
					await img.decode();
				} catch {
					// Ignore decode failures and continue capturing.
				}
			}),
		);
	}
};

const safeScrollIntoView = (node: HTMLElement) => {
	try {
		node.scrollIntoView({ behavior: "auto", block: "nearest" });
	} catch {
		node.scrollIntoView();
	}
};

const downloadDataUrl = (dataUrl: string, filename: string) => {
	const link = document.createElement("a");
	link.download = filename;
	link.href = dataUrl;
	link.rel = "noopener";
	document.body.appendChild(link);
	link.click();
	link.remove();
};

const captureFilter = (node: HTMLElement) => {
	if (node instanceof Element) {
		if (node.getAttribute("data-capture-ignore") === "true") {
			return false;
		}
		if (
			node instanceof HTMLVideoElement ||
			node instanceof HTMLIFrameElement ||
			node instanceof HTMLSourceElement
		) {
			return false;
		}
	}
	return true;
};

const defaultComponents: TwitterComponents = {
	MediaImg,
};

const TweetContent = ({
	tweet: t,
	components,
	showReplies = false,
}: {
	tweet?: RTweet;
	components?: TwitterComponents;
	showReplies?: boolean;
}) => {
	const mergedComponents = { ...defaultComponents, ...components };
	const tweetRef = useRef<HTMLDivElement>(null);
	const [isCapturing, setIsCapturing] = useState(false);
	const [isHovered, setIsHovered] = useState(false);

	if (!t) {
		return <TweetNotFound />;
	}

	const tweet = enrichTweet(t);
	// 隐藏 reply
	if (tweet.in_reply_to_status_id_str && !showReplies) {
		return null;
	}

	if(ENABLE_IMAGE_PROXY){
		if(tweet.user){
			tweet.user = {
				...tweet.user,
				profile_image_url_https: `${IMG_PROXY_URL}${tweet.user.profile_image_url_https}`,
			}
		}
	
		if (tweet.quoted_tweet) {
			tweet.quoted_tweet = {
				...tweet.quoted_tweet,
				user :{
					...tweet.quoted_tweet.user,
					profile_image_url_https: `${IMG_PROXY_URL}${tweet.quoted_tweet.user.profile_image_url_https}`,
				}
			};
		}
	}
	

	const handleCapture = async () => {
		if (!tweetRef.current || isCapturing) return;

		setIsCapturing(true);
		try {
			// 确保元素滚动到视图中
			safeScrollIntoView(tweetRef.current);

			// 等待所有图片加载完成
			await waitForImages(tweetRef.current);

			if (document.fonts?.ready) {
				await document.fonts.ready;
			}

			// 等待一帧确保所有内容都已渲染
			await new Promise((resolve) =>
				requestAnimationFrame(() => resolve(null)),
			);

			const filename = `tweet-${tweet.id_str || Date.now()}.png`;
			const dataUrl = await toPng(tweetRef.current, {
				backgroundColor: undefined,
				pixelRatio: 2,
				cacheBust: true,
				filter: captureFilter,
			});

			downloadDataUrl(dataUrl, filename);
		} catch (error) {
			console.error("截图失败:", error);
		} finally {
			setIsCapturing(false);
		}
	};

	return (
		<div
			ref={tweetRef}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			className="relative -mt-6"
		>
			{isHovered && !isCapturing && ENABLE_IMAGE_PROXY && (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						handleCapture();
					}}
					disabled={isCapturing}
					data-capture-ignore="true"
					style={{
						position: "absolute",
						bottom: "8px",
						right: "12px",
						zIndex: 1000,
						color: "white",
						border: "1px solid rgba(255, 255, 255, 0.2)",
						borderRadius: "8px",
						padding: "6px 6px",
						fontSize: "14px",
						cursor: isCapturing ? "wait" : "pointer",
						display: "flex",
						alignItems: "center",
						transition: "all 0.2s",
						opacity: isCapturing ? 0 : 1,
					}}
					title={isCapturing ? "正在生成图片..." : "截图"}
					onMouseEnter={(e) => {
						if (!isCapturing) {
							e.currentTarget.style.background = "rgba(0, 0, 0, 0.9)";
						}
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.background = "rgba(0, 0, 0, 0.8)";
					}}
				>
					{!isCapturing && (
						<>
							<svg
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								role="img"
								aria-label="截图图标"
							>
								<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
								<circle cx="9" cy="9" r="2" />
								<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
							</svg>
						</>
					)}
				</button>
			)}
			<TweetContainer>
				<TweetHeader tweet={tweet} components={mergedComponents} />
				{tweet.in_reply_to_status_id_str && <TweetInReplyTo tweet={tweet} />}
				<TweetBody tweet={tweet as EnrichedTweet & { full_text?: string }} />
				{tweet.mediaDetails?.length ? (
					<TweetMedia tweet={tweet} components={mergedComponents} />
				) : null}
				{tweet.quoted_tweet && (
					<QuotedTweet tweet={tweet.quoted_tweet} components={mergedComponents} />
				)}
				<TweetInfo tweet={tweet} />
				<TweetActions tweet={tweet as unknown as RTweet} />
			</TweetContainer>
		</div>
	);
};

export const Tweet = ({
	fallback = <TweetSkeleton />,
	showReplies = false,
	...props
}: {
	tweet?: RTweet;
	components?: TwitterComponents;
	fallback?: React.ReactNode;
	showReplies?: boolean;
}) => (
	<Suspense fallback={fallback}>
		<TweetContent {...props} showReplies={showReplies} />
	</Suspense>
);

export default Tweet;
