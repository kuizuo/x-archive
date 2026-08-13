import { type ChangeEvent, type FC, useCallback, useEffect, useRef } from "react";

type InputRef = { current: HTMLInputElement | null };

export interface TweetSearchProps {
	query: string;
	onQueryChange: (value: string) => void;
	shortcutLabel: string;
	isMobileModalOpen: boolean;
	onOpenMobileModal: () => void;
	onCloseMobileModal: () => void;
	desktopInputRef: InputRef;
	mobileInputRef: InputRef;
}

const SearchIcon = () => (
	<svg
		className="h-4 w-4 text-gray-400"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<circle cx="11" cy="11" r="8" />
		<path d="m21 21-4.3-4.3" />
	</svg>
);

export const TweetSearch: FC<TweetSearchProps> = ({
	query,
	onQueryChange,
	shortcutLabel,
	isMobileModalOpen,
	onOpenMobileModal,
	onCloseMobileModal,
	desktopInputRef,
	mobileInputRef,
}) => {
	const mobileTriggerRef = useRef<HTMLButtonElement>(null);

	const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
		onQueryChange(event.target.value);
	};

	const clearInput = () => {
		onQueryChange("");
	};

	const closeMobileModal = useCallback(() => {
		onCloseMobileModal();
		requestAnimationFrame(() => {
			mobileTriggerRef.current?.focus();
		});
	}, [onCloseMobileModal]);

	useEffect(() => {
		if (!isMobileModalOpen) {
			return;
		}

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape" || event.isComposing) {
				return;
			}
			event.preventDefault();
			closeMobileModal();
		};

		window.addEventListener("keydown", onKeyDown);
		requestAnimationFrame(() => {
			mobileInputRef.current?.focus();
			mobileInputRef.current?.select();
		});

		return () => {
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [closeMobileModal, isMobileModalOpen, mobileInputRef]);

	return (
		<>
			<div className="sticky top-0 z-30 hidden md:block pb-4">
				<div className="rounded-2xl border border-gray-800/70 bg-black/70 p-2 backdrop-blur-xl shadow-lg">
					<div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2">
						<SearchIcon />
						<input
							ref={desktopInputRef}
							value={query}
							onChange={handleChange}
							placeholder="搜索推文内容..."
							aria-label="搜索推文"
							className="h-7 flex-1 border-none bg-transparent text-sm text-white outline-none placeholder:text-gray-500"
						/>
						{query.trim() && (
							<button
								type="button"
								onClick={clearInput}
								className="rounded-full px-2 py-1 text-xs text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
							>
								清空
							</button>
						)}
						<kbd className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs text-gray-400">
							{shortcutLabel}
						</kbd>
					</div>
				</div>
			</div>

			<div className="sticky top-0 z-30 pb-4 md:hidden">
				<div className="rounded-2xl border border-gray-800/70 bg-black/75 p-2 shadow-lg backdrop-blur-xl">
					<div className="flex items-center gap-2">
						<button
							ref={mobileTriggerRef}
							type="button"
							onClick={onOpenMobileModal}
							aria-label="打开搜索"
							className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-left text-sm text-white transition-colors hover:bg-white/5"
						>
							<SearchIcon />
							<span
								className={`min-w-0 flex-1 truncate ${
									query.trim() ? "text-white" : "text-gray-500"
								}`}
							>
								{query.trim() || "搜索推文内容..."}
							</span>
						</button>
						{query.trim() && (
							<button
								type="button"
								onClick={clearInput}
								className="shrink-0 rounded-xl px-3 py-2 text-xs text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
							>
								清空
							</button>
						)}
					</div>
				</div>
			</div>

			{isMobileModalOpen && (
				<div
					className="fixed inset-0 z-50 flex items-end bg-black/65 p-4 backdrop-blur-sm md:hidden"
					role="dialog"
					aria-modal="true"
					aria-label="移动端搜索弹窗"
					onClick={closeMobileModal}
				>
					<div
						className="w-full rounded-2xl border border-white/15 bg-[#090b0f] p-4 shadow-2xl"
						onClick={(event) => event.stopPropagation()}
						onKeyDown={(event) => event.stopPropagation()}
					>
						<div className="mb-3 flex items-center justify-between">
							<h2 className="text-sm font-semibold text-white">搜索推文</h2>
							<button
								type="button"
								onClick={closeMobileModal}
								className="rounded-full p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
								aria-label="关闭搜索弹窗"
							>
								<svg
									className="h-5 w-5"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									aria-hidden="true"
								>
									<path d="M18 6 6 18" />
									<path d="m6 6 12 12" />
								</svg>
							</button>
						</div>
						<div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#11151c] px-3 py-2">
							<SearchIcon />
							<input
								ref={mobileInputRef}
								value={query}
								onChange={handleChange}
								placeholder="输入关键词..."
								aria-label="搜索推文"
								className="h-8 flex-1 border-none bg-transparent text-sm text-white outline-none placeholder:text-gray-500"
							/>
							{query.trim() && (
								<button
									type="button"
									onClick={clearInput}
									className="rounded-full px-2 py-1 text-xs text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
								>
									清空
								</button>
							)}
						</div>
					</div>
				</div>
			)}
		</>
	);
};
