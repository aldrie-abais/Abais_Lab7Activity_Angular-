import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // 1. Manually bypass the service and check local storage directly
        const userString = localStorage.getItem('user');
        let token = null;

        if (userString) {
            try {
                const user = JSON.parse(userString);
                token = user.jwtToken;
            } catch (e) {}
        }

        const isApiUrl = request.url.startsWith(environment.apiUrl);

        // 2. Explicitly attach the Bearer header if we have the token
        if (token && isApiUrl) {
            request = request.clone({
                setHeaders: { Authorization: `Bearer ${token}` }
            });
        }

        return next.handle(request);
    }
}
