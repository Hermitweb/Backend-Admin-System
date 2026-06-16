require('dotenv').config();
const { DataSource } = require('typeorm');
const { v4: uuidv4 } = require('uuid');

const dataSource = new DataSource({
  type: 'sqlite',
  database: './database.sqlite',
  entities: [
    require('../dist/entity/user.entity.js').User,
    require('../dist/entity/project.entity.js').Project,
    require('../dist/entity/resource-schema.entity.js').ResourceSchema,
  ],
  synchronize: true,
});

const users = [
  { email: 'admin@example.com', password: '$2b$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', name: '管理员', role: 'admin' },
  { email: 'user1@example.com', password: '$2b$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', name: '张三', role: 'user' },
  { email: 'user2@example.com', password: '$2b$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', name: '李四', role: 'user' },
  { email: 'user3@example.com', password: '$2b$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', name: '王五', role: 'user' },
  { email: 'user4@example.com', password: '$2b$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', name: '赵六', role: 'user' },
];

const projects = [
  { name: '个人主页', slug: 'personal-homepage', description: '个人主页项目，展示个人信息和作品集' },
  { name: '作品集', slug: 'portfolio', description: '作品集项目，展示创意作品和项目案例' },
  { name: '博客系统', slug: 'blog-system', description: '博客系统，管理文章和评论' },
  { name: '电商平台', slug: 'ecommerce', description: '电商平台项目，商品管理和订单处理' },
  { name: '任务管理', slug: 'task-manager', description: '任务管理系统，团队协作和进度追踪' },
];

