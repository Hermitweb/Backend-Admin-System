import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SqliteConnectionPool, ConnectionOptions, PooledConnection } from './types/sqlite-pool.types';
import * as path from 'path';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';

/**
 * SQLite 连接池配置参数
 */
interface SQLitePoolConfig {
  // 最大连接数限制 (建议值：5-20)
  maxConnections: number;
  
  // 连接最小空闲数
  minIdleConnections: number;
  
  // 连接过期时间 (TTL) - 毫秒
  connectionTTL: number;
  
  // TTL 缓存超时检测间隔
  ttlCheckInterval: number;
  
  // 空闲超时时间 (无操作自动释放)
  idleTimeout: number;
  
  // 连接获取超时时间
  acquireTimeout: number;
  
  // WAL 模式启用
  enableWAL: boolean;
  
  // WAL 模式检查点大小
  walCheckpointSize: number;
}

/**
 * 活跃连接追踪对象
 */
interface ActiveConnectionTracking extends PooledConnection {
  lastActiveTime: number;
  usageCount: number;
  acquisitionTime: number;
  sourceTrace?: string;
}

/**
 * SQLite 动态连接池服务
 * 
 * 特点:
 * 1. 最大连接数限制 (可配置，默认 20)
 * 2. 健康检查机制 (实时监测连接状态)
 * 3. TTL 缓存过期机制 (10 分钟无活跃自动释放)
 * 4. WAL (Write-Ahead Logging) 模式优化
 * 5. 连接复用和统计
 */
@Injectable()
export class DynamicConnectionService implements OnModuleInit, OnModuleDestroy {
  private pool: Map<string, ActiveConnectionTracking>;
  private inUseConnections: Map<string, ActiveConnectionTracking>;
  private config: SQLitePoolConfig;
  private healthCheckTimer: NodeJS.Timeout;
  private ttlCheckTimer: NodeJS.Timeout;
  private databaseService: DatabaseService;
  
  /** 当前活跃的独立连接数计数器 */
  private activeCount = 0;
  
  constructor(private configService: ConfigService) {
    this.pool = new Map();
    this.inUseConnections = new Map();
    
    // 读取配置文件或设置默认值
    this.config = {
      maxConnections: this.configService.get<number>('DB_POOL_MAX_CONNECTIONS') || 20,
      minIdleConnections: this.configService.get<number>('DB_POOL_MIN_IDLE') || 2,
      connectionTTL: this.configService.get<number>('DB_POOL_TTL') || 10 * 60 * 1000, // 10 分钟
      ttlCheckInterval: this.configService.get<number>('DB_POOL_TTL_CHECK_INTERVAL') || 30 * 1000, // 30 秒
      idleTimeout: this.configService.get<number>('DB_POOL_IDLE_TIMEOUT') || 5 * 60 * 1000, // 5 分钟
      acquireTimeout: this.configService.get<number>('DB_POOL_ACQUIRE_TIMEOUT') || 30000, // 30 秒
      enableWAL: this.configService.get<boolean>('DB_ENABLE_WAL') ?? true,
      walCheckpointSize: this.configService.get<number>('DB_WAL_CHECKPOINT_SIZE') || 10000,
    };
    
    console.log('SQLite Pool Config:', this.config);
  }
  
  async onModuleInit(): Promise<void> {
    console.log('Initializing SQLite connection pool...');
    this.startHealthChecks();
    this.startTTLChecks();
  }
  
  async onModuleDestroy(): Promise<void> {
    await this.closeAllConnections();
    clearInterval(this.healthCheckTimer);
    clearInterval(this.ttlCheckTimer);
  }
  
  /**
   * 初始化数据库实例
   */
  private async initializeDatabase(dbPath: string): Promise<void> {
    const fullPath = path.resolve(dbPath);
    
    // 确保目录存在
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // 如果数据库文件不存在，创建空文件
    if (!fs.existsSync(fullPath)) {
      fs.writeFileSync(fullPath, '');
    }
  }
  
