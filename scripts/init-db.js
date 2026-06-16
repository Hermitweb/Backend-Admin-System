const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

const dbPath = './database.sqlite';
const db = new sqlite3.Database(dbPath);

async function initDB() {
  console.log('开始初始化数据库...\n');

  // 1. 创建超级管理员用户
  await new Promise((resolve, reject) => {
    const userId = uuidv4();
    const email = 'admin@example.com';
    const hashedPassword = bcrypt.hashSync('123456', 10);
    const now = new Date().toISOString();

    db.run(
      'INSERT OR REPLACE INTO users (id, email, password, name, avatar, status, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, email, hashedPassword, '超级管理员', null, 'active', 'super_admin', now],
      (err) => {
        if (err) {
          console.error('❌ 创建用户失败:', err);
          reject(err);
        } else {
          console.log('✅ 用户 admin@example.com 已创建');
          resolve();
        }
      }
    );
  });

  // 2. 创建测试项目
  let projectId = null;
  await new Promise((resolve, reject) => {
    projectId = uuidv4();
    const now = new Date().toISOString();

    db.run(
      'INSERT OR REPLACE INTO projects (id, slug, name, description, status, isolation, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        projectId,
        'personal',
        '个人项目',
        '个人数据管理项目',
        'active',
        'strict',
        now,
        now
      ],
      (err) => {
        if (err) {
          console.error('❌ 创建项目失败:', err);
          reject(err);
        } else {
          console.log('✅ 项目 personal 已创建');
          resolve();
        }
      }
    );
  });

  // 3. 创建Schema
  const schemas = [
    {
      name: 'articles',
      display_name: '文章',
      definition: JSON.stringify({
        fields: [
          { name: 'title', type: 'string', label: '标题', required: true },
          { name: 'content', type: 'text', label: '内容', required: true },
          { name: 'status', type: 'string', label: '状态', default: 'published' },
          { name: 'category', type: 'string', label: '分类' },
          { name: 'views', type: 'integer', label: '浏览量', default: 0 }
        ]
      })
    },
    {
      name: 'skills',
      display_name: '技能',
      definition: JSON.stringify({
        fields: [
          { name: 'name', type: 'string', label: '技能名称', required: true },
          { name: 'level', type: 'string', label: '熟练度' },
          { name: 'category', type: 'string', label: '分类' },
          { name: 'years', type: 'integer', label: '年限' }
        ]
      })
    },
    {
      name: 'contacts',
      display_name: '联系人',
      definition: JSON.stringify({
        fields: [
          { name: 'name', type: 'string', label: '姓名', required: true },
          { name: 'email', type: 'string', label: '邮箱' },
          { name: 'phone', type: 'string', label: '电话' },
          { name: 'company', type: 'string', label: '公司' },
          { name: 'notes', type: 'text', label: '备注' }
        ]
      })
    }
  ];

  const createdSchemas = [];
  for (const schema of schemas) {
    await new Promise((resolve, reject) => {
      const schemaId = uuidv4();
      const now = new Date().toISOString();

      db.run(
        'INSERT OR REPLACE INTO resource_schemas (id, project_id, project_slug, name, display_name, definition, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [schemaId, projectId, 'personal', schema.name, schema.display_name, schema.definition, now, now],
        (err) => {
          if (err) {
            console.error(`❌ 创建Schema ${schema.name} 失败:`, err);
            reject(err);
          } else {
            console.log(`✅ Schema ${schema.name} 已创建`);
            createdSchemas.push({ ...schema, id: schemaId });
            resolve();
          }
        }
      );
    });
  }

  // 4. 创建表和测试数据 - 文章
  console.log('\n创建文章表和数据...');
  await new Promise((resolve, reject) => {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS project_personal_articles (
        id TEXT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        "title" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "status" TEXT DEFAULT 'published',
        "category" TEXT,
        "views" INTEGER DEFAULT 0
      )
    `;
    db.run(createTableSQL, (err) => {
      if (err) {
        console.error('❌ 创建文章表失败:', err);
        reject(err);
      } else {
        resolve();
      }
    });
  });

  const articles = [
    { title: 'JavaScript入门指南', content: '这是一篇关于JavaScript基础的入门文章，涵盖变量、函数、作用域等核心概念。', status: 'published', category: '前端', views: 1250 },
    { title: 'React Hooks详解', content: '深入探讨React Hooks的使用方法，包括useState、useEffect、useContext等常用Hook。', status: 'published', category: '前端', views: 890 },
    { title: 'TypeScript高级技巧', content: '介绍TypeScript的高级特性，包括泛型、类型体操、装饰器等。', status: 'published', category: '前端', views: 678 },
  ];

  for (const article of articles) {
    await new Promise((resolve, reject) => {
      const articleId = uuidv4();
      const now = new Date().toISOString();

      db.run(
        'INSERT INTO project_personal_articles (id, created_at, updated_at, title, content, status, category, views) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [articleId, now, now, article.title, article.content, article.status, article.category, article.views],
        (err) => {
          if (err) {
            console.log(`⚠️ 插入文章失败: ${article.title}`, err.message);
          } else {
            console.log(`✅ 文章 "${article.title}" 已创建`);
          }
          resolve();
        }
      );
    });
  }

  // 5. 创建表和测试数据 - 技能
  console.log('\n创建技能表和数据...');
  await new Promise((resolve, reject) => {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS project_personal_skills (
        id TEXT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        "name" TEXT NOT NULL,
        "level" TEXT,
        "category" TEXT,
        "years" INTEGER
      )
    `;
    db.run(createTableSQL, (err) => {
      if (err) {
        console.error('❌ 创建技能表失败:', err);
        reject(err);
      } else {
        resolve();
      }
    });
  });

  const skills = [
    { name: 'JavaScript', level: '专家', category: '前端', years: 8 },
    { name: 'TypeScript', level: '高级', category: '前端', years: 5 },
    { name: 'React', level: '专家', category: '前端', years: 6 },
    { name: 'Node.js', level: '高级', category: '后端', years: 5 },
  ];

  for (const skill of skills) {
    await new Promise((resolve, reject) => {
      const skillId = uuidv4();
      const now = new Date().toISOString();

      db.run(
        'INSERT INTO project_personal_skills (id, created_at, updated_at, name, level, category, years) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [skillId, now, now, skill.name, skill.level, skill.category, skill.years],
        (err) => {
          if (err) {
            console.log(`⚠️ 插入技能失败: ${skill.name}`, err.message);
          } else {
            console.log(`✅ 技能 "${skill.name}" 已创建`);
          }
          resolve();
        }
      );
    });
  }

  // 6. 创建表和测试数据 - 联系人
  console.log('\n创建联系人表...');
  await new Promise((resolve, reject) => {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS project_personal_contacts (
        id TEXT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        "name" TEXT NOT NULL,
        "email" TEXT,
        "phone" TEXT,
        "company" TEXT,
        "notes" TEXT
      )
    `;
    db.run(createTableSQL, (err) => {
      if (err) {
        console.error('❌ 创建联系人表失败:', err);
        reject(err);
      } else {
        resolve();
      }
    });
  });

  console.log('\n🎉 数据库初始化完成！');
  console.log('登录信息:');
  console.log('  邮箱: admin@example.com');
  console.log('  密码: 123456');
  console.log('\n可用数据:');
  console.log('  - 项目: 个人项目 (personal)');
  console.log('  - Schema: 文章、技能、联系人');
  console.log('  - 测试数据: 3篇文章、4项技能');
  db.close();
}

initDB().catch(console.error);
