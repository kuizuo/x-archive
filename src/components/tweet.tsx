import { Suspense, useRef, useState } from "react";
import {
	type TwitterComponents,
	TweetContainer,
	TweetHeader,
	TweetInReplyTo,
	TweetMedia,
	TweetInfo,
	QuotedTweet,
	enrichTweet,
	TweetNotFound,
	TweetSkeleton,
} from "react-tweet";
import type { EnrichedTweet } from "react-tweet";
import { TweetBody } from "./tweet-body";
import { TweetActions } from "./tweet-actions";
import type { Tweet as RTweet } from "react-tweet/api";
import { toPng } from "html-to-image";

const TweetContent = ({
	tweet: t,
	components,
}: {
	tweet?: RTweet;
	components?: TwitterComponents;
}) => {
	const tweetRef = useRef<HTMLDivElement>(null);
	const [isCapturing, setIsCapturing] = useState(false);
	const [isHovered, setIsHovered] = useState(false);

	if (!t) {
		return <TweetNotFound />;
	}

	const tweet = enrichTweet(t);
	// 隐藏 reply
	if (tweet.in_reply_to_status_id_str) {
		return null;
	}

	const handleCapture = async () => {
		if (!tweetRef.current || isCapturing) return;

		setIsCapturing(true);
		try {
			// 确保元素滚动到视图中
			tweetRef.current.scrollIntoView({
				behavior: "instant",
				block: "nearest",
			});

			// 等待所有图片加载完成
			const images = tweetRef.current.querySelectorAll("img");
			await Promise.all(
				Array.from(images).map(
					(img) =>
						new Promise((resolve) => {
							if (img.complete) {
								resolve(null);
							} else {
								img.onload = () => resolve(null);
								img.onerror = () => resolve(null); // 即使失败也继续
							}
						}),
				),
			);

			// 等待一帧确保所有内容都已渲染
			await new Promise((resolve) =>
				requestAnimationFrame(() => resolve(null)),
			);

			// 获取元素的完整尺寸
			const scrollHeight = tweetRef.current.scrollHeight;
			const scrollWidth = tweetRef.current.scrollWidth;

			const dataUrl = await toPng(tweetRef.current, {
				backgroundColor: undefined,
				pixelRatio: 2, // 提高图片清晰度
				quality: 1,
				width: scrollWidth,
				height: scrollHeight,
				cacheBust: true,
			});

			// 创建下载链接
			const link = document.createElement("a");
			link.download = `tweet-${tweet.id_str || Date.now()}.png`;
			link.href = dataUrl;
			link.click();
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
			{isHovered && !isCapturing && (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						handleCapture();
					}}
					disabled={isCapturing}
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
				<TweetHeader tweet={tweet} components={components} />
				{tweet.in_reply_to_status_id_str && <TweetInReplyTo tweet={tweet} />}
				<TweetBody tweet={tweet as EnrichedTweet & { full_text?: string }} />
				{tweet.mediaDetails?.length ? (
					<TweetMedia tweet={tweet} components={components} />
				) : null}
				{tweet.quoted_tweet && <QuotedTweet tweet={tweet.quoted_tweet} />}
				<TweetInfo tweet={tweet} />
				<TweetActions tweet={tweet as unknown as RTweet} />
			</TweetContainer>
		</div>
	);
};

export const Tweet = ({
	fallback = <TweetSkeleton />,
	...props
}: {
	tweet?: RTweet;
	components?: TwitterComponents;
	fallback?: React.ReactNode;
}) => (
	<Suspense fallback={fallback}>
		<TweetContent {...props} />
	</Suspense>
);

export default Tweet;
