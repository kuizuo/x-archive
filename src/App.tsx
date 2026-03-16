import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { Tweet } from "./components/tweet";
import { Sidebar } from "./components/sidebar";
import { TweetSearch } from "./components/tweet-search";
import { getAllTweets, getTweets, getTweetsCount, initDB } from "./utils/db";
import { filterTweetsByKeyword } from "./utils/search";

import type { Tweet as RTweet } from "react-tweet/api";

const PAGE_SIZE = 20;

const isApplePlatform = () => {
	const platform = navigator.platform?.toLowerCase() ?? "";
	const userAgent = navigator.userAgent?.toLowerCase() ?? "";

	return (
		platform.includes("mac") ||
		platform.includes("iphone") ||
		platform.includes("ipad") ||
		userAgent.includes("mac")
	);
};

const isMobileViewport = () => window.matchMedia("(max-width: 767px)").matches;

const getTweetKey = (tweet: RTweet, index: number) =>
	tweet.id_str || (tweet as { id?: string }).id || `tweet-${index}`;

const getTweetIdFromPath = (pathname: string): string | null => {
	const matched = pathname.match(/^\/t\/([^/]+)\/?$/);
	return matched?.[1] ?? null;
};

export default function App() {
	const [tweets, setTweets] = useState<RTweet[]>([]);
	const [allTweets, setAllTweets] = useState<RTweet[]>([]);
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(true);
	const [isLoading, setIsLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
	const [singleTweetId, setSingleTweetId] = useState<string | null>(() =>
		getTweetIdFromPath(window.location.pathname),
	);

	const desktopSearchInputRef = useRef<HTMLInputElement>(null);
	const mobileSearchInputRef = useRef<HTMLInputElement>(null);

	const shortcutLabel = useMemo(
		() => (isApplePlatform() ? "Cmd K" : "Ctrl K"),
		[],
	);
	const normalizedSearchQuery = searchQuery.trim();
	const isSearching = normalizedSearchQuery.length > 0;
	const isSingleTweetMode = Boolean(singleTweetId);
	const searchResults = useMemo(
		() => filterTweetsByKeyword(allTweets, searchQuery),
		[allTweets, searchQuery],
	);
	const visibleSearchResults = useMemo(
		() =>
			searchResults.filter(
				(tweet) => !tweet.in_reply_to_status_id_str,
			),
		[searchResults],
	);
	const singleTweet = useMemo(() => {
		if (!singleTweetId) {
			return null;
		}

		return (
			allTweets.find(
				(tweet) =>
					tweet.id_str === singleTweetId ||
					(tweet as { id?: string }).id === singleTweetId,
			) ?? null
		);
	}, [allTweets, singleTweetId]);

	const fetchNextPage = useCallback(async () => {
		try {
			const newTweets = getTweets(page, PAGE_SIZE);

			if (newTweets.length === 0) {
				setHasMore(false);
			} else {
				setTweets((prev) => [...prev, ...newTweets]);
				setPage((prev) => prev + 1);

				// 检查是否还有更多数据
				const totalCount = getTweetsCount();
				const loadedCount = (page - 1) * PAGE_SIZE + newTweets.length;
				if (loadedCount >= totalCount) {
					setHasMore(false);
				}
			}
		} catch (error) {
			console.error("Error fetching page:", error);
			setHasMore(false);
		}
	}, [page]);

	// 初始加载
	useEffect(() => {
		const loadData = async () => {
			try {
				setIsLoading(true);
				setHasMore(true);
				await initDB();
				const tweetsFromDB = getAllTweets();
				setAllTweets(tweetsFromDB);

				// 加载第一页
				const initialTweets = getTweets(1, PAGE_SIZE);
				setTweets(initialTweets);
				setPage(2);

				// 检查是否还有更多数据
				const totalCount = getTweetsCount();
				if (initialTweets.length >= totalCount) {
					setHasMore(false);
				}
			} catch (error) {
				console.error("Error loading data:", error);
				setHasMore(false);
			} finally {
				setIsLoading(false);
			}
		};

		loadData();
	}, []);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (isSingleTweetMode) {
				return;
			}

			const isSearchShortcut =
				(event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
			if (!isSearchShortcut) {
				return;
			}

			event.preventDefault();

			if (isMobileViewport()) {
				setIsMobileSearchOpen(true);
				requestAnimationFrame(() => {
					mobileSearchInputRef.current?.focus();
					mobileSearchInputRef.current?.select();
				});
				return;
			}

			desktopSearchInputRef.current?.focus();
			desktopSearchInputRef.current?.select();
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isSingleTweetMode]);

	useEffect(() => {
		const syncPathToState = () => {
			setSingleTweetId(getTweetIdFromPath(window.location.pathname));
		};

		window.addEventListener("popstate", syncPathToState);
		return () => window.removeEventListener("popstate", syncPathToState);
	}, []);

	return (
		<div
			data-theme="dark"
			className="min-h-screen bg-black relative overflow-hidden flex justify-center"
		>
			{/* 背景渐变 */}
			<div className="fixed inset-0 bg-linear-to-br from-gray-900 via-black to-gray-900 opacity-50" />

			{/* 网格 */}
			<div
				className="fixed inset-0 opacity-10"
				style={{
					backgroundImage:
						"linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
					backgroundSize: "50px 50px",
				}}
			/>

			{/* 光晕 */}
			<div className="fixed top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
			<div className="fixed bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

			{/* 主内容 */}
			<main className="relative z-10 max-w-[550px] w-full px-4 pt-8 md:pt-12">
				{!isSingleTweetMode && (
					<TweetSearch
						query={searchQuery}
						onQueryChange={setSearchQuery}
						shortcutLabel={shortcutLabel}
						isMobileModalOpen={isMobileSearchOpen}
						onOpenMobileModal={() => setIsMobileSearchOpen(true)}
						onCloseMobileModal={() => setIsMobileSearchOpen(false)}
						desktopInputRef={desktopSearchInputRef}
						mobileInputRef={mobileSearchInputRef}
					/>
				)}
				{!isSingleTweetMode && <Sidebar />}
				{isLoading ? (
					<div className="flex justify-center p-8">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
					</div>
				) : isSingleTweetMode ? (
					<section className="flex flex-col items-center">
						{singleTweet ? (
							<div className="w-full">
								<Tweet tweet={singleTweet} showReplies />
							</div>
						) : (
							<div className="w-full rounded-2xl border border-dashed border-white/15 bg-[#10141c]/70 p-8 text-center text-gray-400">
								未找到 ID 为 {singleTweetId} 的推文。
							</div>
						)}
					</section>
				) : isSearching ? (
					<section>
						<p className="mb-4 rounded-xl border border-white/10 bg-[#11151d]/80 px-4 py-3 text-left text-sm text-gray-300">
							关键词
							<span className="mx-1 font-semibold text-white">
								“{normalizedSearchQuery}”
							</span>
							匹配到
							<span className="mx-1 font-semibold text-blue-400">
								{visibleSearchResults.length}
							</span>
							条推文
						</p>
						{visibleSearchResults.length === 0 ? (
							<div className="rounded-2xl border border-dashed border-white/15 bg-[#10141c]/70 p-8 text-center text-gray-400">
								未找到匹配推文，换个关键词试试。
							</div>
						) : (
							<div className="flex flex-col items-center">
								{visibleSearchResults.map((tweet, index) => (
									<div key={getTweetKey(tweet, index)} className="w-full">
										<Tweet tweet={tweet} />
									</div>
								))}
							</div>
						)}
					</section>
				) : (
					<InfiniteScroll
						dataLength={tweets.length}
						next={fetchNextPage}
						hasMore={hasMore}
						loader={
							<div className="flex justify-center p-4">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
							</div>
						}
						endMessage={
							<p className="text-center text-gray-500 py-8 font-medium">
								没有更多内容了
							</p>
						}
						style={{ overflow: "visible" }}
					>
						<div className="flex flex-col items-center">
							{tweets.map((tweet, index) => (
								<div key={getTweetKey(tweet, index)} className="w-full">
									<Tweet tweet={tweet} />
								</div>
							))}
						</div>
					</InfiniteScroll>
				)}
			</main>
		</div>
	);
}
