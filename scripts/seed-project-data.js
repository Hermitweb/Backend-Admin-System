require('dotenv').config();
const { DataSource } = require('typeorm');

const mainDataSource = new DataSource({
  type: 'sqlite',
  database: './database.sqlite',
  entities: [
    require('../dist/entity/project.entity.js').Project,
    require('../dist/entity/database-connection.entity.js').DatabaseConnection,
    require('../dist/entity/resource-schema.entity.js').ResourceSchema,
  ],
  synchronize: true,
});

const projectDatabases = {
  'personal-homepage': {
    name: '个人主页数据库',
    type: 'sqlite',
    database: './databases/personal-homepage.sqlite',
    host: 'localhost',
    port: null,
    username: null,
    password: null,
  },
  'portfolio': {
    name: '作品集数据库',
    type: 'sqlite',
    database: './databases/portfolio.sqlite',
    host: 'localhost',
    port: null,
    username: null,
    password: null,
  },
  'blog-system': {
    name: '博客系统数据库',
    type: 'sqlite',
    database: './databases/blog-system.sqlite',
    host: 'localhost',
    port: null,
    username: null,
    password: null,
  },
  'ecommerce': {
    name: '电商平台数据库',
    type: 'sqlite',
    database: './databases/ecommerce.sqlite',
    host: 'localhost',
    port: null,
    username: null,
    password: null,
  },
  'task-manager': {
    name: '任务管理数据库',
    type: 'sqlite',
    database: './databases/task-manager.sqlite',
    host: 'localhost',
    port: null,
    username: null,
    password: null,
  },
};

const projectSchemas = {
  'personal-homepage': {
    name: 'profile',
    fields: {
      name: { type: 'string', label: '姓名', required: true },
      age: { type: 'number', label: '年龄', required: false },
      bio: { type: 'text', label: '个人简介', required: false },
      email: { type: 'string', label: '邮箱', required: true },
      phone: { type: 'string', label: '电话', required: false },
      avatar: { type: 'string', label: '头像', required: false },
      location: { type: 'string', label: '所在地', required: false },
      birthday: { type: 'date', label: '生日', required: false },
      is_active: { type: 'boolean', label: '是否活跃', required: true, default: true },
      role: { type: 'enum', label: '角色', options: ['admin', 'user', 'guest'], required: true },
      skills: { type: 'array', label: '技能', required: false },
      social_links: { type: 'json', label: '社交链接', required: false },
    },
  },
  'portfolio': {
    name: 'works',
    fields: {
      title: { type: 'string', label: '作品标题', required: true },
      description: { type: 'text', label: '作品描述', required: false },
      category: { type: 'string', label: '分类', required: true },
      tags: { type: 'array', label: '标签', required: false },
      cover_image: { type: 'string', label: '封面图片', required: false },
      images: { type: 'array', label: '图片集', required: false },
      url: { type: 'string', label: '预览链接', required: false },
      status: { type: 'enum', label: '状态', options: ['draft', 'published', 'archived'], required: true },
      priority: { type: 'number', label: '优先级', required: false, default: 0 },
      view_count: { type: 'number', label: '浏览次数', required: false, default: 0 },
      like_count: { type: 'number', label: '点赞数', required: false, default: 0 },
    },
  },
  'blog-system': {
    name: 'articles',
    fields: {
      title: { type: 'string', label: '文章标题', required: true },
      content: { type: 'text', label: '文章内容', required: true },
      excerpt: { type: 'string', label: '摘要', required: false },
      author: { type: 'string', label: '作者', required: true },
      category: { type: 'string', label: '分类', required: true },
      tags: { type: 'array', label: '标签', required: false },
      status: { type: 'enum', label: '状态', options: ['draft', 'published', 'hidden'], required: true },
      view_count: { type: 'number', label: '浏览次数', required: false, default: 0 },
      comment_count: { type: 'number', label: '评论数', required: false, default: 0 },
      is_featured: { type: 'boolean', label: '是否精选', required: false, default: false },
      published_at: { type: 'datetime', label: '发布时间', required: false },
    },
  },
  'ecommerce': {
    name: 'products',
    fields: {
      name: { type: 'string', label: '商品名称', required: true },
      description: { type: 'text', label: '商品描述', required: false },
      price: { type: 'number', label: '价格', required: true },
      original_price: { type: 'number', label: '原价', required: false },
      discount: { type: 'number', label: '折扣率', required: false, default: 0 },
      stock: { type: 'number', label: '库存', required: true, default: 0 },
      sold_count: { type: 'number', label: '销量', required: false, default: 0 },
      category: { type: 'string', label: '分类', required: true },
      tags: { type: 'array', label: '标签', required: false },
      images: { type: 'array', label: '商品图片', required: false },
      status: { type: 'enum', label: '状态', options: ['draft', 'active', 'inactive', 'deleted'], required: true },
      is_hot: { type: 'boolean', label: '是否热门', required: false, default: false },
      is_new: { type: 'boolean', label: '是否新品', required: false, default: false },
      rating: { type: 'number', label: '评分', required: false, default: 0 },
      review_count: { type: 'number', label: '评价数', required: false, default: 0 },
    },
  },
  'task-manager': {
    name: 'tasks',
    fields: {
      title: { type: 'string', label: '任务标题', required: true },
      description: { type: 'text', label: '任务描述', required: false },
      priority: { type: 'enum', label: '优先级', options: ['low', 'medium', 'high', 'urgent'], required: true },
      status: { type: 'enum', label: '状态', options: ['todo', 'in_progress', 'review', 'done', 'cancelled'], required: true },
      assignee: { type: 'string', label: '负责人', required: false },
      creator: { type: 'string', label: '创建者', required: true },
      due_date: { type: 'date', label: '截止日期', required: false },
      tags: { type: 'array', label: '标签', required: false },
      attachments: { type: 'array', label: '附件', required: false },
      comments: { type: 'number', label: '评论数', required: false, default: 0 },
      subtasks: { type: 'number', label: '子任务数', required: false, default: 0 },
      completed_subtasks: { type: 'number', label: '已完成子任务', required: false, default: 0 },
    },
  },
};