  /**
   * 获取连接的工厂方法
   */
  private createConnectionFactory(dbPath: string, connId: string): () => PooledConnection {
    return async (): Promise<PooledConnection> => {
      const sqlite = require('better-sqlite3');
      
      const dbOptions = {
        readonly: false,
        fileMustExist: false,
      };
      
      const db = new sqlite(dbPath, dbOptions);
      
      // 启用 WAL 模式 (提升并发写入性能)
      if (this.config.enableWAL) {
        db.pragma('journal_mode=WAL');
        db.pragma('synchronous=NORMAL');
        db.pragma('cache_size=-64000'); // 64MB cache
      }
      
      // 启用临时目录
      db.pragma('temp_store=MEMORY');
      
      return {
        id: connId,
        database: db,
        createdAt: Date.now(),
        dbPath: dbPath,
      };
    };
  }
  
  /**
   * 获取连接池实例
   */
  private getOrCreatePool(connName: string, dbPath: string): SqliteConnectionPool {
    let pool = this.pool.get(connName);
    
    if (!pool) {
      console.log(`Creating new connection pool for ${connName}: ${dbPath}`);
      
      pool = {
        name: connName,
        dbPath: dbPath,
        factory: this.createConnectionFactory(dbPath, connName),
        connections: [],
        waitingQueue: [],
        options: {
          maxSize: this.config.maxConnections,
        },
      };
      
      this.pool.set(connName, pool);
    }
    
    return pool;
  }
  
  /**
   * 检查连接是否健康
   */
  private isConnectionHealthy(conn: ActiveConnectionTracking): boolean {
    try {
      // 尝试执行简单查询来验证连接有效性
      const db = conn.database.database;
      db.prepare('SELECT 1').get();
      return true;
    } catch (error) {
      console.error(`Connection ${conn.id} health check failed:`, error.message);
      return false;
    }
  }
  
  /**
   * 从池中获取连接 (带重试机制)
   */
  async getConnection(connName: string, dbPath: string, timeout: number = this.config.acquireTimeout): Promise<PooledConnection> {
    const startTime = Date.now();
    const pool = this.getOrCreatePool(connName, dbPath);
    const trace = new Error().stack?.split('\n').slice(1, 4).join('\n');
    
    while (true) {
      // 等待连接可用
      while (pool.connections.length < this.config.maxConnections) {
        // 查找可用的空闲连接
        const freeConn = pool.connections.find(c => 
          !this.inUseConnections.has(c.id) &&
          this.isConnectionHealthy(c)
        );
        
        if (freeConn) {
          freeConn.lastActiveTime = Date.now();
          freeConn.usageCount++;
          
          this.inUseConnections.set(freeConn.id, freeConn);
          console.log(`Reused existing connection: ${freeConn.id}`);
          return freeConn;
        }
        
        // 创建新连接
        if (pool.connections.length < this.config.maxConnections) {
          const connFactory = pool.factory;
          const conn = await connFactory();
          
          const trackedConn: ActiveConnectionTracking = {
            ...conn,
            lastActiveTime: Date.now(),
            usageCount: 0,
            acquisitionTime: Date.now(),
            sourceTrace: trace,
          };
          
          pool.connections.push(trackedConn);
          this.activeCount++;
          
          this.inUseConnections.set(trackedConn.id, trackedConn);
          console.log(`Created new connection: ${trackedConn.id} (Total: ${pool.connections.length}/${this.config.maxConnections})`);
          return trackedConn;
        }
        
        // 等待其他线程释放连接
        await this.delay(100);
      }
      
      // 超时检查
      if (Date.now() - startTime > timeout) {
        throw new Error(
          `Timeout acquiring connection after ${timeout}ms\n` +
          `Max connections reached: ${this.config.maxConnections}\n` +
          `Currently active: ${pool.connections.length}`
        );
      }
      
      await this.delay(100);
    }
  }
  
  /**
   * 释放连接回连接池
   */
  releaseConnection(conn: PooledConnection, forceRemove: boolean = false): void {
    const trackedConn = this.inUseConnections.get(conn.id);
    
    if (!trackedConn) {
      console.warn(`Attempted to release unknown connection: ${conn.id}`);
      return;
    }
    
    // 更新最后活动时间
    trackedConn.lastActiveTime = Date.now();
    
    // 移除使用标记
    this.inUseConnections.delete(conn.id);
    
    // 强制移除检查
    if (forceRemove || !this.isConnectionHealthy(trackedConn)) {
      console.log(`Force removing unhealthy connection: ${trackedConn.id}`);
      this.removeConnection(trackedConn, true);
      return;
    }
    
    // 检查是否需要关闭以节省资源
    const timeSinceLastActive = Date.now() - trackedConn.lastActiveTime;
    if (timeSinceLastActive > this.config.idleTimeout) {
      console.log(`Removing idle connection after ${timeSinceLastActive}ms: ${trackedConn.id}`);
      this.removeConnection(trackedConn, false);
    } else {
      console.log(`Released connection back to pool: ${trackedConn.id}, idle for ${timeSinceLastActive}ms`);
    }
  }
  
