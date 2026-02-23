import type { Tweet as RTweet } from "react-tweet/api";

type SearchableTweet = RTweet & {
	full_text?: string;
	text?: string;
};

export function filterTweetsByKeyword(tweets: RTweet[], keyword: string): RTweet[] {
	const normalizedKeyword = keyword.trim().toLowerCase();
	if (!normalizedKeyword) {
		return [];
	}

	return tweets.filter((tweet) => {
		const searchableTweet = tweet as SearchableTweet;
		const content = (searchableTweet.full_text ?? searchableTweet.text ?? "").toLowerCase();
		return content.includes(normalizedKeyword);
	});
}