const schemas = [
  {
    projectSlug: 'personal-homepage',
    name: 'profile',
    displayName: '个人资料',
    definition: [
      { name: 'name', type: 'string', label: '姓名', required: true },
      { name: 'age', type: 'integer', label: '年龄', default: 18 },
      { name: 'bio', type: 'text', label: '简介' },
      { name: 'email', type: 'string', label: '邮箱', required: true },
      { name: 'phone', type: 'string', label: '电话' },
      { name: 'avatar', type: 'string', label: '头像URL' },
      { name: 'location', type: 'string', label: '所在地' },
      { name: 'birthday', type: 'date', label: '生日' },
      { name: 'status', type: 'enum', label: '状态', options: ['在职', '离职', '求职'] },
      { name: 'skills', type: 'text', label: '技能' },
      { name: 'created_at', type: 'timestamp', label: '创建时间' },
    ],
  },
  {
    projectSlug: 'portfolio',
    name: 'projects',
    displayName: '作品项目',
    definition: [
      { name: 'title', type: 'string', label: '项目标题', required: true },
      { name: 'description', type: 'text', label: '项目描述' },
      { name: 'category', type: 'enum', label: '分类', options: ['网站设计', '移动应用', '后端开发', '数据分析'] },
      { name: 'cover_image', type: 'string', label: '封面图片' },
      { name: 'tags', type: 'string', label: '标签' },
      { name: 'demo_url', type: 'string', label: '演示地址' },
      { name: 'github_url', type: 'string', label: 'GitHub地址' },
      { name: 'status', type: 'enum', label: '状态', options: ['进行中', '已完成', '暂停'] },
      { name: 'priority', type: 'integer', label: '优先级', default: 1 },
      { name: 'start_date', type: 'date', label: '开始日期' },
      { name: 'end_date', type: 'date', label: '结束日期' },
      { name: 'team_size', type: 'integer', label: '团队人数', default: 1 },
      { name: 'budget', type: 'decimal', label: '预算' },
      { name: 'featured', type: 'boolean', label: '精选', default: false },
    ],
  },
  {
    projectSlug: 'blog-system',
    name: 'articles',
    displayName: '文章',
    definition: [
      { name: 'title', type: 'string', label: '文章标题', required: true },
      { name: 'slug', type: 'string', label: 'URL别名', required: true },
      { name: 'content', type: 'text', label: '文章内容', required: true },
      { name: 'excerpt', type: 'text', label: '摘要' },
      { name: 'category', type: 'string', label: '分类' },
      { name: 'tags', type: 'string', label: '标签' },
      { name: 'author', type: 'string', label: '作者' },
      { name: 'status', type: 'enum', label: '状态', options: ['草稿', '发布', '归档'] },
      { name: 'published_at', type: 'timestamp', label: '发布时间' },
      { name: 'views', type: 'integer', label: '浏览量', default: 0 },
      { name: 'likes', type: 'integer', label: '点赞数', default: 0 },
      { name: 'comments_count', type: 'integer', label: '评论数', default: 0 },
      { name: 'is_featured', type: 'boolean', label: '精选', default: false },
      { name: 'seo_title', type: 'string', label: 'SEO标题' },
      { name: 'seo_description', type: 'string', label: 'SEO描述' },
    ],
  },
  {
    projectSlug: 'blog-system',
    name: 'comments',
    displayName: '评论',
    definition: [
      { name: 'article_id', type: 'string', label: '文章ID', required: true },
      { name: 'parent_id', type: 'string', label: '父评论ID' },
      { name: 'content', type: 'text', label: '评论内容', required: true },
      { name: 'author_name', type: 'string', label: '作者名称', required: true },
      { name: 'author_email', type: 'string', label: '作者邮箱' },
      { name: 'author_website', type: 'string', label: '作者网站' },
      { name: 'status', type: 'enum', label: '状态', options: ['待审核', '已通过', '已拒绝'] },
      { name: 'likes', type: 'integer', label: '点赞数', default: 0 },
      { name: 'replies_count', type: 'integer', label: '回复数', default: 0 },
    ],
  },
  {
    projectSlug: 'ecommerce',
    name: 'products',
    displayName: '商品',
    definition: [
      { name: 'name', type: 'string', label: '商品名称', required: true },
      { name: 'sku', type: 'string', label: '商品编码', required: true },
      { name: 'description', type: 'text', label: '商品描述' },
      { name: 'short_description', type: 'string', label: '简短描述' },
      { name: 'price', type: 'decimal', label: '价格', required: true },
      { name: 'original_price', type: 'decimal', label: '原价' },
      { name: 'stock', type: 'integer', label: '库存', default: 0 },
      { name: 'category', type: 'string', label: '分类' },
      { name: 'brand', type: 'string', label: '品牌' },
      { name: 'images', type: 'text', label: '图片列表(JSON)' },
      { name: 'tags', type: 'string', label: '标签' },
      { name: 'status', type: 'enum', label: '状态', options: ['上架', '下架', '预售'] },
      { name: 'is_featured', type: 'boolean', label: '精选', default: false },
      { name: 'is_new', type: 'boolean', label: '新品', default: false },
      { name: 'weight', type: 'decimal', label: '重量(kg)' },
      { name: 'dimensions', type: 'string', label: '尺寸(长x宽x高)' },
      { name: 'specifications', type: 'text', label: '规格参数(JSON)' },
      { name: 'sales_count', type: 'integer', label: '销量', default: 0 },
      { name: 'rating', type: 'decimal', label: '评分', default: 0 },
      { name: 'review_count', type: 'integer', label: '评价数', default: 0 },
    ],
  },
  {
    projectSlug: 'ecommerce',
    name: 'orders',
    displayName: '订单',
    definition: [
      { name: 'order_no', type: 'string', label: '订单编号', required: true },
      { name: 'user_id', type: 'string', label: '用户ID' },
      { name: 'user_name', type: 'string', label: '用户姓名' },
      { name: 'user_phone', type: 'string', label: '联系电话' },
      { name: 'address', type: 'text', label: '收货地址' },
      { name: 'items', type: 'text', label: '商品列表(JSON)', required: true },
      { name: 'total_amount', type: 'decimal', label: '订单总额', required: true },
      { name: 'discount_amount', type: 'decimal', label: '优惠金额', default: 0 },
      { name: 'pay_amount', type: 'decimal', label: '实付金额', required: true },
      { name: 'payment_method', type: 'enum', label: '支付方式', options: ['微信', '支付宝', '银行卡', '货到付款'] },
      { name: 'payment_status', type: 'enum', label: '支付状态', options: ['待支付', '已支付', '退款中', '已退款'] },
      { name: 'status', type: 'enum', label: '订单状态', options: ['待付款', '待发货', '已发货', '待收货', '已完成', '已取消'] },
      { name: 'remark', type: 'string', label: '订单备注' },
      { name: 'created_at', type: 'timestamp', label: '创建时间' },
      { name: 'paid_at', type: 'timestamp', label: '支付时间' },
      { name: 'shipped_at', type: 'timestamp', label: '发货时间' },
      { name: 'completed_at', type: 'timestamp', label: '完成时间' },
    ],
  },
  {
    projectSlug: 'task-manager',
    name: 'tasks',
    displayName: '任务',
    definition: [
      { name: 'title', type: 'string', label: '任务标题', required: true },
      { name: 'description', type: 'text', label: '任务描述' },
      { name: 'priority', type: 'enum', label: '优先级', options: ['低', '中', '高', '紧急'], default: '中' },
      { name: 'status', type: 'enum', label: '状态', options: ['待开始', '进行中', '待审核', '已完成', '已取消'] },
      { name: 'assignee', type: 'string', label: '负责人' },
      { name: 'reporter', type: 'string', label: '创建人' },
      { name: 'due_date', type: 'date', label: '截止日期' },
      { name: 'start_date', type: 'date', label: '开始日期' },
      { name: 'completed_at', type: 'timestamp', label: '完成时间' },
      { name: 'tags', type: 'string', label: '标签' },
      { name: 'project', type: 'string', label: '所属项目' },
      { name: 'sprint', type: 'string', label: '迭代' },
      { name: 'story_points', type: 'integer', label: '故事点', default: 0 },
      { name: 'progress', type: 'integer', label: '进度(%)', default: 0 },
      { name: 'parent_id', type: 'string', label: '父任务ID' },
      { name: 'comments_count', type: 'integer', label: '评论数', default: 0 },
      { name: 'attachments_count', type: 'integer', label: '附件数', default: 0 },
    ],
  },
  {
    projectSlug: 'task-manager',
    name: 'projects',
    displayName: '项目',
    definition: [
      { name: 'name', type: 'string', label: '项目名称', required: true },
      { name: 'description', type: 'text', label: '项目描述' },
      { name: 'status', type: 'enum', label: '状态', options: ['规划中', '进行中', '已完成', '已暂停', '已取消'] },
      { name: 'start_date', type: 'date', label: '开始日期' },
      { name: 'end_date', type: 'date', label: '结束日期' },
      { name: 'manager', type: 'string', label: '项目经理' },
      { name: 'team', type: 'text', label: '团队成员(JSON)' },
      { name: 'progress', type: 'integer', label: '进度(%)', default: 0 },
      { name: 'budget', type: 'decimal', label: '预算' },
      { name: 'actual_cost', type: 'decimal', label: '实际成本' },
      { name: 'priority', type: 'enum', label: '优先级', options: ['低', '中', '高'], default: '中' },
      { name: 'tags', type: 'string', label: '标签' },
      { name: 'tasks_count', type: 'integer', label: '任务总数', default: 0 },
      { name: 'completed_tasks_count', type: 'integer', label: '已完成任务数', default: 0 },
    ],
  },
];

