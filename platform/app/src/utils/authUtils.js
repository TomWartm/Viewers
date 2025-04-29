const domain = '@indaigomed.com';

export const toEmail = (username) => `${username}${domain}`;

export const toUsername = (email) => email.replace(domain, '');
