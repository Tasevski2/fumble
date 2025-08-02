interface LogContext {
  userId?: string;
  sessionId?: string;
  chainId?: number;
  tokenAddress?: string;
  orderHash?: string;
  [key: string]: any;
}

interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: LogContext;
  timestamp: string;
  stack?: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private debugEnabled = process.env.NEXT_PUBLIC_DEBUG === 'true';

  private createLogEntry(
    level: LogEntry['level'],
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    return {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      stack: error?.stack,
    };
  }

  private shouldLog(level: LogEntry['level']): boolean {
    if (this.isDevelopment) return true;
    if (level === 'debug') return this.debugEnabled;
    return true;
  }

  private log(entry: LogEntry) {
    if (!this.shouldLog(entry.level)) return;

    const logData = {
      ...entry,
      app: 'fumble-pwa',
      version: process.env.npm_package_version || '0.1.0',
    };

    // Console logging for development
    if (this.isDevelopment) {
      const consoleMethod = entry.level === 'error' ? 'error' 
        : entry.level === 'warn' ? 'warn' 
        : 'log';
      
      console[consoleMethod](`[${entry.level.toUpperCase()}] ${entry.message}`, {
        context: entry.context,
        timestamp: entry.timestamp,
        stack: entry.stack,
      });
    }

    // In production, you might want to send to an external service
    // Example: send to Sentry, LogRocket, or custom endpoint
    if (!this.isDevelopment && entry.level === 'error') {
      // this.sendToExternalService(logData);
    }
  }

  info(message: string, context?: LogContext) {
    this.log(this.createLogEntry('info', message, context));
  }

  warn(message: string, context?: LogContext) {
    this.log(this.createLogEntry('warn', message, context));
  }

  error(message: string, context?: LogContext, error?: Error) {
    this.log(this.createLogEntry('error', message, context, error));
  }

  debug(message: string, context?: LogContext) {
    this.log(this.createLogEntry('debug', message, context));
  }

  // Convenience methods for common operations
  orderCreated(orderId: string, tokenSymbol: string, chainId: number) {
    this.info('Order created', {
      orderId,
      tokenSymbol,
      chainId,
      operation: 'order_creation',
    });
  }

  orderStatusChanged(orderId: string, oldStatus: string, newStatus: string) {
    this.info('Order status changed', {
      orderId,
      oldStatus,
      newStatus,
      operation: 'order_status_change',
    });
  }

  orderExecutionFailed(orderId: string, error: Error, retryCount?: number) {
    this.error('Order execution failed', {
      orderId,
      retryCount,
      operation: 'order_execution',
      errorMessage: error.message,
    }, error);
  }

  walletConnectionError(error: Error, chainId?: number) {
    this.error('Wallet connection failed', {
      chainId,
      operation: 'wallet_connection',
      errorMessage: error.message,
    }, error);
  }

  liquidityCheckFailed(tokenAddress: string, chainId: number, error: Error) {
    this.warn('Liquidity check failed', {
      tokenAddress,
      chainId,
      operation: 'liquidity_check',
      errorMessage: error.message,
    });
  }

  sessionInitialized(chainId: number, accountAddress: string) {
    this.info('Session initialized', {
      chainId,
      accountAddress,
      operation: 'session_initialization',
    });
  }

  tokenScanCompleted(tokenCount: number, totalValue: number, chainIds: number[]) {
    this.info('Token scan completed', {
      tokenCount,
      totalValue,
      chainIds,
      operation: 'token_scan',
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience methods for common use cases
export const logError = (message: string, error: Error, context?: LogContext) => {
  logger.error(message, context, error);
};

export const logInfo = (message: string, context?: LogContext) => {
  logger.info(message, context);
};

export const logWarn = (message: string, context?: LogContext) => {
  logger.warn(message, context);
};

export const logDebug = (message: string, context?: LogContext) => {
  logger.debug(message, context);
};