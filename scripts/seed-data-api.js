
const http = require('http');
const { v4: uuidv4 } = require('uuid');

const API_BASE = 'localhost';
const API_PORT = 3000;

function request(method, path, data = null, authToken = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_BASE,
      port: API_PORT,
      path: `/api/v1${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ data: json, status: res.statusCode });
        } catch (e) {
          resolve({ data: body, status: res.statusCode });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function seedData() {
  console.log('开始通过API初始化测试数据...\n');

  try {
    // 1. 首先尝试登录
    let authToken = null;
    let userId = null;

    try {
      const loginRes = await request('POST', '/auth/login', {
        email: 'admin@example.com',
        password: '123456'
      });
      
      if (loginRes.data.success) {
        authToken = loginRes.data.data.access_token;
        userId = loginRes.data.data.user.id;
        console.log('✅ 使用现有账户登录成功');
      }
    } catch (loginErr) {
      console.log('⚠️ 现有账户不存在，尝试注册...');
      
      // 注册新账户
      try {
        const registerRes = await request('POST', '/auth/register', {
          email: 'admin@example.com',
          password: '123456',
          name: '超级管理员'
        });
        
        if (registerRes.data.success) {
          authToken = registerRes.data.data.access_token;
          userId = registerRes.data.data.user.id;
          console.log('✅ 账户注册成功');
        }
      } catch (regErr) {
        console.error('❌ 注册失败:', regErr.message);
        return;
      }
    }

    if (!authToken) {
      console.error('❌ 无法获取认证令牌');
      return;
    }

    // 2. 检查是否已有项目
    let projectId = null;
    let projectSlug = 'personal';

    try {
      const projectsRes = await request('GET', '/_system/projects', null, authToken);
      const projects = projectsRes.data.data || [];
      
      const personalProject = projects.find(p => p.slug === projectSlug);
      if (personalProject) {
        projectId = personalProject.id;
        console.log(`✅ 使用现有项目: ${personalProject.name}`);
      }
    } catch (err) {
      console.log('⚠️ 获取项目列表失败');
    }

    // 3. 如果没有项目，创建新的
    if (!projectId) {
      try {
        const createProjRes = await request('POST', '/_system/projects', {
          name: '个人项目',
          slug: projectSlug,
          description: '个人数据管理项目',
          status: 'active',
          isolation: 'strict'
        }, authToken);
        
        if (createProjRes.data.success) {
          projectId = createProjRes.data.data.id;
          console.log('✅ 项目创建成功');
        }
      } catch (err) {
        console.error('❌ 创建项目失败:', err.message);
        return;
      }
    }

    if (!projectId) {
      console.error('❌ 无法获取或创建项目');
      return;
    }

    // 4. 创建Schema
    const schemas = [
      {
        name: 'articles',
        display_name: '文章',
        definition: {
          fields: [
            { name: 'title', type: 'string', label: '标题', required: true },
            { name: 'content', type: 'text', label: '内容', required: true },
            { name: 'status', type: 'string', label: '状态', default: 'published' },
            { name: 'category', type: 'string', label: '分类' },
            { name: 'views', type: 'integer', label: '浏览量', default: 0 }
          ]
        }
      },
      {
        name: 'skills',
        display_name: '技能',
        definition: {
          fields: [
            { name: 'name', type: 'string', label: '技能名称', required: true },
            { name: 'level', type: 'string', label: '熟练度' },
            { name: 'category', type: 'string', label: '分类' },
            { name: 'years', type: 'integer', label: '年限' }
          ]
        }
      },
      {
        name: 'contacts',
        display_name: '联系人',
        definition: {
          fields: [
            { name: 'name', type: 'string', label: '姓名', required: true },
            { name: 'email', type: 'string', label: '邮箱' },
            { name: 'phone', type: 'string', label: '电话' },
            { name: 'company', type: 'string', label: '公司' },
            { name: 'notes', type: 'text', label: '备注' }
          ]
        }
      }
    ];

    for (const schema of schemas) {
      try {
        // 先检查Schema是否已存在
        const checkRes = await request('GET', `/_system/schemas/${projectSlug}/${schema.name}`, null, authToken);
        console.log(`✅ Schema ${schema.name} 已存在`);
        continue;
      } catch (checkErr) {
        // 不存在，创建新的
        try {
          const createSchemaRes = await request('POST', `/_system/schemas/${projectSlug}`, schema, authToken);
          
          if (createSchemaRes.data.success) {
            console.log(`✅ Schema ${schema.name} 创建成功`);
          }
        } catch (createErr) {
          console.error(`❌ 创建Schema ${schema.name} 失败:`, createErr.message);
        }
      }
    }

    // 5. 等待一下，确保Schema创建完成
    console.log('\n⏳ 等待Schema创建完成...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 6. 添加一些示例数据
    console.log('\n尝试添加示例数据...');
    
    const articles = [
      { title: 'JavaScript入门指南', content: '这是一篇关于JavaScript基础的入门文章，涵盖变量、函数、作用域等核心概念。', status: 'published', category: '前端', views: 1250 },
      { title: 'React Hooks详解', content: '深入探讨React Hooks的使用方法，包括useState、useEffect、useContext等常用Hook。', status: 'published', category: '前端', views: 890 },
      { title: 'TypeScript高级技巧', content: '介绍TypeScript的高级特性，包括泛型、类型体操、装饰器等。', status: 'published', category: '前端', views: 678 },
    ];

    for (const article of articles) {
      try {
        await request('POST', `/${projectSlug}/api/articles`, article, authToken);
        console.log(`✅ 文章 "${article.title}" 已添加`);
      } catch (err) {
        console.log(`⚠️ 添加文章失败: ${article.title}`);
      }
    }

    const skills = [
      { name: 'JavaScript', level: '专家', category: '前端', years: 5 },
      { name: 'TypeScript', level: '熟练', category: '前端', years: 3 },
      { name: 'React', level: '熟练', category: '前端', years: 4 },
      { name: 'Node.js', level: '熟练', category: '后端', years: 3 },
    ];

    for (const skill of skills) {
      try {
        await request('POST', `/${projectSlug}/api/skills`, skill, authToken);
        console.log(`✅ 技能 "${skill.name}" 已添加`);
      } catch (err) {
        console.log(`⚠️ 添加技能失败: ${skill.name}`);
      }
    }

    console.log('\n🎉 测试数据初始化完成！');
    console.log('\n您现在可以:');
    console.log('1. 访问 http://localhost:5173');
    console.log('2. 使用 admin@example.com / 123456 登录');
    console.log('3. 进入数据管理页面查看示例数据');

  } catch (error) {
    console.error('❌ 初始化失败:', error.message);
  }
}

seedData();
