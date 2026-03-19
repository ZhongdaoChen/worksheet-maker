'use strict';

const fs = require('fs');
const path = require('path');

// ── 配置 ───────────────────────────────────────────────────────────────────────

const API_KEY = process.env.ALIYUN_API_KEY || 'sk-396001e3a1714f9294b849f010e551f9'; // 请替换为你的 API Key
// 阿里云百炼 z-image-turbo 使用兼容 OpenAI 格式的 API
const API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

// 输出目录
const OUTPUT_DIR = path.join(__dirname, 'sentence-images');

// 请求参数
const MODEL = 'z-image-turbo';
const SIZE = '512*512'; // 512x512 正方形，节省费用
const PROMPT_EXTEND = false; // 关闭智能改写以节省费用

// 风格前缀 - 确保卡通可爱风格
const STYLE_PREFIX = '卡通可爱风格，色彩鲜艳，儿童插画风格，简洁明快，';

// ── 导入句子 ───────────────────────────────────────────────────────────────────

// 读取 sentences.js 并提取 PHONICS_SENTENCES
const sentencesContent = fs.readFileSync(path.join(__dirname, 'sentences.js'), 'utf8');

// 简单的解析：提取 PHONICS_SENTENCES 数组
function parseSentences(content) {
  const match = content.match(/const PHONICS_SENTENCES = (\[[\s\S]*?\]);/);
  if (!match) {
    throw new Error('无法解析 PHONICS_SENTENCES');
  }

  // 使用 Function 构造函数安全地评估数组（仅包含简单对象）
  const arrStr = match[1];
  const sentences = [];

  // 逐行解析每个句子对象（支持单引号和双引号）
  const lines = arrStr.split('\n');
  let currentEntry = null;

  for (const line of lines) {
    // 匹配 { level: X, full: '...', cloze: '...' } 支持单/双引号
    const objMatch = line.match(/\{\s*level:\s*(\d+),\s*full:\s*['"]([^'"]+)['"],\s*cloze:\s*['"]([^'"]+)['"]\s*\}/);
    if (objMatch) {
      sentences.push({
        level: parseInt(objMatch[1]),
        full: objMatch[2],
        cloze: objMatch[3]
      });
    }
  }

  return sentences;
}

const sentences = parseSentences(sentencesContent);
console.log(`📖 加载了 ${sentences.length} 个句子`);

// ── 为句子生成图片提示词 ───────────────────────────────────────────────────────

function generatePrompt(sentence) {
  // 从句子中提取关键元素，生成适合图片生成的提示词
  const fullSentence = sentence.full;

  // 基础提示词模板
  let prompt = `${STYLE_PREFIX}插画内容：${fullSentence}`;

  // 添加通用风格描述
  prompt += '，适合儿童的教育插画，柔和的背景，清晰的主体，高清质量';

  return prompt;
}

// ── 调用 API ───────────────────────────────────────────────────────────────────

async function callAPI(prompt, sentenceIndex) {
  // 阿里云百炼 z-image-turbo 请求格式
  const requestBody = {
    model: 'z-image-turbo',
    input: {
      messages: [
        {
          role: 'user',
          content: [
            {
              text: prompt
            }
          ]
        }
      ]
    },
    parameters: {
      size: SIZE,
      seed: 1000 + sentenceIndex
    }
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    const rawText = await response.text();
    // console.log(`   API 状态：${response.status}, 响应：${rawText.substring(0, 300)}`);

    if (!response.ok) {
      throw new Error(`API 请求失败：${response.status}`);
    }

    const result = JSON.parse(rawText);
    return result;

  } catch (error) {
    throw error;
  }
}

// ── 下载并保存图片 ─────────────────────────────────────────────────────────────

async function downloadImage(url, filePath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`下载图片失败：${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(filePath, buffer);
}

// ── 主流程 ─────────────────────────────────────────────────────────────────────

async function main() {
  // 创建输出目录
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`📁 创建输出目录：${OUTPUT_DIR}`);
  }

  // 创建按级别分类的子目录
  for (let level = 1; level <= 5; level++) {
    const levelDir = path.join(OUTPUT_DIR, `level-${level}`);
    if (!fs.existsSync(levelDir)) {
      fs.mkdirSync(levelDir, { recursive: true });
    }
  }

  // 统计
  let successCount = 0;
  let failCount = 0;
  const results = [];

  // 限制：如果句子数量太多，可以先测试前几个
  const totalToGenerate = sentences.length;
  console.log(`🎨 准备生成 ${totalToGenerate} 张图片...\n`);

  // 追踪每个级别的索引
  const levelCounters = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  // 逐个生成（避免并发过高）
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const level = sentence.level;

    // 该级别内的索引（从 1 开始）
    levelCounters[level]++;
    const levelIndex = levelCounters[level];

    const prompt = generatePrompt(sentence);
    const safeFilename = `L${level}_${String(levelIndex).padStart(3, '0')}.png`;
    const filePath = path.join(OUTPUT_DIR, `level-${level}`, safeFilename);

    // 如果文件已存在，跳过
    if (fs.existsSync(filePath)) {
      console.log(`⏭️  Level ${level} #${levelIndex}: 已存在，跳过：${sentence.full}`);
      results.push({ level, levelIndex, sentence, status: 'skipped', filePath });
      continue;
    }

    console.log(`📝 Level ${level} #${levelIndex}: ${sentence.full}`);
    console.log(`   提示词：${prompt}`);

    try {
      // 调用 API
      const result = await callAPI(prompt, levelIndex);

      // 解析结果 - 阿里云百炼 z-image-turbo 格式
      // {"output": {"choices": [{"message": {"content": [{"image": "url"}]}}]}}
      const imageUrl = result.output?.choices?.[0]?.message?.content?.[0]?.image;

      if (imageUrl) {
        // 下载图片
        await downloadImage(imageUrl, filePath);

        console.log(`✅ 成功保存：${filePath}`);
        results.push({ level, levelIndex, sentence, status: 'success', filePath, imageUrl });
        successCount++;
      } else {
        console.log(`⚠️ API 返回：${JSON.stringify(result)}`);
        throw new Error('API 返回格式异常');
      }

    } catch (error) {
      console.log(`❌ 失败：${error.message}`);
      results.push({ level, levelIndex, sentence, status: 'failed', error: error.message });
      failCount++;

      // 如果是认证错误，直接退出
      if (error.message.includes('401') || error.message.includes('API_KEY')) {
        console.log('\n⚠️  API Key 认证失败，请检查配置后重试');
        break;
      }
    }

    // 添加短暂延迟，避免请求过快
    if (i < sentences.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // 输出统计
  console.log('\n' + '='.repeat(50));
  console.log('📊 生成统计:');
  console.log(`   成功：${successCount}`);
  console.log(`   失败：${failCount}`);
  console.log(`   跳过：${results.filter(r => r.status === 'skipped').length}`);
  console.log(`   总计：${results.length}`);
  console.log('='.repeat(50));

  // 保存结果记录
  const resultFile = path.join(OUTPUT_DIR, 'results.json');
  fs.writeFileSync(resultFile, JSON.stringify(results, null, 2));
  console.log(`📄 结果已保存到：${resultFile}`);
}

// ── 运行 ───────────────────────────────────────────────────────────────────────

main().catch(console.error);
