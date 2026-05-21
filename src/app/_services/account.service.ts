import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '@environments/environment';
import { Account } from '@app/_models';

const baseUrl = `${environment.apiUrl}/accounts`;

@Injectable({ providedIn: 'root' })
export class AccountService {
    private accountSubject: BehaviorSubject<Account | null>;
    public account: Observable<Account | null>;

    constructor(
        private router: Router,
        private http: HttpClient
    ) {
        const storedAccount = localStorage.getItem('user');
        this.accountSubject = new BehaviorSubject<Account | null>(storedAccount ? JSON.parse(storedAccount) : null);
        this.account = this.accountSubject.asObservable();
    }

    public get accountValue() {
        return this.accountSubject.value;
    }

    login(email: string, password: string) {
        return this.http.post<any>(`${baseUrl}/authenticate`, { email, password }, { withCredentials: true })
            .pipe(map(account => {
                this.accountSubject.next(account);
                localStorage.setItem('user', JSON.stringify(account));
                this.startRefreshTokenTimer();
                return account;
            }));
    }

    logout() {
        this.http.post(`${baseUrl}/revoke-token`, {}, { withCredentials: true }).subscribe();
        this.stopRefreshTokenTimer();
        this.accountSubject.next(null);
        localStorage.removeItem('user');
        this.router.navigate(['/account/login']);
    }

    refreshToken() {
        return this.http.post<any>(`${baseUrl}/refresh-token`, {}, { withCredentials: true })
            .pipe(map(account => {
                this.accountSubject.next(account);
                localStorage.setItem('user', JSON.stringify(account));
                this.startRefreshTokenTimer();
                return account;
            }));
    }

    register(params: any) {
        return this.http.post(`${baseUrl}/register`, params, { withCredentials: true });
    }

    verifyEmail(token: string) {
        return this.http.post(`${baseUrl}/verify-email`, { token }, { withCredentials: true });
    }

    forgotPassword(email: string) {
        return this.http.post(`${baseUrl}/forgot-password`, { email }, { withCredentials: true });
    }

    validateResetToken(token: string) {
        return this.http.post(`${baseUrl}/validate-reset-token`, { token }, { withCredentials: true });
    }

    resetPassword(token: string, password: string) {
        return this.http.post(`${baseUrl}/reset-password`, { token, password }, { withCredentials: true });
    }

    getAll() {
        return this.http.get<Account[]>(baseUrl, { withCredentials: true });
    }

    getById(id: string) {
        return this.http.get<Account>(`${baseUrl}/${id}`, { withCredentials: true });
    }

    create(params: any) {
        return this.http.post(baseUrl, params, { withCredentials: true });
    }

    update(id: string, params: any) {
        return this.http.put(`${baseUrl}/${id}`, params, { withCredentials: true })
            .pipe(map((x: any) => {
                // update stored account if the logged in account updated their own record
                if (id === this.accountValue?.id) {
                    // publish updated account to subscribers
                    const account = { ...this.accountValue, ...params };
                    this.accountSubject.next(account);
                    localStorage.setItem('user', JSON.stringify(account));
                }
                return x;
            }));
    }

    delete(id: string) {
        return this.http.delete(`${baseUrl}/${id}`, { withCredentials: true })
            .pipe(map(x => {
                // auto logout if the logged in account was deleted
                if (id === this.accountValue?.id) {
                    this.logout();
                }
                return x;
            }));
    }

    // helper methods

    private refreshTokenTimeout?: any;

    private startRefreshTokenTimer() {
        // parse json object from base64 encoded jwt token
        const jwtToken = JSON.parse(atob(this.accountValue!.jwtToken!.split('.')[1]));

        // set a timeout to refresh the token a minute before it expires
        const expires = new Date(jwtToken.exp * 1000);
        const timeout = expires.getTime() - Date.now() - (60 * 1000);
        this.refreshTokenTimeout = setTimeout(() => this.refreshToken().subscribe(), timeout);
    }

    private stopRefreshTokenTimer() {
        clearTimeout(this.refreshTokenTimeout);
    }
}