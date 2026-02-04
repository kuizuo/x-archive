/**
 * 提取所有 page_XXX.json 文件中的 entries
 * 并整理成一个新的 JSON 文件
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== 配置 ====================
const CONFIG = {
  INPUT_DIR: path.join(__dirname, '../public'),
  OUTPUT_FILE: path.join(__dirname, '../public/entries.json'),
  PROFILE_FILE: path.join(__dirname, '../public/profile.json'),
};

// ==================== 工具函数 ====================

/**
 * 检查文件是否存在
 */
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * 从单个文件中提取 entries
 */
function extractEntriesFromFile(filePath) {
  try {
    if (!fileExists(filePath)) {
      console.warn(`⚠️  文件不存在: ${filePath}`);
      return [];
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    const instructions =
      data?.data?.user?.result?.timeline?.timeline?.instructions || [];
    const allEntries = [];

    for (const instruction of instructions) {
      if (
        instruction.type === 'TimelineAddEntries' &&
        Array.isArray(instruction.entries)
      ) {
        // 过滤掉 cursor 类型的 entry
        const validEntries = instruction.entries.filter((entry) => {
          const entryType = entry.content?.entryType;
          return entryType !== 'TimelineTimelineCursor';
        });
        allEntries.push(...validEntries);
      }
    }

    return allEntries;
  } catch (error) {
    console.error(`❌ 处理文件失败 ${filePath}:`, error.message);
    return [];
  }
}

/**
 * 获取所有页面文件
 */
function getPageFiles(inputDir) {
  if (!fileExists(inputDir)) {
    console.warn(`⚠️  目录不存在: ${inputDir}`);
    return [];
  }

  const files = fs
    .readdirSync(inputDir)
    .filter(
      (file) => file.startsWith('page_') && file.endsWith('.json')
    )
    .sort(); // 按文件名排序

  return files;
}

/**
 * 保存提取结果
 */
function saveEntries(entries, outputPath) {
  const output = {
    total: entries.length,
    entries: entries,
    extractedAt: new Date().toISOString(),
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
}

/**
 * 从 entries 中提取用户信息
 */
function extractProfileFromEntries(entries) {
  let foundUser = null;

  const walk = (item) => {
    if (!item || foundUser) return;

    const itemContent = item?.content?.itemContent || item?.item?.itemContent;
    if (itemContent?.itemType === 'TimelineTweet') {
      const user =
        itemContent?.tweet_results?.result?.core?.user_results?.result;
      if (user) {
        foundUser = user;
        return;
      }
    }

    const items = item?.content?.items;
    if (Array.isArray(items)) {
      for (const moduleItem of items) {
        walk(moduleItem);
        if (foundUser) return;
      }
    }
  };

  for (const entry of entries) {
    walk(entry);
    if (foundUser) break;
  }

  if (!foundUser) return null;

  const screenName = foundUser?.core?.screen_name || '';
  const name = foundUser?.core?.name || '';
  const avatar = foundUser?.avatar?.image_url || '';
  const bio = foundUser?.legacy?.description || foundUser?.profile_bio?.description || '';
  const verified =
    Boolean(foundUser?.is_blue_verified) || Boolean(foundUser?.verification?.verified);

  return {
    screenName,
    name,
    avatar,
    bio,
    verified,
    followScreenName: screenName,
    archiveScreenName: screenName,
    generatedAt: new Date().toISOString(),
  };
}

function saveProfile(profile, outputPath) {
  fs.writeFileSync(outputPath, JSON.stringify(profile, null, 2), 'utf-8');
}

// ==================== 主函数 ====================

/**
 * 提取所有 entries
 */
export async function extractEntries() {
  console.log('📦 开始提取 entries...\n');

  const startTime = Date.now();

  try {
    // 获取所有页面文件
    const files = getPageFiles(CONFIG.INPUT_DIR);

    if (files.length === 0) {
      console.warn('⚠️  未找到任何页面文件');
      return {
        success: false,
        message: '未找到页面文件',
        entries: 0,
      };
    }

    console.log(`找到 ${files.length} 个页面文件\n`);

    const allEntries = [];
    let processedCount = 0;
    let errorCount = 0;

    // 处理每个文件
    for (const file of files) {
      const filePath = path.join(CONFIG.INPUT_DIR, file);
      console.log(`处理 ${file}...`);

      const entries = extractEntriesFromFile(filePath);

      if (entries.length > 0) {
        allEntries.push(...entries);
        processedCount++;
        console.log(`  ✓ 提取了 ${entries.length} 个 entries`);
      } else {
        errorCount++;
        console.log(`  ⚠️  未提取到有效 entries`);
      }
    }

    // 保存结果
    if (allEntries.length > 0) {
      saveEntries(allEntries, CONFIG.OUTPUT_FILE);
    }

    // 提取并保存 profile
    if (allEntries.length > 0) {
      const profile = extractProfileFromEntries(allEntries);
      if (profile) {
        saveProfile(profile, CONFIG.PROFILE_FILE);
        console.log(`   已生成 ${path.basename(CONFIG.PROFILE_FILE)}`);
      } else {
        console.log('   ⚠️  未能提取到用户信息');
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n✅ 提取完成！');
    console.log(`   处理了 ${processedCount} 个文件`);
    if (errorCount > 0) {
      console.log(`   ${errorCount} 个文件处理失败或为空`);
    }
    console.log(`   共提取 ${allEntries.length} 个 entries`);
    console.log(`   已保存到 ${path.basename(CONFIG.OUTPUT_FILE)}`);
    console.log(`   耗时 ${duration} 秒`);

    return {
      success: true,
      processedFiles: processedCount,
      errorFiles: errorCount,
      entries: allEntries.length,
      duration: Number.parseFloat(duration),
    };
  } catch (error) {
    console.error('\n❌ 提取失败:', error.message);
    throw error;
  }
}

// 如果直接运行此文件，执行提取
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('extract-entries.js')) {
  extractEntries().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}