  /**
   * 移除连接并清理资源
   */
  private removeConnection(trackedConn: ActiveConnectionTracking, closeDB: boolean = false): void {
    const pool = Array.from(this.pool.values()).find(p => 
      p.connections.some(c => c.id === trackedConn.id)
    );
    
    if (pool) {
      const index = pool.connections.indexOf(trackedConn);
      if (index > -1) {
        pool.connections.splice(index, 1);
      }
    }
    
    // 关闭数据库连接
    if (closeDB && trackedConn.database) {
      try {
        trackedConn.database.database.close();
      } catch (error) {
        console.error(`Error closing connection ${trackedConn.id}:`, error);
      }
    }
    
    // 从活动计数中扣除
    if (!this.inUseConnections.has(trackedConn.id)) {
      this.activeCount--;
    }
    
    // 清理内存引用
    delete trackedConn.database;
    delete trackedConn.sourceTrace;
    
    console.log(`Connection ${trackedConn.id} removed. Active count: ${this.activeCount}`);
  }
  
  /**
   * 健康检查定时器
   */
  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(() => {
      console.log('Running connection health checks...');
      
      for (const [connName, pool] of this.pool.entries()) {
        for (const conn of pool.connections) {
          if (!this.inUseConnections.has(conn.id) && !this.isConnectionHealthy(conn)) {
            console.log(`Found unhealthy connection: ${conn.id}, removing...`);
            this.removeConnection(conn, true);
          }
        }
      }
      
      console.log('Health check completed. Total active connections:', this.activeCount);
    }, 60000); // 每分钟执行一次
    
    console.log('Health check timer started');
  }
  
  /**
   * TTL 过期检查定时器 (10 分钟无活跃自动释放)
   */
  private startTTLChecks(): void {
    this.ttlCheckTimer = setInterval(() => {
      console.log('Checking TTL expired connections...');
      const now = Date.now();
      const poolsToRemove: string[] = [];
      
      for (const [connName, pool] of this.pool.entries()) {
        for (const conn of [...pool.connections]) {
          // 跳过正在使用的连接
          if (this.inUseConnections.has(conn.id)) continue;
          
          const timeSinceLastActive = now - conn.lastActiveTime;
          
          // 检查 TTL 过期
          if (timeSinceLastActive > this.config.connectionTTL) {
            console.log(`TTL expired for connection ${conn.id}: active for ${timeSinceLastActive}ms`);
            
            if (!poolsToRemove.includes(connName)) {
              poolsToRemove.push(connName);
            }
            
            this.removeConnection(conn, true);
          }
        }
      }
      
      if (poolsToRemove.length > 0) {
        console.log(`Pools with TTL expired connections:`, poolsToRemove);
      }
    }, this.config.ttlCheckInterval);
    
    console.log('TTL check timer started (interval:', this.config.ttlCheckInterval / 1000, 's)');
  }
  
  /**
   * 获取连接池状态
   */
  getPoolStatus(): Record<string, { 
    total: number; 
    inUse: number; 
    available: number;
    activeCount: number;
  }> {
    const status: any = {};
    
    for (const [name, pool] of this.pool.entries()) {
      const total = pool.connections.length;
      const inUse = pool.connections.filter(c => this.inUseConnections.has(c.id)).length;
      const available = total - inUse;
      
      status[name] = {
        total,
        inUse,
        available,
        activeCount: this.activeCount,
      };
    }
    
    return status;
  }
  
  /**
   * 关闭所有连接
   */
  async closeAllConnections(): Promise<void> {
    console.log('Closing all connections...');
    
    for (const pool of this.pool.values()) {
      for (const conn of pool.connections) {
        this.removeConnection(conn, true);
      }
    }
    
    this.pool.clear();
    this.inUseConnections.clear();
    this.activeCount = 0;
    
    console.log('All connections closed');
  }
  
  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
