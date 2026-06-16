import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../dto/api-response.dto';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === 'object' && 'code' in data && 'message' in data && 'data' in data) {
          return data;
        }
        if (data && data.meta) {
          return {
            code: 0,
            message: 'success',
            data: data.data,
            meta: data.meta,
          };
        }
        return {
          code: 0,
          message: 'success',
          data,
        };
      }),
    );
  }
}