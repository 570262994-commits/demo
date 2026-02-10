#!/usr/bin/env node

const { readFileSync } = require('fs');
const { join } = require('path');

function executeResumeSkill() {
  console.log('🔍 开始执行开发进度扫描...\n');

  try {
    // 1. 状态扫描
    console.log('📊 【状态扫描】读取 roadmap.md');
    const roadmapContent = readFileSync(join(process.cwd(), 'docs/ROADMAP.md'), 'utf-8');
    const currentPhase = extractCurrentPhase(roadmapContent);
    const completedMilestones = extractCompletedMilestones(roadmapContent);

    console.log(`📍 当前阶段: ${currentPhase}`);
    console.log(`✅ 已完成里程碑: ${completedMilestones.length} 个`);
    completedMilestones.forEach(milestone => {
      console.log(`   - ${milestone}`);
    });

    // 2. 业务对齐
    console.log('\n💼 【业务对齐】读取 PRD.md 和语义字典');
    const prdContent = readFileSync(join(process.cwd(), 'docs/PRD.md'), 'utf-8');
    const semanticDict = loadSemanticDictionary();

    const coreBusinessLogic = extractCoreBusinessLogic(prdContent);
    const formulaDefinitions = extractFormulaDefinitions(semanticDict);

    console.log('\n📋 核心业务逻辑:');
    coreBusinessLogic.forEach(logic => {
      console.log(`   • ${logic}`);
    });

    console.log('\n🔢 关键公式定义:');
    formulaDefinitions.forEach(formula => {
      console.log(`   • ${formula}`);
    });

    // 3. 规范注入
    console.log('\n⚙️ 【规范注入】重新加载 CLAUDE.md');
    const claudeMdContent = readFileSync(join(process.cwd(), 'CLAUDE.md'), 'utf-8');
    const modelConstraints = extractModelConstraints(claudeMdContent);
    const developmentStandards = extractDevelopmentStandards(claudeMdContent);

    console.log('\n🤖 模型约束:');
    modelConstraints.forEach(constraint => {
      console.log(`   • ${constraint}`);
    });

    console.log('\n📏 开发规范:');
    developmentStandards.forEach(standard => {
      console.log(`   • ${standard}`);
    });

    // 4. 进度汇报
    console.log('\n📈 【进度汇报】');
    const progressSummary = generateProgressSummary(currentPhase, completedMilestones);
    const nextTasks = generateNextTasks(completedMilestones);

    console.log('\n🎯 进度总结:');
    console.log(progressSummary);

    console.log('\n🚀 下一步任务:');
    nextTasks.forEach((task, index) => {
      console.log(`   ${index + 1}. ${task}`);
    });

    return {
      currentPhase,
      completedMilestones,
      progressSummary,
      nextTasks
    };

  } catch (error) {
    console.error('❌ 执行过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 辅助函数
function extractCurrentPhase(content) {
  const phaseMatch = content.match(/### (第四阶段|第三阶段|第二阶段|第一阶段)/);
  if (phaseMatch) {
    const phase = phaseMatch[1];
    const statusMatch = content.match(new RegExp(`${phase}.*?(DONE|COMPLETED|进行中)`));
    return `${phase} ${statusMatch ? statusMatch[1] : '未开始'}`;
  }
  return '未知阶段';
}

function extractCompletedMilestones(content) {
  const milestones = [];
  const lines = content.split('\n');

  for (const line of lines) {
    if (line.includes('✅') && (line.includes('FINAL VERIFIED') || line.includes('DONE'))) {
      const milestone = line.replace(/^\s*✅\s*/, '').trim();
      milestones.push(milestone);
    }
  }

  return milestones;
}

function loadSemanticDictionary() {
  try {
    const dictionaryPath = join(process.cwd(), 'data/semantic_dict.json');
    const dictionaryContent = readFileSync(dictionaryPath, 'utf-8');
    return JSON.parse(dictionaryContent);
  } catch (error) {
    throw new Error(`Failed to load semantic dictionary: ${error}`);
  }
}

function extractCoreBusinessLogic(content) {
  const logics = [];

  // 提取业务痛点
  const painPointsMatch = content.match(/### \d+\.\d+ 核心痛点[\s\S]*?(?=###|$)/);
  if (painPointsMatch) {
    const painPoints = painPointsMatch[0].match(/-\s*([^*\n]+)/g);
    if (painPoints) {
      painPoints.forEach(point => {
        logics.push(point.replace(/^-\s*/, '').trim());
      });
    }
  }

  // 提取产品目标
  const goalsMatch = content.match(/### \d+ 产品目标[\s\S]*?(?=###|$)/);
  if (goalsMatch) {
    const goals = goalsMatch[0].match(/-\s*([^*\n]+)/g);
    if (goals) {
      goals.forEach(goal => {
        logics.push(goal.replace(/^-\s*/, '').trim());
      });
    }
  }

  return logics;
}

function extractFormulaDefinitions(dictionary) {
  const formulas = [];

  for (const [key, indicator] of Object.entries(dictionary.indicators)) {
    if (indicator.formula) {
      formulas.push(`${key}: ${indicator.formula} (${indicator.level}级)`);
    }
  }

  return formulas;
}

function extractModelConstraints(content) {
  const constraints = [];

  // 提取 GLM 集成约束
  const glmMatch = content.match(/### \d+\.\d+ GLM 集成[\s\S]*?(?=###|$)/);
  if (glmMatch) {
    const constraintLines = glmMatch[0].match(/-\s*([^*\n]+)/g);
    if (constraintLines) {
      constraintLines.forEach(line => {
        constraints.push(line.replace(/^-\s*/, '').trim());
      });
    }
  }

  return constraints;
}

function extractDevelopmentStandards(content) {
  const standards = [];

  // 提取开发规范
  const standardsMatch = content.match(/### \d+\.\d+ 开发规范[\s\S]*?(?=###|$)/);
  if (standardsMatch) {
    const standardLines = standardsMatch[0].match(/-\s*([^*\n]+)/g);
    if (standardLines) {
      standardLines.forEach(line => {
        standards.push(line.replace(/^-\s*/, '').trim());
      });
    }
  }

  return standards;
}

function generateProgressSummary(phase, milestones) {
  const totalMilestones = 12; // 假设总共有12个里程碑
  const completionRate = ((milestones.length / totalMilestones) * 100).toFixed(1);

  return `AC-Insight 项目已完成 ${milestones.length} 个里程碑（${completionRate}%），当前处于${phase}，核心架构已闭环，正进入 UI 实现阶段。`;
}

function generateNextTasks(completedMilestones) {
  const nextTasks = [];

  // 根据已完成里程碑判断下一步任务
  if (completedMilestones.some(m => m.includes('语义字典'))) {
    nextTasks.push('完成身份模拟切换器的完整交互逻辑');
  }

  if (completedMilestones.some(m => m.includes('安全拦截器'))) {
    nextTasks.push('集成 GLM API，实现真实的 Text-to-SQL 对话');
  }

  if (completedMilestones.some(m => m.includes('三栏式 Layout'))) {
    nextTasks.push('连接后端安全拦截器，实现权限实时拦截演示');
  }

  // 默认任务
  if (nextTasks.length === 0) {
    nextTasks.push(
      '完善身份模拟切换器的交互体验',
      '集成 GLM API 实现真实对话',
      '实现权限拦截与前端的联动展示'
    );
  }

  return nextTasks;
}

// 如果直接运行此脚本
if (require.main === module) {
  executeResumeSkill();
}

module.exports = { executeResumeSkill };