const projectTestData = {
  'personal-homepage': [
    { name: '张三', age: 25, bio: '前端开发工程师，热爱编程，专注于React和Vue', email: 'zhangsan@example.com', phone: '13800138001', location: '北京', birthday: '1999-01-15', is_active: true, role: 'admin', skills: ['React', 'Vue', 'TypeScript'], social_links: { github: 'https://github.com/zhangsan', linkedin: 'https://linkedin.com/in/zhangsan' } },
    { name: '李四', age: 30, bio: '后端开发工程师，专注于Node.js和微服务架构', email: 'lisi@example.com', phone: '13800138002', location: '上海', birthday: '1994-06-20', is_active: true, role: 'user', skills: ['Node.js', 'Python', 'Docker'], social_links: { github: 'https://github.com/lisi' } },
    { name: '王五', age: 28, bio: '全栈开发工程师，热爱技术，喜欢探索新技术', email: 'wangwu@example.com', phone: '13800138003', location: '深圳', birthday: '1996-03-10', is_active: true, role: 'user', skills: ['React', 'Node.js', 'MongoDB'] },
    { name: '赵六', age: 32, bio: '系统架构师，10年经验，专注于分布式系统', email: 'zhaoliu@example.com', phone: '13800138004', location: '杭州', birthday: '1992-11-25', is_active: false, role: 'admin', skills: ['Java', 'Kubernetes', 'Redis'] },
    { name: '钱七', age: 26, bio: 'UI设计师，创意无限，热爱设计', email: 'qianqi@example.com', phone: '13800138005', location: '广州', birthday: '1998-08-12', is_active: true, role: 'user', skills: ['Figma', 'Sketch', 'Photoshop'] },
  ],
  'portfolio': [
    { title: '电商平台首页设计', description: '现代化电商平台首页，响应式设计', category: 'UI设计', tags: ['电商', 'UI', '响应式'], url: 'https://example.com/portfolio/ecommerce', status: 'published', priority: 1, view_count: 1250, like_count: 89 },
    { title: '企业管理系统', description: '基于React的企业级管理系统', category: 'Web应用', tags: ['React', 'TypeScript', 'Ant Design'], url: 'https://example.com/portfolio/crm', status: 'published', priority: 2, view_count: 2340, like_count: 156 },
    { title: '移动端社交App', description: '社交类移动应用设计', category: '移动应用', tags: ['React Native', '社交', 'App'], status: 'draft', priority: 3, view_count: 456, like_count: 23 },
    { title: '数据可视化仪表盘', description: '实时数据可视化仪表盘', category: '数据可视化', tags: ['D3.js', '图表', '大数据'], url: 'https://example.com/portfolio/dashboard', status: 'published', priority: 1, view_count: 3420, like_count: 234 },
    { title: '在线教育平台', description: '在线学习平台，支持视频课程', category: '教育', tags: ['教育', '视频', '学习'], status: 'published', priority: 2, view_count: 1890, like_count: 145 },
  ],
  'blog-system': [
    { title: 'React 18 新特性详解', content: '本文详细介绍React 18的新特性，包括并发特性、Suspense改进等...', excerpt: 'React 18带来了许多令人兴奋的新特性', author: '张三', category: '前端', tags: ['React', 'JavaScript', '前端'], status: 'published', view_count: 2340, comment_count: 45, is_featured: true, published_at: '2024-01-15' },
    { title: 'Node.js性能优化指南', content: '深入探讨Node.js性能优化的各种方法和最佳实践...', excerpt: '提升Node.js应用性能的实用技巧', author: '李四', category: '后端', tags: ['Node.js', '性能', '后端'], status: 'published', view_count: 1890, comment_count: 32, is_featured: true, published_at: '2024-01-12' },
    { title: 'TypeScript高级类型技巧', content: '深入理解TypeScript的高级类型系统...', excerpt: '掌握TypeScript类型体操', author: '王五', category: '前端', tags: ['TypeScript', '前端', '类型'], status: 'draft', view_count: 0, comment_count: 0, is_featured: false },
    { title: '微服务架构设计原则', content: '探讨微服务架构的设计原则和实践经验...', excerpt: '构建可扩展的微服务系统', author: '赵六', category: '架构', tags: ['微服务', '架构', '设计'], status: 'published', view_count: 3450, comment_count: 67, is_featured: true, published_at: '2024-01-10' },
    { title: 'Docker容器化实践', content: '从零开始学习Docker容器化部署...', excerpt: '容器化入门到精通', author: '钱七', category: 'DevOps', tags: ['Docker', '容器', 'DevOps'], status: 'published', view_count: 1560, comment_count: 28, is_featured: false, published_at: '2024-01-08' },
  ],
  'ecommerce': [
    { name: '无线蓝牙耳机', description: '高品质无线蓝牙耳机，降噪功能', price: 299, original_price: 399, discount: 0.25, stock: 100, sold_count: 523, category: '电子产品', tags: ['耳机', '无线', '降噪'], status: 'active', is_hot: true, is_new: false, rating: 4.8, review_count: 156 },
    { name: '机械键盘', description: 'RGB背光机械键盘，青轴', price: 459, original_price: 599, discount: 0.23, stock: 50, sold_count: 234, category: '电子产品', tags: ['键盘', '机械', 'RGB'], status: 'active', is_hot: true, is_new: true, rating: 4.9, review_count: 89 },
    { name: '智能手表', description: '多功能智能手表，支持心率监测', price: 899, original_price: 1299, discount: 0.31, stock: 30, sold_count: 156, category: '穿戴设备', tags: ['手表', '智能', '健康'], status: 'active', is_hot: false, is_new: true, rating: 4.7, review_count: 67 },
    { name: '便携充电宝', description: '20000mAh大容量充电宝', price: 159, original_price: 199, discount: 0.20, stock: 200, sold_count: 890, category: '电子产品', tags: ['充电宝', '便携', '大容量'], status: 'active', is_hot: true, is_new: false, rating: 4.6, review_count: 234 },
    { name: '游戏鼠标', description: '高精度游戏鼠标，可编程按键', price: 329, original_price: 399, discount: 0.18, stock: 80, sold_count: 345, category: '电子产品', tags: ['鼠标', '游戏', '电竞'], status: 'active', is_hot: false, is_new: false, rating: 4.8, review_count: 123 },
  ],
  'task-manager': [
    { title: '完成项目需求文档', description: '编写详细的项目需求文档', priority: 'high', status: 'done', assignee: '张三', creator: '李四', due_date: '2024-01-10', tags: ['文档', '需求'], comments: 5, subtasks: 3, completed_subtasks: 3 },
    { title: '设计数据库架构', description: '设计系统数据库表结构', priority: 'high', status: 'in_progress', assignee: '李四', creator: '张三', due_date: '2024-01-15', tags: ['数据库', '设计'], comments: 3, subtasks: 5, completed_subtasks: 2 },
    { title: '实现用户认证模块', description: '完成用户登录注册功能', priority: 'medium', status: 'review', assignee: '王五', creator: '张三', due_date: '2024-01-18', tags: ['认证', '用户'], comments: 8, subtasks: 4, completed_subtasks: 4 },
    { title: '优化前端性能', description: '优化首页加载速度', priority: 'medium', status: 'todo', assignee: '钱七', creator: '李四', due_date: '2024-01-20', tags: ['性能', '前端'], comments: 2, subtasks: 2, completed_subtasks: 0 },
    { title: '编写单元测试', description: '为核心模块编写测试用例', priority: 'low', status: 'todo', assignee: '赵六', creator: '王五', due_date: '2024-01-25', tags: ['测试', '质量'], comments: 1, subtasks: 6, completed_subtasks: 0 },
  ],
};

