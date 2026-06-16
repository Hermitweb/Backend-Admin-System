const BASE_URL = 'http://localhost:3000/api/v1';

async function request(url, method, data) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  if (data) {
    options.body = JSON.stringify(data);
  }
  const response = await fetch(url, options);
  return response.json();
}

const articles = [
  { title: 'JavaScript入门指南', content: '这是一篇关于JavaScript基础的入门文章，涵盖变量、函数、作用域等核心概念。', status: 'published', category: '前端', views: 1250 },
  { title: 'React Hooks详解', content: '深入探讨React Hooks的使用方法，包括useState、useEffect、useContext等常用Hook。', status: 'published', category: '前端', views: 890 },
  { title: 'TypeScript高级技巧', content: '介绍TypeScript的高级特性，包括泛型、类型体操、装饰器等。', status: 'published', category: '前端', views: 678 },
  { title: 'Node.js性能优化', content: '分享Node.js应用性能优化的最佳实践和常见技巧。', status: 'published', category: '后端', views: 543 },
  { title: 'Docker容器化部署', content: '学习如何使用Docker进行应用容器化部署，提高开发效率。', status: 'published', category: '运维', views: 421 },
  { title: 'Git工作流最佳实践', content: '介绍团队协作中Git的最佳实践，包括分支管理、代码审查等。', status: 'published', category: '工具', views: 389 },
  { title: 'CSS动画实战', content: '通过实例学习CSS动画的实现方法，包括关键帧动画、过渡效果等。', status: 'draft', category: '前端', views: 234 },
  { title: 'MongoDB数据库设计', content: '探讨MongoDB数据库的设计原则和最佳实践。', status: 'published', category: '数据库', views: 567 },
  { title: 'RESTful API设计规范', content: '介绍RESTful API的设计规范和最佳实践。', status: 'published', category: '后端', views: 789 },
  { title: '单元测试入门教程', content: '学习如何编写单元测试，提高代码质量。', status: 'published', category: '测试', views: 456 },
];

const skills = [
  { name: 'JavaScript', level: '专家', category: '前端', years: 8 },
  { name: 'TypeScript', level: '高级', category: '前端', years: 5 },
  { name: 'React', level: '专家', category: '前端', years: 6 },
  { name: 'Vue', level: '高级', category: '前端', years: 4 },
  { name: 'Node.js', level: '高级', category: '后端', years: 5 },
  { name: 'Python', level: '中级', category: '后端', years: 3 },
  { name: 'SQL', level: '高级', category: '数据库', years: 6 },
  { name: 'Docker', level: '中级', category: '运维', years: 3 },
  { name: 'Git', level: '专家', category: '工具', years: 7 },
  { name: 'Webpack', level: '高级', category: '工具', years: 4 },
];

const projects = [
  { name: '电商平台前端', description: '基于React的电商平台前端应用，包含商品展示、购物车、订单管理等功能。', tech_stack: 'React, TypeScript, Redux, Ant Design', role: '技术负责人', start_date: '2023-01-01', end_date: '2023-06-30' },
  { name: '后台管理系统', description: '企业级后台管理系统，支持权限管理、数据统计、日志审计等功能。', tech_stack: 'Vue3, TypeScript, Pinia, Element Plus', role: '开发工程师', start_date: '2022-07-01', end_date: '2022-12-31' },
  { name: '实时聊天系统', description: '支持多人实时聊天、文件分享、消息通知的即时通讯系统。', tech_stack: 'Node.js, WebSocket, Redis, MongoDB', role: '后端开发', start_date: '2023-03-01', end_date: '2023-09-30' },
  { name: '数据可视化平台', description: '企业级数据可视化平台，支持多种图表类型和数据钻取。', tech_stack: 'React, ECharts, D3.js', role: '前端开发', start_date: '2023-05-01', end_date: '2023-11-30' },
  { name: '微服务架构改造', description: '将单体应用拆分为微服务架构，提高系统可扩展性和稳定性。', tech_stack: 'Spring Boot, Docker, Kubernetes', role: '架构师', start_date: '2022-01-01', end_date: '2022-06-30' },
  { name: 'API网关系统', description: '统一API网关，提供路由、限流、认证等功能。', tech_stack: 'NestJS, Redis, JWT', role: '后端开发', start_date: '2023-07-01', end_date: '2023-12-31' },
  { name: '移动端H5商城', description: '适配移动端的H5商城应用，支持微信支付和分享功能。', tech_stack: 'Vue3, Vant, TypeScript', role: '前端开发', start_date: '2022-09-01', end_date: '2023-02-28' },
  { name: '日志分析系统', description: '分布式日志收集和分析系统，支持实时搜索和告警。', tech_stack: 'Elasticsearch, Kibana, Logstash', role: '运维开发', start_date: '2023-02-01', end_date: '2023-08-31' },
  { name: '在线教育平台', description: '支持视频课程、在线测验、学习进度追踪的在线教育平台。', tech_stack: 'React, Node.js, PostgreSQL', role: '全栈开发', start_date: '2022-04-01', end_date: '2022-10-31' },
  { name: '物联网数据平台', description: '物联网设备数据采集、存储和分析平台。', tech_stack: 'MQTT, InfluxDB, Grafana', role: '后端开发', start_date: '2023-08-01', end_date: '2024-01-31' },
];

