import { useEffect, useMemo, useState, type ReactNode } from "react";
import { workStoryTweetStats } from "../data/work-story-tweets";
import { TweetQuote } from "./tweet-quote";
import "./work-story-page.css";

type Block =
	| { type: "heading"; level: number; text: string }
	| { type: "paragraph"; lines: string[] }
	| { type: "quote"; lines: string[]; tweetId?: string }
	| { type: "list"; ordered: boolean; items: string[] }
	| { type: "image"; alt: string; src: string }
	| { type: "rule" };

const parseInline = (text: string): ReactNode[] => {
	const pattern = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
	return text.split(pattern).filter(Boolean).map((part, index) => {
		const bold = part.match(/^\*\*(.+)\*\*$/);
		if (bold) return <strong key={index}>{bold[1]}</strong>;

		const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
		if (link) {
			return (
				<a key={index} href={link[2]} target="_blank" rel="noreferrer">
					{link[1]}
				</a>
			);
		}

		return part;
	});
};

const parseMarkdown = (markdown: string): Block[] => {
	const blocks: Block[] = [];
	const lines = markdown.replaceAll("\r\n", "\n").split("\n");
	let tweetId: string | undefined;

	for (let index = 0; index < lines.length; ) {
		const line = lines[index];
		if (!line.trim()) {
			index += 1;
			continue;
		}

		const tweetMarker = line.match(/^<!-- tweet:(\d+) -->$/);
		if (tweetMarker) {
			tweetId = tweetMarker[1];
			index += 1;
			continue;
		}

		const heading = line.match(/^(#{1,6})\s+(.+)$/);
		if (heading) {
			blocks.push({ type: "heading", level: heading[1].length, text: heading[2] });
			index += 1;
			continue;
		}

		if (/^---+$/.test(line.trim())) {
			blocks.push({ type: "rule" });
			index += 1;
			continue;
		}

		const image = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
		if (image) {
			blocks.push({ type: "image", alt: image[1], src: image[2] });
			index += 1;
			continue;
		}

		if (line.startsWith(">")) {
			const quote: string[] = [];
			while (index < lines.length && lines[index].startsWith(">")) {
				quote.push(lines[index].replace(/^> ?/, ""));
				index += 1;
			}
			blocks.push({ type: "quote", lines: quote, tweetId });
			tweetId = undefined;
			continue;
		}

		const listItem = line.match(/^(?:(\d+)\.|-)\s+(.+)$/);
		if (listItem) {
			const ordered = Boolean(listItem[1]);
			const items: string[] = [];
			while (index < lines.length) {
				const item = lines[index].match(/^(?:(\d+)\.|-)\s+(.+)$/);
				if (!item || Boolean(item[1]) !== ordered) break;
				items.push(item[2]);
				index += 1;
			}
			blocks.push({ type: "list", ordered, items });
			continue;
		}

		const paragraph: string[] = [];
		while (index < lines.length && lines[index].trim()) {
			if (/^(#{1,6})\s|^---+$|^>/.test(lines[index])) break;
			if (/^!\[[^\]]*\]\([^)]+\)$/.test(lines[index])) break;
			if (/^(?:(\d+)\.|-)\s+/.test(lines[index])) break;
			paragraph.push(lines[index]);
			index += 1;
		}
		blocks.push({ type: "paragraph", lines: paragraph });
	}

	return blocks;
};

const headingId = (text: string) => text.replaceAll(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");

const MarkdownArticle = ({ blocks, showStats }: { blocks: Block[]; showStats: boolean }) => (
	<article className="work-story-article">
		{blocks.map((block, index) => {
			if (block.type === "heading") {
				const Tag = `h${block.level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
				return <Tag id={headingId(block.text)} key={index}>{parseInline(block.text)}</Tag>;
			}
			if (block.type === "paragraph") return <p key={index}>{parseInline(block.lines.join("\n"))}</p>;
			if (block.type === "quote") {
				const content = block.lines.map((line, lineIndex) => line ? <p key={lineIndex}>{parseInline(line)}</p> : <br key={lineIndex} />);
				if (block.tweetId) return <TweetQuote key={index} stats={workStoryTweetStats[block.tweetId]} showStats={showStats}>{content}</TweetQuote>;
				return <blockquote className={block.lines[0] === "**图片缺失**" ? "is-missing-media" : undefined} key={index}>{content}</blockquote>;
			}
			if (block.type === "image") return <figure key={index}><img src={`/archive/${block.src}`} alt={block.alt} loading="lazy" /></figure>;
			if (block.type === "list") {
				const Tag = block.ordered ? "ol" : "ul";
				return <Tag key={index}>{block.items.map((item) => <li key={item}>{parseInline(item)}</li>)}</Tag>;
			}
			return <hr key={index} />;
		})}
	</article>
);

type TocItem = { id: string; text: string };

const TableOfContents = ({
	items,
	activeId,
	onNavigate,
	showStats,
	onToggleStats,
}: {
	items: TocItem[];
	activeId: string;
	onNavigate?: (id: string) => void;
	showStats: boolean;
	onToggleStats: () => void;
}) => (
	<nav className="work-story-toc" aria-label="文章目录">
		<p className="work-story-toc-title">目录</p>
		<ol>
			{items.map((item, index) => (
				<li key={item.id}>
					<a
						href={`#${item.id}`}
						className={activeId === item.id ? "is-active" : ""}
						onClick={(event) => {
							if (!onNavigate) return;
							event.preventDefault();
							onNavigate(item.id);
						}}
						aria-current={activeId === item.id ? "location" : undefined}
					>
						<span>{String(index + 1).padStart(2, "0")}</span>
						{item.text}
					</a>
				</li>
			))}
		</ol>
		<button
			type="button"
			className="work-story-stats-toggle"
			role="switch"
			aria-checked={showStats}
			onClick={onToggleStats}
		>
			<span>显示推文数据</span>
			<i aria-hidden="true" />
		</button>
	</nav>
);

export const WorkStoryPage = () => {
	const [markdown, setMarkdown] = useState("");
	const [error, setError] = useState(false);
	const [activeId, setActiveId] = useState(() => decodeURIComponent(window.location.hash.slice(1)));
	const [isTocOpen, setIsTocOpen] = useState(false);
	const [showStats, setShowStats] = useState(false);
	const blocks = useMemo(() => parseMarkdown(markdown), [markdown]);
	const tocItems = useMemo(
		() => blocks
			.filter((block): block is Extract<Block, { type: "heading" }> => block.type === "heading" && block.level === 2)
			.map((block) => ({ id: headingId(block.text), text: block.text })),
		[blocks],
	);

	useEffect(() => {
		document.title = "愧怍的职场故事 · X Archive";
		fetch("/archive/work-story.md")
			.then((response) => {
				if (!response.ok) throw new Error("Failed to load work story");
				return response.text();
			})
			.then(setMarkdown)
			.catch(() => setError(true));
	}, []);

	useEffect(() => {
		if (!tocItems.length) return;
		const hashId = decodeURIComponent(window.location.hash.slice(1));
		if (hashId) requestAnimationFrame(() => document.getElementById(hashId)?.scrollIntoView({ block: "start" }));
		let frame = 0;
		const syncActiveHeading = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => {
				const headings = tocItems
					.map((item) => document.getElementById(item.id))
					.filter((heading): heading is HTMLElement => Boolean(heading));
				const current = [...headings].reverse().find((heading) => heading.getBoundingClientRect().top <= 120) ?? headings[0];
				if (current) setActiveId(current.id);
			});
		};
		syncActiveHeading();
		window.addEventListener("scroll", syncActiveHeading, { passive: true });
		return () => {
			cancelAnimationFrame(frame);
			window.removeEventListener("scroll", syncActiveHeading);
		};
	}, [tocItems]);

	useEffect(() => {
		if (!isTocOpen) return;
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setIsTocOpen(false);
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [isTocOpen]);

	const navigateToSection = (id: string, closeDrawer = false) => {
		setActiveId(id);
		if (closeDrawer) {
			setIsTocOpen(false);
		}
		window.history.pushState(null, "", `#${encodeURIComponent(id)}`);
		requestAnimationFrame(() => {
			requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
		});
	};

	return (
		<div className="work-story-page">
			<header className="work-story-nav">
				<div className="work-story-nav-inner">
					<a href="/" className="work-story-back" aria-label="返回推文归档">
						<span aria-hidden="true">←</span> X Archive
					</a>
					<span className="work-story-nav-label">特别归档</span>
					<button
						type="button"
						className="work-story-toc-trigger"
						onClick={() => setIsTocOpen(true)}
						aria-label="打开文章目录"
						aria-expanded={isTocOpen}
					>
						<span /><span /><span />
					</button>
				</div>
			</header>
			<div className="work-story-hero">
				<div className="work-story-intro">
					<p>2024 · 5 月—9 月</p>
					<h1>小愧的职场吐槽实录</h1>
					<span>55 条推文 · 5 个月 · 职场远比你想象的还离奇</span>
				</div>
			</div>
			<main className="work-story-shell">
				{error ? (
					<div className="work-story-state">归档暂时无法读取，请稍后刷新。</div>
				) : markdown ? (
					<>
						<MarkdownArticle blocks={blocks} showStats={showStats} />
						<aside className="work-story-toc-column">
							<TableOfContents items={tocItems} activeId={activeId} onNavigate={navigateToSection} showStats={showStats} onToggleStats={() => setShowStats((value) => !value)} />
						</aside>
					</>
				) : (
					<div className="work-story-state">正在打开归档…</div>
				)}
			</main>
			{isTocOpen && (
				<div className="work-story-toc-overlay" role="presentation" onMouseDown={() => setIsTocOpen(false)}>
					<aside
						className="work-story-toc-drawer"
						role="dialog"
						aria-modal="true"
						aria-label="文章目录"
						onMouseDown={(event) => event.stopPropagation()}
					>
						<div className="work-story-toc-drawer-head">
							<span>浏览章节</span>
							<button type="button" onClick={() => setIsTocOpen(false)} aria-label="关闭文章目录">×</button>
						</div>
						<TableOfContents
							items={tocItems}
							activeId={activeId}
							onNavigate={(id) => navigateToSection(id, true)}
							showStats={showStats}
							onToggleStats={() => setShowStats((value) => !value)}
						/>
					</aside>
				</div>
			)}
			<footer className="work-story-footer"><a href="/">继续浏览推文归档 →</a></footer>
		</div>
	);
};
