/**
 * SQLite 数据库连接接口
 */
export interface DatabaseInstance {
  /** 执行查询 */
  prepare(sql: string): any;
  
  /** 执行多个语句 */
  exec(sql: string): void;
  
  /** 获取 pragmas */
  pragma(pragmaName: string): any;
  
  /** 关闭数据库 */
  close(): void;
}

/**
 * 连接对象
 */
export interface PooledConnection {
  /** 连接唯一标识符 */
  id: string;
  
  /** SQLite 数据库实例 */
  database: DatabaseInstance;
  
  /** 创建时间戳 */
  createdAt: number;
  
  /** 数据库路径 */
  dbPath: string;
}

/**
 * 连接池选项
 */
export interface ConnectionPoolOptions {
  /** 最大连接数限制 */
  maxSize: number;
  
  /** 最小空闲连接数 */
  minSize?: number;
}

/**
 * 连接池配置
 */
export interface SqliteConnectionPool {
  /** 连接池名称 */
  name: string;
  
  /** 数据库路径 */
  dbPath: string;
  
  /** 连接工厂函数 */
  factory: () => Promise<PooledConnection>;
  
  /** 所有已创建的连接 */
  connections: PooledConnection[];
  
  /** 等待队列 */
  waitingQueue: Array<(conn: PooledConnection) => void>;
  
  /** 连接池配置 */
  options: ConnectionPoolOptions;
}

/**
 * 连接状态枚举
 */
export enum ConnectionState {
  IDLE = 'idle',
  IN_USE = 'in_use',
  CLOSING = 'closing',
  CLOSED = 'closed',
  ERROR = 'error',
}

/**
 * 连接使用统计信息
 */
export interface ConnectionStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  inUseConnections: number;
  averageWaitTime: number;
  connectionSuccessRate: number;
}

/**
 * 连接事件类型
 */
export interface ConnectionEvent {
  type: 'created' | 'acquired' | 'released' | 'removed' | 'error';
  connectionId: string;
  timestamp: Date;
  details?: Record<string, any>;
}

/**
 * 连接池错误处理
 */
export interface ConnectionPoolError extends Error {
  code?: string;
  originalError?: Error;
  connectionId?: string;
}