const fs = require('fs');
const path = require('path');

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function createProjectDatabase(projectSlug, config) {
  await ensureDir('./databases');
  
  const projectDataSource = new DataSource({
    type: config.type,
    database: config.database,
    synchronize: true,
  });
  
  await projectDataSource.initialize();
  
  const schema = projectSchemas[projectSlug];
  if (schema) {
    const sanitizedSlug = projectSlug.replace(/-/g, '_');
    const tableName = `project_${sanitizedSlug}_${schema.name}`;
    
    const columns = Object.entries(schema.fields).map(([name, field]) => {
      let type = 'TEXT';
      if (field.type === 'number') type = 'INTEGER';
      if (field.type === 'boolean') type = 'INTEGER';
      if (field.type === 'date') type = 'TEXT';
      if (field.type === 'datetime') type = 'TEXT';
      const nullable = field.required ? 'NOT NULL' : '';
      return `${name} ${type} ${nullable}`;
    }).join(',\n  ');
    
    const createTableSql = `CREATE TABLE IF NOT EXISTS ${tableName} (
      id TEXT PRIMARY KEY,
      ${columns},
      created_at TEXT,
      updated_at TEXT
    )`;
    
    await projectDataSource.query(createTableSql);
    
    const testData = projectTestData[projectSlug] || [];
    for (const item of testData) {
      const uuid = require('uuid').v4();
      const now = new Date().toISOString();
      const keys = ['id', ...Object.keys(item), 'created_at', 'updated_at'];
      const values = [
        `'${uuid}'`,
        ...Object.values(item).map(v => {
          if (v === null || v === undefined) return 'NULL';
          if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
          if (typeof v === 'boolean') return v ? '1' : '0';
          if (typeof v === 'number') return v;
          if (Array.isArray(v) || typeof v === 'object') return `'${JSON.stringify(v)}'`;
          return `'${v}'`;
        }),
        `'${now}'`,
        `'${now}'`
      ];
      
      const insertSql = `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${values.join(', ')})`;
      await projectDataSource.query(insertSql);
    }
    
    console.log(`已创建项目 ${projectSlug} 的数据库和测试数据`);
  }
  
  await projectDataSource.destroy();
}

