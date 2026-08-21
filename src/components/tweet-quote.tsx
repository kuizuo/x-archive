import { formatNumber } from "../utils/format";
import type { WorkStoryTweetStats } from "../data/work-story-tweets";
import type { ReactNode } from "react";

const Metric = ({ label, value, children }: { label: string; value: number | null; children: ReactNode }) => (
	<span className="work-story-tweet-metric" aria-label={`${label} ${value === null ? "未归档" : value}`}>
		{children}
		<span>{value === null ? "—" : formatNumber(value)}</span>
	</span>
);

export const TweetQuote = ({ children, stats, showStats }: { children: ReactNode; stats?: WorkStoryTweetStats; showStats: boolean }) => (
	<blockquote className="work-story-tweet-quote">
		<div className="work-story-tweet-body">{children}</div>
		{showStats && (stats ? (
			<div className="work-story-tweet-stats" aria-label="推文归档数据">
				<Metric label="浏览" value={stats.views}>
					<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3v18h18v-2H5V3H3Zm5 13h2V9H8v7Zm4 0h2V5h-2v11Zm4 0h2v-4h-2v4Z" /></svg>
				</Metric>
				<Metric label="喜欢" value={stats.favoriteCount}>
					<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.35 10.55 20C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09A6 6 0 0 1 16.5 3C19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.51L12 21.35Z" /></svg>
				</Metric>
			</div>
		) : <div className="work-story-tweet-stats is-unavailable">统计未归档</div>)}
	</blockquote>
);
