/**
 * 统一执行入口
 * 先执行 crawl.js 爬取数据，再执行 extract-entries.js 提取 entries
 * 
 * 使用方法: node script/index.js
 */

import { crawl } from './crawl.js';
import { extractEntries } from './extract-entries.js';

/**
 * 主函数
 */
async function main() {
  const totalStartTime = Date.now();

  console.log('='.repeat(60));
  console.log('🚀 X/Twitter 数据归档工具');
  console.log('='.repeat(60));
  console.log();

  try {
    // 第一步：爬取数据
    console.log('📥 步骤 1/2: 爬取推文数据');
    console.log('-'.repeat(60));
    const crawlResult = await crawl();

    if (!crawlResult.success) {
      throw new Error('爬取数据失败');
    }

    console.log();
    console.log('-'.repeat(60));
    console.log();

    // 第二步：提取 entries
    console.log('📤 步骤 2/2: 提取 entries');
    console.log('-'.repeat(60));
    const extractResult = await extractEntries();

    if (!extractResult.success) {
      throw new Error('提取 entries 失败');
    }

    // 总结
    const totalDuration = ((Date.now() - totalStartTime) / 1000).toFixed(2);

    console.log();
    console.log('='.repeat(60));
    console.log('🎉 全部完成！');
    console.log('='.repeat(60));
    console.log(`📊 统计信息:`);
    console.log(`   - 爬取页面: ${crawlResult.pages} 页`);
    console.log(`   - 推文数量: 约 ${crawlResult.tweets} 条`);
    console.log(`   - 提取 entries: ${extractResult.entries} 个`);
    console.log(`   - 总耗时: ${totalDuration} 秒`);
    console.log('='.repeat(60));
  } catch (error) {
    console.error();
    console.error('='.repeat(60));
    console.error('❌ 执行失败');
    console.error('='.repeat(60));
    console.error('错误信息:', error.message);
    console.error('='.repeat(60));
    process.exit(1);
  }
}

// 执行主函数
main();