async function seedData() {
  await mainDataSource.initialize();
  
  const projectRepository = mainDataSource.getRepository('Project');
  const connectionRepository = mainDataSource.getRepository('DatabaseConnection');
  const schemaRepository = mainDataSource.getRepository('ResourceSchema');
  
  console.log('获取项目列表...');
  const projects = await projectRepository.find();
  
  for (const project of projects) {
    const dbConfig = projectDatabases[project.slug];
    if (dbConfig) {
      console.log(`处理项目: ${project.name} (${project.slug})`);
      
      await createProjectDatabase(project.slug, dbConfig);
      
      const existingConnection = await connectionRepository.findOne({
        where: { project_id: project.id, name: dbConfig.name }
      });
      
      if (!existingConnection) {
        await connectionRepository.save({
          id: require('uuid').v4(),
          project_id: project.id,
          name: dbConfig.name,
          type: dbConfig.type,
          host: dbConfig.host,
          port: dbConfig.port,
          database: dbConfig.database,
          username: dbConfig.username,
          password: dbConfig.password,
          status: 'connected',
          enabled: true,
        });
        console.log(`已创建数据库连接配置`);
      }
      
      const existingSchema = await schemaRepository.findOne({
        where: { project_id: project.id, name: projectSchemas[project.slug]?.name }
      });
      
      if (!existingSchema && projectSchemas[project.slug]) {
        await schemaRepository.save({
          id: require('uuid').v4(),
          project_id: project.id,
          name: projectSchemas[project.slug].name,
          definition: projectSchemas[project.slug],
        });
        console.log(`已创建资源Schema`);
      }
    }
  }
  
  await mainDataSource.destroy();
  console.log('\n所有项目数据库配置完成！');
}

seedData().catch(console.error);