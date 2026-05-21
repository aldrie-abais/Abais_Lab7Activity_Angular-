import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { first } from 'rxjs/operators';

import { AccountService, AlertService } from '@app/_services';
import { MustMatch } from '@app/_helpers';

@Component({ templateUrl: 'add-edit.component.html', standalone: false })
export class AddEditComponent implements OnInit {
    id?: string;
    title = '';
    form!: FormGroup;
    loading = false;
    submitting = false;
    submitted = false;

    constructor(
        private formBuilder: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private accountService: AccountService,
        private alertService: AlertService
    ) { }

    ngOnInit() {
        this.id = this.route.snapshot.params['id'];
        this.title = this.id ? 'Edit Account' : 'Add Account';

        if (this.id) {
            this.loading = true;

            this.accountService.getById(this.id)
                .pipe(first())
                .subscribe({
                    next: account => {
                        this.form = this.formBuilder.group({
                            title: [account.title, Validators.required],
                            firstName: [account.firstName, Validators.required],
                            lastName: [account.lastName, Validators.required],
                            email: [account.email, [Validators.required, Validators.email]],
                            role: [account.role, Validators.required],
                            password: ['', [Validators.minLength(6)]],
                            confirmPassword: ['']
                        }, {
                            validators: MustMatch('password', 'confirmPassword')
                        });
                        this.loading = false;
                    },
                    error: error => {
                        this.alertService.error(error);
                        this.loading = false;
                    }
                });
        } else {
            this.form = this.formBuilder.group({
                title: ['', Validators.required],
                firstName: ['', Validators.required],
                lastName: ['', Validators.required],
                email: ['', [Validators.required, Validators.email]],
                role: ['', Validators.required],
                password: ['', [Validators.minLength(6)]],
                confirmPassword: ['']
            }, {
                validators: MustMatch('password', 'confirmPassword')
            });
        }
    }

    // convenience getter for easy access to form fields
    get f() { return this.form.controls; }

    onSubmit() {
        this.submitted = true;

        // reset alerts on submit
        this.alertService.clear();

        // stop here if form is invalid
        if (this.form.invalid) {
            return;
        }

        this.submitting = true;

        const request = this.id
            ? this.accountService.update(this.id, this.form.value)
            : this.accountService.create(this.form.value);

        request
            .pipe(first())
            .subscribe({
                next: () => {
                    this.alertService.success(this.id ? 'Update successful' : 'Creation successful', { keepAfterRouteChange: true });
                    this.router.navigate(['/admin/accounts']);
                },
                error: error => {
                    this.alertService.error(error);
                    this.submitting = false;
                }
            });
    }
}