async function seedData() {
  await dataSource.initialize();
  
  const userRepository = dataSource.getRepository('User');
  const projectRepository = dataSource.getRepository('Project');
  const schemaRepository = dataSource.getRepository('ResourceSchema');

  console.log('清理现有数据...');
  await dataSource.query('DELETE FROM resource_schemas');
  await dataSource.query('DELETE FROM projects');
  await dataSource.query('DELETE FROM users');

  console.log('创建用户...');
  for (const user of users) {
    await userRepository.save({
      id: uuidv4(),
      email: user.email,
      password: user.password,
      name: user.name,
      role: user.role,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  console.log('创建项目...');
  const projectMap = {};
  for (const project of projects) {
    const createdProject = await projectRepository.save({
      id: uuidv4(),
      slug: project.slug,
      name: project.name,
      description: project.description,
      status: 'active',
      isolation: 'strict',
      linked_projects: [],
      config: {},
      created_at: new Date(),
      updated_at: new Date(),
    });
    projectMap[project.slug] = createdProject.id;
  }

  console.log('创建Schema...');
  for (const schema of schemas) {
    await schemaRepository.save({
      id: uuidv4(),
      project_id: projectMap[schema.projectSlug],
      name: schema.name,
      display_name: schema.displayName,
      definition: JSON.stringify(schema.definition),
      version: 1,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  console.log('数据填充完成！');
  await dataSource.destroy();
}

seedData().catch(console.error);