const experiences = [
  { company: '腾讯科技', position: '高级前端工程师', description: '负责微信支付前端架构设计和核心功能开发，主导多个重要项目的技术方案设计。', start_date: '2021-07-01', end_date: '2023-12-31' },
  { company: '阿里巴巴', position: '前端技术专家', description: '负责淘宝首页前端架构优化，推动前端工程化和性能优化工作。', start_date: '2019-03-01', end_date: '2021-06-30' },
  { company: '字节跳动', position: '前端开发工程师', description: '参与抖音前端开发，负责视频播放相关功能的实现。', start_date: '2017-09-01', end_date: '2019-02-28' },
  { company: '美团', position: '全栈开发工程师', description: '负责美团外卖业务线的前端和后端开发工作。', start_date: '2016-07-01', end_date: '2017-08-31' },
];

const educations = [
  { school: '清华大学', degree: '硕士', major: '计算机科学与技术', start_date: '2014-09-01', end_date: '2016-06-30' },
  { school: '北京大学', degree: '本科', major: '软件工程', start_date: '2010-09-01', end_date: '2014-06-30' },
];

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
        { name: 'views', type: 'integer', label: '浏览量', default: 0 },
      ],
    },
  },
  {
    name: 'skills',
    display_name: '技能',
    definition: {
      fields: [
        { name: 'name', type: 'string', label: '技能名称', required: true },
        { name: 'level', type: 'string', label: '熟练度' },
        { name: 'category', type: 'string', label: '分类' },
        { name: 'years', type: 'integer', label: '年限' },
      ],
    },
  },
  {
    name: 'projects',
    display_name: '项目',
    definition: {
      fields: [
        { name: 'name', type: 'string', label: '项目名称', required: true },
        { name: 'description', type: 'text', label: '描述' },
        { name: 'tech_stack', type: 'string', label: '技术栈' },
        { name: 'role', type: 'string', label: '角色' },
        { name: 'start_date', type: 'string', label: '开始时间' },
        { name: 'end_date', type: 'string', label: '结束时间' },
      ],
    },
  },
  {
    name: 'experiences',
    display_name: '工作经历',
    definition: {
      fields: [
        { name: 'company', type: 'string', label: '公司名称', required: true },
        { name: 'position', type: 'string', label: '职位', required: true },
        { name: 'description', type: 'text', label: '职责描述' },
        { name: 'start_date', type: 'string', label: '开始时间' },
        { name: 'end_date', type: 'string', label: '结束时间' },
      ],
    },
  },
  {
    name: 'educations',
    display_name: '教育背景',
    definition: {
      fields: [
        { name: 'school', type: 'string', label: '学校名称', required: true },
        { name: 'degree', type: 'string', label: '学历' },
        { name: 'major', type: 'string', label: '专业' },
        { name: 'start_date', type: 'string', label: '入学时间' },
        { name: 'end_date', type: 'string', label: '毕业时间' },
      ],
    },
  },
];

async function deleteAllSchemas() {
  console.log('删除所有旧的Schema...');
  try {
    let hasSchemas = true;
    let attempt = 0;
    const maxAttempts = 10;
    
    while (hasSchemas && attempt < maxAttempts) {
      const response = await request(`${BASE_URL}/_system/schemas/personal`, 'GET');
      const allSchemas = response.data?.data || response.data || [];
      
      if (allSchemas.length === 0) {
        hasSchemas = false;
        break;
      }
      
      const schema = allSchemas[0];
      try {
        await request(`${BASE_URL}/_system/schemas/personal/${schema.name}`, 'DELETE');
        console.log(`删除 Schema: ${schema.name}`);
      } catch (err) {
        console.log(`删除失败: ${schema.name}`, err.message);
        hasSchemas = false;
      }
      
      attempt++;
    }
    
    console.log('✅ 所有旧Schema已删除');
  } catch (err) {
    console.error('删除Schema失败:', err.message);
  }
}

async function createSchemas() {
  console.log('\n创建新的Schema...');
  for (const schema of schemas) {
    try {
      await request(`${BASE_URL}/_system/schemas/personal`, 'POST', schema);
      console.log(`✅ 创建 Schema: ${schema.name} (${schema.display_name})`);
    } catch (err) {
      console.log(`❌ 创建失败: ${schema.name}`, err.message);
    }
  }
}

async function insertData(resourceName, dataList) {
  let success = 0;
  for (const data of dataList) {
    try {
      await request(`${BASE_URL}/personal/api/${resourceName}`, 'POST', data);
      success++;
    } catch (error) {
      console.log(`❌ 插入数据失败:`, error.message);
    }
  }
  console.log(`✅ ${resourceName} 数据插入完成，共 ${success} 条`);
}

async function insertAllData() {
  console.log('\n插入测试数据...');
  
  await insertData('articles', articles);
  await insertData('skills', skills);
  await insertData('projects', projects);
  await insertData('experiences', experiences);
  await insertData('educations', educations);
}

async function main() {
  console.log('=== 开始重置数据 ===');
  
  await deleteAllSchemas();
  await createSchemas();
  await insertAllData();
  
  console.log('\n🎉 数据重置完成！');
}

main().catch(console.error);